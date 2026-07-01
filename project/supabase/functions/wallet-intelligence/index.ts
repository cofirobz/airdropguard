import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HIGH_RISK_TERMS = [
  "phishing",
  "scam",
  "rug",
  "drainer",
  "fraud",
  "malicious",
  "blacklist",
  "hack",
  "exploit",
];

const APPROVAL_TERMS = ["approval", "approve", "permissions", "signature"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const address = String(body.address || "").trim();
    const chainId = String(body.chainId || "1");

    if (!address) {
      return json({ error: "Wallet address is required." }, 400);
    }

    const goPlusKey = Deno.env.get("Go_Plus_Key");

    if (!goPlusKey) {
      return json({ error: "Missing Go_Plus_Key in Supabase secrets." }, 500);
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${goPlusKey}`,
      "X-API-Key": goPlusKey,
    };

    const chainMeta = normalizeChainId(chainId);
    const shouldUseGoPlus = chainMeta.family === "evm";

    const addressSecurity = shouldUseGoPlus
      ? await safeFetch(
          `https://api.gopluslabs.io/api/v1/address_security/${address}`,
          headers
        )
      : {
          ok: false,
          error: "Solana address security checks are currently unavailable from the GoPlus provider.",
        };

    const approvalSecurity = shouldUseGoPlus
      ? await safeFetch(
          `https://api.gopluslabs.io/api/v2/token_approval_security/${chainId}?addresses=${address}`,
          headers
        )
      : {
          ok: false,
          error: "Solana approval checks are currently unavailable from the GoPlus provider.",
        };

    const result = buildWalletResult({
      address,
      chainId,
      addressSecurity,
      approvalSecurity,
      providerReady: shouldUseGoPlus,
    });

    return json({ success: true, result });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Wallet scan failed.",
      },
      500
    );
  }
});

async function safeFetch(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(12000),
    });

    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: text,
      };
    }

    return JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function buildWalletResult({
  address,
  chainId,
  addressSecurity,
  approvalSecurity,
  providerReady,
}: {
  address: string;
  chainId: string;
  addressSecurity: unknown;
  approvalSecurity: unknown;
  providerReady: boolean;
}) {
  const chainMeta = normalizeChainId(chainId);
  const addressPayload = getValue(addressSecurity, ["result", "data"]) ?? addressSecurity ?? {};
  const approvalPayload = getValue(approvalSecurity, ["result", "data"]) ?? approvalSecurity ?? {};
  const combinedText = `${JSON.stringify(addressPayload)} ${JSON.stringify(approvalPayload)}`.toLowerCase();
  const txCount = readNumericValue(addressPayload, ["tx_count", "txCount", "transaction_count", "transactionCount", "count", "totalTx", "total_transactions"]) ?? 0;
  const nativeBalance = readNumericValue(addressPayload, ["native_balance", "balance", "nativeBalance", "amount", "value"]) ?? 0;
  const nativeUsdValue = readNumericValue(addressPayload, ["native_usd_value", "nativeUsdValue", "usd_value", "usdValue"]) ?? null;
  const hasApprovalData = APPROVAL_TERMS.some((term) => combinedText.includes(term));
  const hasUnlimitedApproval = combinedText.includes("unlimited");
  const hasHighRiskTerm = HIGH_RISK_TERMS.some((term) => combinedText.includes(term));
  const hasSpamLikeSignals = /spam|fake|airdrop|reward|shill|testnet|faucet/.test(combinedText);

  const findings = [] as Array<{
    severity: "Low" | "Medium" | "High";
    title: string;
    detail: string;
    action: string;
    source: string;
  }>;

  if (hasHighRiskTerm) {
    findings.push({
      severity: "High",
      title: "Suspicious wallet behaviour surfaced in provider data",
      detail: "The available scan data contains strong risk language that suggests this wallet should be reviewed before interacting with new airdrop campaigns.",
      action: "Avoid new approvals, claim links and unknown contract interactions until the signal is verified.",
      source: "GoPlus security response",
    });
  } else if (hasUnlimitedApproval) {
    findings.push({
      severity: "High",
      title: "Unlimited approval exposure detected",
      detail: "The scan returned approval data that suggests broad spending permissions may be active.",
      action: "Review the relevant approval permissions and revoke anything that is not needed.",
      source: "GoPlus approval scan",
    });
  } else if (hasApprovalData && (combinedText.includes("risk") || combinedText.includes("danger") || combinedText.includes("exposed"))) {
    findings.push({
      severity: "Medium",
      title: "Approval activity needs human review",
      detail: "The scan returned approval-related context that is worth reviewing, even though it did not show an explicit unlimited approval signal.",
      action: "Audit any connected permissions and keep interactions limited to trusted protocols.",
      source: "GoPlus approval scan",
    });
  } else if (hasSpamLikeSignals && !hasHighRiskTerm) {
    findings.push({
      severity: "Low",
      title: "Possible wallet-noise pattern",
      detail: "The scan surfaced language often associated with low-signal or promotional assets. This is treated as a weak signal unless stronger evidence appears.",
      action: "Treat this as noise unless the wallet shows repeated suspicious activity across more than one source.",
      source: "Behavioural heuristics",
    });
  }

  const riskExposureScore = clamp(
    12 + findings.filter((finding) => finding.severity === "High").length * 28 + findings.filter((finding) => finding.severity === "Medium").length * 16 + findings.filter((finding) => finding.severity === "Low").length * 8 + (txCount > 0 ? 0 : 6) + (nativeBalance > 0 ? 0 : 4),
    8,
    95
  );

  const walletHealthScore = clamp(
    100 - riskExposureScore * 0.45 + (txCount >= 10 ? 8 : 0) + (nativeBalance > 0 ? 6 : 0) - (txCount === 0 ? 8 : 0),
    8,
    96
  );
  const activityQualityScore = clamp(
    txCount >= 100 ? 90 : txCount >= 50 ? 80 : txCount >= 20 ? 70 : txCount >= 10 ? 58 : txCount >= 4 ? 42 : 24,
    8,
    98
  );
  const airdropReadinessScore = clamp(
    24 + (txCount >= 20 ? 24 : txCount >= 10 ? 16 : txCount >= 4 ? 10 : 0) + (nativeBalance > 0 ? 10 : 0) + (riskExposureScore < 35 ? 12 : 0) - (riskExposureScore > 60 ? 14 : 0) - (txCount === 0 ? 10 : 0),
    6,
    95
  );
  const tokenHygieneScore = clamp(88 - findings.length * 6 - (hasSpamLikeSignals ? 4 : 0), 20, 95);
  const multiChainScore = clamp(35 + (chainMeta.family === "solana" ? 8 : 0) + (nativeBalance > 0 ? 4 : 0), 20, 80);
  const walletIq = clamp(
    Math.round(
      walletHealthScore * 0.32 +
        airdropReadinessScore * 0.28 +
        activityQualityScore * 0.16 +
        tokenHygieneScore * 0.14 +
        (100 - riskExposureScore) * 0.10
    ),
    1,
    99
  );
  const walletGrade = walletIq >= 85 ? "A" : walletIq >= 70 ? "B" : walletIq >= 50 ? "C" : "D";
  const walletPersona = airdropReadinessScore >= 75 && activityQualityScore >= 70
    ? "Active Builder"
    : airdropReadinessScore >= 60
      ? "Steady Researcher"
      : riskExposureScore >= 60
        ? "High Attention"
        : "Early Stage";
  const confidence = clamp(
    55 + (addressPayload ? 12 : 0) + (approvalPayload ? 8 : 0) + (findings.length === 0 ? 8 : 0) + (txCount > 0 ? 8 : 0) - (findings.some((finding) => finding.severity === "High") ? 10 : 0),
    40,
    95
  );
  const summary = buildSummaryText({
    txCount,
    nativeBalance,
    riskExposureScore,
    findings,
    chainMeta,
  });
  const indicators = [
    {
      label: "Activity signal",
      pass: txCount > 0,
      detail: txCount > 0 ? `Observed ${txCount.toLocaleString()} visible transaction${txCount === 1 ? "" : "s"}.` : "No transaction count was returned from the provider.",
    },
    {
      label: "Approval review",
      pass: !hasUnlimitedApproval && !hasHighRiskTerm,
      detail: hasUnlimitedApproval
        ? "The scan surfaced approval exposure that should be reviewed."
        : hasHighRiskTerm
          ? "The scan surfaced a stronger risk signal and should be reviewed carefully."
          : "No obvious unlimited approval signal was surfaced.",
    },
    {
      label: "Signal quality",
      pass: confidence >= 70,
      detail: confidence >= 70
        ? "The evidence quality is strong enough to support a confident recommendation."
        : "The scan is useful but should be treated as a directional signal rather than a definitive verdict.",
    },
  ];
  const recommendations = buildRecommendations({
    findings,
    riskExposureScore,
    airdropReadinessScore,
    txCount,
  });

  return {
    address,
    chain: chainMeta.chain,
    chainId,
    nativeBalance,
    nativeUsdValue,
    txCount,
    tokens: [],
    totalUsdValue: nativeUsdValue ?? 0,
    chainBalances: [
      {
        chainId: chainMeta.chain === "solana" ? "solana" : chainId,
        name: chainMeta.name,
        symbol: chainMeta.short,
        balance: nativeBalance,
        usdValue: nativeUsdValue,
        error: false,
      },
    ],
    activityLevel: mapActivityLevel(txCount),
    walletHealthScore,
    airdropReadinessScore,
    riskExposureScore,
    activityQualityScore,
    multiChainScore,
    tokenHygieneScore,
    walletGrade,
    walletIq,
    walletPersona,
    confidence,
    summary,
    findings,
    indicators,
    recommendations,
    goplus: {
      enabled: providerReady,
      checkedApis: providerReady ? ["address_security", "token_approval_security"] : [],
      unavailableApis: providerReady ? [] : ["address_security", "token_approval_security"],
      maliciousAddress: hasHighRiskTerm ? { detected: true, source: "goplus" } : null,
      approvalSecurity: approvalPayload,
      tokenSecurityChecked: providerReady ? 1 : 0,
    },
    reasoning: {
      behaviouralQuality: airdropReadinessScore >= 75 ? "Strong" : airdropReadinessScore >= 55 ? "Moderate" : "Early",
      decisionConfidence: confidence,
      evidence: findings.length > 0 ? findings.map((finding) => finding.title) : ["No major provider-level warnings were returned."],
      uncertainty: txCount === 0 ? "Historical activity was sparse, so the assessment is based on a thinner evidence base." : "The assessment is based on public provider data and may miss private off-chain behaviour.",
      recommendedAction: findings.some((finding) => finding.severity === "High")
        ? "Reduce exposure before interacting with permissions, claims or new protocols."
        : airdropReadinessScore < 60
          ? "Build a small base of genuine activity before using the wallet as a serious airdrop profile."
          : "Keep the wallet behaviour clean and re-scan after meaningful activity changes.",
      falsePositiveRisk: hasSpamLikeSignals && !hasHighRiskTerm ? "Low" : "Moderate",
    },
  };
}

function buildSummaryText({
  txCount,
  nativeBalance,
  riskExposureScore,
  findings,
  chainMeta,
}: {
  txCount: number;
  nativeBalance: number;
  riskExposureScore: number;
  findings: Array<{ severity: "Low" | "Medium" | "High"; title: string; detail: string }>;
  chainMeta: { name: string; chain: string };
}) {
  if (findings.length === 0) {
    return `No major visible risk findings were returned for this ${chainMeta.name} wallet. The scan shows ${txCount > 0 ? `${txCount.toLocaleString()} visible transaction${txCount === 1 ? "" : "s"}` : "limited transaction history"} and a ${nativeBalance > 0 ? "funded" : "lightly funded"} profile.`;
  }

  const highestFinding = findings.sort((a, b) => {
    const rank = { High: 3, Medium: 2, Low: 1 } as const;
    return rank[b.severity] - rank[a.severity];
  })[0];

  return `${highestFinding.title}. The wallet currently carries a ${riskExposureScore >= 70 ? "high" : riskExposureScore >= 40 ? "moderate" : "manageable"} visible risk profile, so interactions should stay conservative until the signal is verified.`;
}

function buildRecommendations({
  findings,
  riskExposureScore,
  airdropReadinessScore,
  txCount,
}: {
  findings: Array<{ severity: "Low" | "Medium" | "High"; title: string; detail: string; action: string }>;
  riskExposureScore: number;
  airdropReadinessScore: number;
  txCount: number;
}) {
  if (findings.some((finding) => finding.severity === "High")) {
    return [
      "Reduce exposure before engaging with new claim links, approvals or airdrop utilities.",
      "Review each visible finding and avoid interacting with unknown contracts until the signal is cleared.",
      "Re-scan after a few low-risk, real-world transactions to see whether the profile stays stable.",
    ];
  }

  if (riskExposureScore >= 40) {
    return [
      "Keep wallet interactions narrow and avoid unverified token approvals.",
      "Re-check the wallet after a few safe on-chain actions to build a more reliable profile.",
      "Use the report as a guardrail rather than as a guarantee of safety.",
    ];
  }

  if (airdropReadinessScore < 60 || txCount < 5) {
    return [
      "Build genuine activity over time instead of chasing fast, repetitive transactions.",
      "Focus on trusted protocols and small, low-risk interactions that support a consistent history.",
      "Re-scan after a few useful actions to improve the readiness signal.",
    ];
  }

  return [
    "Keep the wallet clean by avoiding unknown approvals and random claim links.",
    "Re-scan weekly so the profile stays aligned with real wallet behaviour.",
    "Use the report as part of your broader research process rather than as the only decision signal.",
  ];
}

function normalizeChainId(chainId: string) {
  if (chainId === "solana") {
    return { chain: "solana" as const, name: "Solana", short: "SOL", family: "solana" as const };
  }

  switch (chainId) {
    case "56":
      return { chain: "ethereum" as const, name: "BNB Chain", short: "BNB", family: "evm" as const };
    case "8453":
      return { chain: "ethereum" as const, name: "Base", short: "ETH", family: "evm" as const };
    case "42161":
      return { chain: "ethereum" as const, name: "Arbitrum", short: "ETH", family: "evm" as const };
    case "10":
      return { chain: "ethereum" as const, name: "Optimism", short: "ETH", family: "evm" as const };
    case "137":
      return { chain: "ethereum" as const, name: "Polygon", short: "POL", family: "evm" as const };
    default:
      return { chain: "ethereum" as const, name: "Ethereum", short: "ETH", family: "evm" as const };
  }
}

function readNumericValue(source: unknown, paths: string[]) {
  const value = getValue(source, paths);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getValue(source: unknown, paths: string[]) {
  let current: unknown = source;

  for (const path of paths) {
    if (current && typeof current === "object" && path in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[path];
      continue;
    }

    return undefined;
  }

  return current;
}

function mapActivityLevel(txCount: number): "Inactive" | "Low" | "Moderate" | "Active" | "Highly Active" {
  if (txCount >= 100) return "Highly Active";
  if (txCount >= 40) return "Active";
  if (txCount >= 12) return "Moderate";
  if (txCount >= 3) return "Low";
  return "Inactive";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}