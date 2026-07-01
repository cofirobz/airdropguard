import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RSS_URL = "https://airdropalert.com/feed/rssfeed";
const UA = "Mozilla/5.0 (compatible; AirdropGuard/1.0)";

export interface ScrapedAirdrop {
  id: string;
  name: string;
  source_url: string;
  slug: string;
  description: string;
  logo_url: string;
  chain: string;
  end_date: string | null;
  reward: string;
  pub_date: string | null;
  website_url: string;
  twitter_url: string;
  discord_url: string;
  telegram_url: string;
  ticker: string;
  tasks: string[];
  source: string;
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function extractSlug(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch { return ""; }
}

function extractField(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, "i").exec(block);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return plain ? plain[1].trim() : "";
}

function extractLink(block: string): string {
  const m = /<link>(https?:\/\/[^<\s]+)<\/link>/i.exec(block)
    ?? /<link\s+href="(https?:\/\/[^"]+)"/i.exec(block)
    ?? /<guid[^>]*>(https?:\/\/[^<\s]+)<\/guid>/i.exec(block);
  return m ? m[1].trim() : "";
}

// ─── Article page enrichment ───────────────────────────────────────────────────

const SKIP_DOMAINS = [
  "airdropalert.com", "airdrops.io", "twitter.com", "x.com", "discord.gg", "discord.com",
  "t.me", "telegram.org", "facebook.com", "reddit.com", "youtube.com",
  "medium.com", "coinmarketcap.com", "coingecko.com", "etherscan.io",
  "bscscan.com", "solscan.io", "polygonscan.com", "arbiscan.io",
  "cloudfront.net", "cloudinary.com", "imgix.net", "fastly.net",
  "amazonaws.com", "googleapis.com", "gstatic.com", "bootstrapcdn.com",
  "jsdelivr.net", "unpkg.com", "fonts.gstatic.com",
  "google-analytics.com", "googletagmanager.com", "doubleclick.net",
  "googlesyndication.com", "googleadservices.com", "facebook.net",
  "hotjar.com", "segment.io", "mixpanel.com", "amplitude.com",
  "addthis.com", "addtoany.com", "sharethis.com",
];

function isShareOrTracking(url: string): boolean {
  if (!url.startsWith("http")) return true;
  try {
    const u = new URL(url);
    const q = u.search;
    if (q.includes("url=") || q.includes("text=") || q.includes("via=")) return true;
    if (q.includes("utm_") || q.includes("fbclid") || q.includes("gclid")) return true;
    if (u.pathname.includes("/intent/") || u.pathname.includes("/sharer") || u.pathname.includes("/share/")) return true;
  } catch { return true; }
  return false;
}

function extractAnchors(html: string): { href: string; text: string; cls: string }[] {
  const result: { href: string; text: string; cls: string }[] = [];
  for (const m of html.matchAll(/<a\s([^>]{0,500})>([\s\S]{0,300}?)<\/a>/gi)) {
    const hrefM = /href="([^"]{1,600})"/i.exec(m[1]);
    if (!hrefM) continue;
    const href = hrefM[1].trim();
    if (!href.startsWith("http")) continue;
    const cls = (/class="([^"]+)"/i.exec(m[1]) ?? [])[1] ?? "";
    result.push({ href, text: stripHtml(m[2]).trim(), cls });
  }
  return result;
}

function extractListItems(html: string): string[] {
  const items: string[] = [];
  for (const m of html.matchAll(/<li[^>]*>([\s\S]{0,500}?)<\/li>/gi)) {
    const text = stripHtml(m[1]).trim();
    if (text.length >= 10 && text.length <= 250) items.push(text);
  }
  return items;
}

function extractStructuredDate(html: string): string | null {
  const labelRe = /(?:end(?:s|ing)?|deadline|expires?|until|close[sd]?|campaign\s+end)/i;
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]{0,120}?)<\/dt>\s*<dd[^>]*>([\s\S]{0,200}?)<\/dd>/gi)) {
    if (!labelRe.test(stripHtml(m[1]))) continue;
    const d = new Date(stripHtml(m[2]).trim());
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d.toISOString().split("T")[0];
  }
  for (const m of html.matchAll(/<tr[^>]*>[\s\S]{0,100}?<td[^>]*>([\s\S]{0,120}?)<\/td>\s*<td[^>]*>([\s\S]{0,200}?)<\/td>/gi)) {
    if (!labelRe.test(stripHtml(m[1]))) continue;
    const d = new Date(stripHtml(m[2]).trim());
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d.toISOString().split("T")[0];
  }
  return null;
}

const CHAIN_MAP: [RegExp, string][] = [
  [/\bEthereum\b/i, "Ethereum"], [/\bSolana\b/i, "Solana"],
  [/\bArbitrum\b/i, "Arbitrum"], [/\bOptimism\b/i, "Optimism"],
  [/\bPolygon\b/i, "Polygon"],   [/\bBase\b/i, "Base"],
  [/\bBNB\b|\bBSC\b/i, "BNB Chain"], [/\bAvalanche\b/i, "Avalanche"],
  [/\bzkSync\b/i, "zkSync"],    [/\bStarknet\b/i, "Starknet"],
  [/\bCosmos\b/i, "Cosmos"],    [/\bSui\b/i, "Sui"],
  [/\bAptos\b/i, "Aptos"],
];

function extractFromPage(html: string, pubDate?: string): Partial<ScrapedAirdrop> {
  const bodyStart = Math.max(0, html.indexOf("<body"));
  const sliced = html.slice(bodyStart, bodyStart + 120_000);
  const shareClsRe = /\b(?:share|social-share|btn-share|addthis|addtoany|sharethis)\b/i;

  const anchors = extractAnchors(sliced);

  const usable = anchors.filter(a =>
    !SKIP_DOMAINS.some(d => a.href.includes(d)) &&
    !isShareOrTracking(a.href) &&
    !shareClsRe.test(a.cls)
  );

  const twitterLinks = anchors.filter(a =>
    /(?:twitter|x)\.com\/(?!(?:intent|share|home|search|hashtag|status|i\/))[a-zA-Z0-9_]{1,50}\/?$/.test(a.href) &&
    !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
  );

  const discordLinks = anchors.filter(a =>
    /discord(?:\.gg|\.com\/invite)\/[a-zA-Z0-9\-]+/.test(a.href) &&
    !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
  );

  const telegramLinks = anchors.filter(a =>
    /t\.me\/[a-zA-Z0-9_\-]+/.test(a.href) &&
    !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
  );

  const siteKeyRe = /\b(?:website|official|visit|homepage)\b/i;
  const website_url =
    (usable.find(a => siteKeyRe.test(a.text)) ??
     usable.find(a => siteKeyRe.test(a.cls)) ??
     usable[0])?.href ?? "";

  const listItems = extractListItems(sliced);
  const taskKeyRe = /\b(?:follow|join|like|retweet|share|visit|sign.?up|register|hold|stake|refer|complete|submit|connect|wallet|discord|twitter|telegram)\b/i;
  const tasks = listItems.filter(t => taskKeyRe.test(t)).slice(0, 6);

  let end_date: string | null = extractStructuredDate(sliced);

  const logoMatch = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html)
    ?? /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i.exec(html);
  const logo_url = logoMatch?.[1] ?? "";

  const text = stripHtml(html).slice(0, 12_000);
  const chain = CHAIN_MAP.find(([re]) => re.test(text))?.[1] ?? "";

  const tickerRe = /\$([A-Z]{2,8})\b|\btoken[:\s]+([A-Z]{2,8})\b/g;
  const noisy = new Set(["USD", "ETH", "BNB", "SOL", "USDT", "USDC", "NFT", "DAO", "API"]);
  const tickers = [...text.matchAll(tickerRe)]
    .map(m => (m[1] || m[2]).toUpperCase())
    .filter(t => !noisy.has(t));
  const ticker = tickers[0] ?? "";

  if (!end_date) {
    const label = "(?:end(?:s|ing)?|end\\s+date|deadline|expires?|expiry|until|close[sd]?|campaign\\s+end[sd]?|registration\\s+close[sd]?|snapshot\\s+date|distribution\\s+date)";
    for (const re of [
      new RegExp(`${label}\\s*[:\\-]?\\s*(\\w+ \\d{1,2},? \\d{4})`, "i"),
      new RegExp(`${label}\\s*[:\\-]?\\s*(\\d{1,2} \\w+ \\d{4})`, "i"),
      new RegExp(`${label}\\s*[:\\-]?\\s*(\\d{4}-\\d{2}-\\d{2})`, "i"),
    ]) {
      const m = re.exec(text);
      if (m) {
        const d = new Date(m[1]);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) { end_date = d.toISOString().split("T")[0]; break; }
      }
    }
  }

  if (!end_date && pubDate) {
    const relRe = /(?:lasts?|runs?|duration|open(?:s|ed)?|available|active)\s+(?:for\s+)?(\d+)\s*(day|week|month)s?\b|(\d+)\s*(day|week|month)s?\s+(?:campaign|airdrop|event|remaining|left)/i;
    const m = relRe.exec(text);
    if (m) {
      const qty = parseInt(m[1] ?? m[3], 10);
      const unit = (m[2] ?? m[4]).toLowerCase();
      const base = new Date(pubDate);
      if (!isNaN(base.getTime())) {
        if (unit === "day")   base.setDate(base.getDate() + qty);
        if (unit === "week")  base.setDate(base.getDate() + qty * 7);
        if (unit === "month") base.setMonth(base.getMonth() + qty);
        if (base.getFullYear() >= 2024) end_date = base.toISOString().split("T")[0];
      }
    }
  }

  const rewardPatterns: RegExp[] = [
    /(?:reward|earn|prize|win)\s*[:\-]?\s*(\$[\d,.]+ ?(?:to|[-–]) ?\$[\d,.]+)/i,
    /(?:reward|earn|prize)\s*[:\-]?\s*(\$[\d,.]+[kK]?)/i,
    /(?:reward|earn|prize)\s*[:\-]?\s*([\d,.]+ [A-Z]{2,8} tokens?)/i,
    /(?:up to|worth)\s+([\d,.]+ [A-Z]{2,8}|\$[\d,.]+ ?(?:to|[-–]) ?\$[\d,.]+)/i,
  ];
  let reward = "";
  for (const re of rewardPatterns) {
    const m = re.exec(text);
    if (m) { reward = m[1].trim(); break; }
  }

  return {
    website_url,
    twitter_url: twitterLinks[0]?.href ?? "",
    discord_url: discordLinks[0]?.href ?? "",
    telegram_url: telegramLinks[0]?.href ?? "",
    logo_url,
    chain,
    end_date,
    reward,
    ticker,
    tasks: tasks.length > 0 ? tasks : listItems.slice(0, 6),
  };
}

async function enrichFromArticlePage(url: string, pubDate?: string): Promise<Partial<ScrapedAirdrop>> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(7_000),
    });
    if (!res.ok) return {};
    const raw = await res.text();
    return extractFromPage(raw, pubDate);
  } catch {
    return {};
  }
}

// ─── Deduplication helpers ─────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+airdrop\s*/gi, "").replace(/[^a-z0-9]/g, "");
}

function deduplicateBatch(items: ScrapedAirdrop[]): { items: ScrapedAirdrop[]; dupCount: number } {
  const seenNames = new Set<string>();
  const seenWebsites = new Set<string>();
  const seenTwitters = new Set<string>();
  const kept: ScrapedAirdrop[] = [];
  let dupCount = 0;

  for (const item of items) {
    const norm = normalizeName(item.name);
    if (!norm) { dupCount++; continue; }
    const web = item.website_url ? item.website_url.toLowerCase().replace(/\/$/, "") : "";
    const tw  = item.twitter_url ? item.twitter_url.toLowerCase().replace(/\/$/, "") : "";

    if (seenNames.has(norm) || (web && seenWebsites.has(web)) || (tw && seenTwitters.has(tw))) {
      dupCount++;
      continue;
    }
    seenNames.add(norm);
    if (web) seenWebsites.add(web);
    if (tw)  seenTwitters.add(tw);
    kept.push(item);
  }

  return { items: kept, dupCount };
}

// ─── Source adapters ───────────────────────────────────────────────────────────

interface AirdropAlertResult {
  items: ScrapedAirdrop[];
  fetched: number;
  error?: string;
  enrichStats: {
    articles_fetched: number;
    websites_found: number;
    socials_found: number;
    deadlines_found: number;
    tasks_found: number;
  };
  extra?: {
    galxe_avg_score?: number;
    galxe_top_rejections?: Record<string, number>;
  };
}

async function fetchRSSSource(rssUrl: string, source: string, limit: number): Promise<AirdropAlertResult> {
  const empty: AirdropAlertResult = {
    items: [],
    fetched: 0,
    enrichStats: { articles_fetched: 0, websites_found: 0, socials_found: 0, deadlines_found: 0, tasks_found: 0 },
  };

  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": UA, Accept: "text/xml, application/rss+xml, */*" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return { ...empty, error: `${source} RSS returned HTTP ${res.status}` };

    const xml = await res.text();
    const xmlItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    if (!xmlItems.length) return { ...empty, error: `${source} RSS feed returned no items` };

    const parsed: ScrapedAirdrop[] = xmlItems.slice(0, limit).map((m) => {
      const block = m[1];
      const title   = extractField(block, "title");
      const link    = extractLink(block);
      const desc    = extractField(block, "description");
      const pubDate = extractField(block, "pubDate");
      const slug    = extractSlug(link).replace(/-airdrop$/, "");
      let pub_date: string | null = null;
      if (pubDate) { const d = new Date(pubDate); if (!isNaN(d.getTime())) pub_date = d.toISOString().split("T")[0]; }
      return {
        id: link || slug || title,
        name: stripHtml(title).replace(/\s+airdrop\s*$/i, "").trim(),
        source_url: link,
        slug,
        description: stripHtml(desc).slice(0, 400).trim(),
        logo_url: "", chain: "", end_date: null, reward: "TBA", pub_date,
        website_url: "", twitter_url: "", discord_url: "", telegram_url: "",
        ticker: "", tasks: [], source,
      };
    }).filter(a => a.name && a.source_url);

    const enrichResults = await Promise.allSettled(
      parsed.map(item => enrichFromArticlePage(item.source_url, item.pub_date ?? undefined))
    );

    const items: ScrapedAirdrop[] = parsed.map((item, i) => {
      const extra = enrichResults[i].status === "fulfilled" ? enrichResults[i].value : {};
      return {
        ...item, ...extra,
        description: item.description,
        reward: (extra.reward && extra.reward !== "") ? extra.reward : item.reward,
        chain: (extra.chain && extra.chain !== "") ? extra.chain : item.chain,
        end_date: extra.end_date ?? item.end_date,
        logo_url: (extra.logo_url && extra.logo_url !== "") ? extra.logo_url : item.logo_url,
        source,
      };
    });

    const enrichStats = {
      articles_fetched: enrichResults.filter(r => r.status === "fulfilled" && Object.keys(r.value).length > 0).length,
      websites_found:   items.filter(d => d.website_url).length,
      socials_found:    items.filter(d => d.twitter_url || d.discord_url || d.telegram_url).length,
      deadlines_found:  items.filter(d => d.end_date).length,
      tasks_found:      items.filter(d => d.tasks && d.tasks.length > 0).length,
    };

    return { items, fetched: xmlItems.length, enrichStats };
  } catch (e) {
    return { ...empty, error: `Could not reach ${source} RSS: ${e instanceof Error ? e.message : "network error"}` };
  }
}

async function fetchAirdropAlert(limit: number): Promise<AirdropAlertResult> {
  return fetchRSSSource(RSS_URL, "airdropalert", limit);
}

// ─── Galxe GraphQL adapter ────────────────────────────────────────────────────

const GALXE_URL = "https://graphigo.prd.galaxy.eco/query";

const GALXE_PAGE_QUERY = (after?: string) => `{
  campaigns(input:{first:100,forAdmin:false,statuses:[Active]${after ? `,after:"${after}"` : ""}}) {
    list {
      id name description startTime endTime thumbnail
      space { id name alias twitterUserName links }
    }
    pageInfo { endCursor hasNextPage }
  }
}`;

const GALXE_REJECT_TERMS: [string, RegExp][] = [
  ["podcast",        /podcast/i],
  ["episode",        /episode/i],
  ["AMA",            /\bama\b/i],
  ["webinar",        /webinar/i],
  ["livestream",     /livestream/i],
  ["community call", /community\s+call/i],
  ["moderator",      /moderator/i],
  ["ambassador",     /ambassador/i],
  ["creator program",/creator\s+program/i],
  ["giveaway",       /giveaway/i],
  ["raffle",         /raffle/i],
];

const GALXE_BOOST: [string, RegExp][] = [
  ["token",     /\btoken/i],
  ["rewards",   /\brewards?\b/i],
  ["points",    /\bpoints\b/i],
  ["XP",        /\bxp\b/i],
  ["quest",     /\bquest/i],
  ["campaign",  /\bcampaign/i],
  ["mainnet",   /mainnet/i],
  ["testnet",   /testnet/i],
  ["bridge",    /\bbridge/i],
  ["swap",      /\bswap/i],
  ["staking",   /\bstak/i],
  ["liquidity", /liquidity/i],
  ["referral",  /referral/i],
  ["trading",   /\btrad/i],
  ["ecosystem", /ecosystem/i],
  ["season",    /\bseason\b/i],
];

const GALXE_PENALIZE: [string, RegExp][] = [
  ["NFT claim",    /nft\s+claim/i],
  ["POAP",         /\bpoap\b/i],
  ["badge",        /\bbadge\b/i],
  ["attendance",   /attendance/i],
  ["voting",       /\bvot(?:e|ing)\b/i],
  ["snapshot",     /\bsnapshot\b/i],
  ["commemorative",/commemorative/i],
  ["credential",   /credential/i],
  ["certificate",  /certificate/i],
];

const GALXE_CHAINS: [RegExp, string][] = [
  [/\bethereum\b/i,              "Ethereum"],
  [/\bbase\b/i,                  "Base"],
  [/\barbitrum\b/i,              "Arbitrum"],
  [/\boptimism\b/i,              "Optimism"],
  [/\bsolana\b/i,                "Solana"],
  [/\bsui\b/i,                   "Sui"],
  [/\bavalanche\b|\bavax\b/i,    "Avalanche"],
  [/\bpolygon\b|\bmatic\b/i,     "Polygon"],
  [/\bbnb\b|\bbsc\b/i,           "BNB"],
];

const GALXE_EMPTY_STATS = { articles_fetched: 0, websites_found: 0, socials_found: 0, deadlines_found: 0, tasks_found: 0 };

async function fetchGalxe(limit: number): Promise<AirdropAlertResult> {
  async function fetchPage(after?: string) {
    const resp = await fetch(GALXE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ query: GALXE_PAGE_QUERY(after) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) throw new Error(`Galxe HTTP ${resp.status}`);
    const json = await resp.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data?.campaigns ?? { list: [], pageInfo: {} };
  }

  let page1: { list: unknown[]; pageInfo: { endCursor?: string; hasNextPage?: boolean } };
  try {
    page1 = await fetchPage();
  } catch (e) {
    return { items: [], fetched: 0, enrichStats: GALXE_EMPTY_STATS, error: String(e) };
  }

  // Fetch page 2 concurrently if page 1 has a next page
  const page2Promise = page1.pageInfo?.hasNextPage && page1.pageInfo?.endCursor
    ? fetchPage(page1.pageInfo.endCursor).catch(() => ({ list: [], pageInfo: {} }))
    : Promise.resolve({ list: [], pageInfo: {} });

  const page2 = await page2Promise;

  type RawCampaign = {
    id: string; name: string; description: string;
    startTime: string | null; endTime: string | null; thumbnail: string | null;
    space: { id: string; name: string; alias: string; twitterUserName: string | null; links: Record<string, string> | null };
  };
  const raw = [...(page1.list as RawCampaign[]), ...(page2.list as RawCampaign[])];
  const totalFetched = raw.length;
  const seen = new Set<string>();
  const scored: Array<{ item: ScrapedAirdrop; score: number }> = [];
  const rejectionCounts: Record<string, number> = {};
  let totalScore = 0;

  for (const c of raw) {
    const sp = c.space;
    if (!sp?.name) continue;
    if (seen.has(sp.alias)) continue;
    seen.add(sp.alias);

    const text = `${sp.name} ${c.name} ${c.description ?? ""}`;

    // Named reject filter — track which term fires
    let rejectLabel: string | null = null;
    for (const [label, re] of GALXE_REJECT_TERMS) {
      if (re.test(text)) { rejectLabel = label; break; }
    }
    if (rejectLabel) {
      rejectionCounts[rejectLabel] = (rejectionCounts[rejectLabel] ?? 0) + 1;
      continue;
    }

    const lnk = sp.links ?? {};
    const website  = lnk["HomePage"] || lnk["Website"] || "";
    const twitter  = lnk["Twitter"]  || (sp.twitterUserName ? `https://twitter.com/${sp.twitterUserName}` : "");
    const discord  = lnk["Discord"]  || "";
    const telegram = lnk["Telegram"] || "";

    let score = 0;
    for (const [, re] of GALXE_BOOST)    if (re.test(text)) score++;
    for (const [, re] of GALXE_PENALIZE) if (re.test(text)) score--;
    if (website)  score += 2;
    if (twitter)  score++;
    if (discord)  score++;
    if (telegram) score++;
    if (c.endTime) score++;
    totalScore += score;

    let chain = "";
    for (const [re, name] of GALXE_CHAINS) {
      if (re.test(text)) { chain = name; break; }
    }

    const slug = `galxe-${sp.alias}`
      .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");

    scored.push({
      score,
      item: {
        id: `galxe-${sp.alias}`,
        name: sp.name,
        source_url: `https://app.galxe.com/quest/${sp.alias}`,
        slug,
        description: c.name + (c.description ? `: ${c.description}` : ""),
        logo_url: c.thumbnail || "",
        chain,
        end_date: c.endTime || null,
        reward: "",
        pub_date: c.startTime || null,
        website_url: website,
        twitter_url: twitter,
        discord_url: discord,
        telegram_url: telegram,
        ticker: "",
        tasks: [],
        source: "galxe",
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const items = scored.slice(0, limit).map(s => s.item);

  const avg_score = scored.length > 0
    ? Math.round((totalScore / scored.length) * 10) / 10
    : 0;

  // Top 5 rejection reasons by count
  const galxe_top_rejections = Object.fromEntries(
    Object.entries(rejectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  );

  const enrichStats = {
    articles_fetched: 0,
    websites_found:  items.filter(d => d.website_url).length,
    socials_found:   items.filter(d => d.twitter_url || d.discord_url || d.telegram_url).length,
    deadlines_found: items.filter(d => d.end_date).length,
    tasks_found:     0,
  };

  return { items, fetched: totalFetched, enrichStats, extra: { galxe_avg_score: avg_score, galxe_top_rejections } };
}

// ─── Quality filter ────────────────────────────────────────────────────────────

function passesQuality(item: ScrapedAirdrop): boolean {
  return !!(item.website_url || item.twitter_url || item.discord_url || item.telegram_url);
}

// ─── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const limit = Math.min(Number(body.limit ?? 30), 50);
  const existingUrls: string[] = Array.isArray(body.existing_urls) ? body.existing_urls : [];
  const existingSet = new Set(existingUrls);
  const sources: string[] = Array.isArray(body.sources)
    ? body.sources
    : ["airdropalert", "galxe"];

  const [aaSettled, galxeSettled] = await Promise.allSettled([
    sources.includes("airdropalert") ? fetchAirdropAlert(limit) : Promise.resolve(null),
    sources.includes("galxe")        ? fetchGalxe(limit)        : Promise.resolve(null),
  ]);

  const aaResult    = aaSettled.status    === "fulfilled" ? aaSettled.value    : null;
  const galxeResult = galxeSettled.status === "fulfilled" ? galxeSettled.value : null;

  const aaItems:    ScrapedAirdrop[] = aaResult?.items    ?? [];
  const galxeItems: ScrapedAirdrop[] = galxeResult?.items ?? [];
  const aaError    = aaResult?.error;
  const galxeError = galxeResult?.error;

  // Merge → quality filter → deduplicate
  const merged = [...aaItems, ...galxeItems].filter(passesQuality);

  const { items: deduped, dupCount } = deduplicateBatch(merged);

  // Stats
  const newCount     = deduped.filter(d => !existingSet.has(d.source_url)).length;
  const skippedCount = deduped.filter(d =>  existingSet.has(d.source_url)).length;
  const dates = deduped.map(d => d.pub_date).filter(Boolean) as string[];
  const latestDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

  const galxeFetched  = galxeResult?.fetched ?? 0;
  const galxeAccepted = galxeItems.length;
  const galxeRejected = galxeFetched - galxeAccepted;

  const source_counts: Record<string, number> = {
    airdropalert:   aaItems.length,
    galxe_fetched:  galxeFetched,
    galxe_accepted: galxeAccepted,
    galxe_rejected: galxeRejected,
  };

  const source_errors: Record<string, string> = {};
  if (aaError)    source_errors.airdropalert = aaError;
  if (galxeError) source_errors.galxe        = galxeError;

  const enrichStats = {
    articles_fetched: aaResult?.enrichStats.articles_fetched ?? 0,
    websites_found:   deduped.filter(d => d.website_url).length,
    socials_found:    deduped.filter(d => d.twitter_url || d.discord_url || d.telegram_url).length,
    deadlines_found:  deduped.filter(d => d.end_date).length,
    tasks_found:      deduped.filter(d => d.tasks && d.tasks.length > 0).length,
  };

  return new Response(
    JSON.stringify({
      data: deduped,
      source: sources.length === 1 ? sources[0] : "multi",
      sources,
      count: deduped.length,
      fetched: (aaResult?.fetched ?? 0) + (galxeResult?.fetched ?? 0),
      new_count: newCount,
      skipped_count: skippedCount,
      dup_count: dupCount,
      latest_date: latestDate,
      error: aaError && deduped.length === 0 ? aaError : undefined,
      enrich_stats: {
        ...enrichStats,
        source_counts,
        source_errors,
        galxe_avg_score:       galxeResult?.extra?.galxe_avg_score,
        galxe_top_rejections:  galxeResult?.extra?.galxe_top_rejections,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
