import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type DiscordUpdateStatus = "draft" | "approved" | "scheduled" | "sent" | "failed" | "rejected";

type DiscordSettings = {
  id: string;
  auto_send_approved: boolean;
  schedule_days: string[];
  schedule_time_utc: string;
  timezone: string;
  announcements_channel_id: string | null;
};

type DiscordUpdateRow = {
  id: string;
  message_key: string;
  title: string;
  body: string;
  embed_payload: Record<string, unknown>;
  source_summary: Record<string, unknown>;
  status: DiscordUpdateStatus;
  scheduled_for: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  reject_reason: string | null;
  last_error: string | null;
  attempt_count: number;
  dedupe_hash: string;
  discord_message_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SAFE_WORDS = ["review", "check", "verify", "before interacting"];
const FORBIDDEN_PHRASES = [
  "guaranteed rewards",
  "free money",
  "connect wallet to claim",
  "risk-free",
];
const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const WALLET_TIPS = [
  "Review token approvals weekly and revoke unnecessary permissions before interacting with unfamiliar contracts.",
  "Check claim URLs against official project documentation and verify contract addresses before interacting.",
  "Verify wallet signatures line-by-line and reject requests that ask for broad spending approvals.",
  "Use a dedicated wallet for airdrop activity and check transaction simulation details before interacting.",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toIsoDateKey(input: Date): string {
  return input.toISOString().slice(0, 10).replace(/-/g, "");
}

function normalizeDay(value: string): string {
  return value.trim().toLowerCase();
}

function parseTimeToUtcParts(value: string): { hours: number; minutes: number } {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "14", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  return {
    hours: Number.isFinite(hours) ? Math.min(Math.max(hours, 0), 23) : 14,
    minutes: Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 59) : 0,
  };
}

function nextUtcForWeekday(day: string, scheduleTime: string, from = new Date()): Date {
  const targetDay = WEEKDAY_TO_INDEX[normalizeDay(day)] ?? 2;
  const { hours, minutes } = parseTimeToUtcParts(scheduleTime);
  const base = new Date(from);
  const result = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hours, minutes, 0, 0));
  const deltaDays = (targetDay - result.getUTCDay() + 7) % 7;
  result.setUTCDate(result.getUTCDate() + deltaDays);
  if (result.getTime() <= from.getTime()) {
    result.setUTCDate(result.getUTCDate() + 7);
  }
  return result;
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeText(input: string): string {
  let result = input;
  for (const forbidden of FORBIDDEN_PHRASES) {
    const re = new RegExp(forbidden, "gi");
    result = result.replace(re, "unsafe wording removed");
  }
  return result;
}

function ensureSafeLanguage(text: string): string {
  const lower = text.toLowerCase();
  const hasSafeWord = SAFE_WORDS.some((word) => lower.includes(word));
  if (hasSafeWord) return sanitizeText(text);
  return `${sanitizeText(text)}\n\nAlways review and verify details before interacting.`;
}

function pickWalletTip(seed: string): string {
  const sum = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return WALLET_TIPS[sum % WALLET_TIPS.length];
}

async function getOrCreateSettings(supabase: ReturnType<typeof createClient>): Promise<DiscordSettings> {
  const { data, error } = await supabase
    .from("discord_social_settings")
    .select("id, auto_send_approved, schedule_days, schedule_time_utc, timezone, announcements_channel_id")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Unable to load Discord settings: ${error.message}`);
  if (data) return data as DiscordSettings;

  const { data: created, error: createError } = await supabase
    .from("discord_social_settings")
    .insert({
      auto_send_approved: false,
      schedule_days: ["tuesday", "friday"],
      schedule_time_utc: "14:00:00",
      timezone: "UTC",
    })
    .select("id, auto_send_approved, schedule_days, schedule_time_utc, timezone, announcements_channel_id")
    .single();

  if (createError || !created) {
    throw new Error(`Unable to initialize Discord settings: ${createError?.message ?? "unknown error"}`);
  }

  return created as DiscordSettings;
}

async function assertAdmin(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ userId: string }> {
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Invalid or expired token");

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (adminError) throw new Error(`Unable to verify admin role: ${adminError.message}`);
  if (!admin) throw new Error("Admin access required");

  return { userId: authData.user.id };
}

async function fetchGenerationSources(supabase: ReturnType<typeof createClient>) {
  const [{ data: verifiedAirdrops }, { data: scamReports }, { data: scamAirdrops }, { data: articles }, { data: reviewedCompetitor }] = await Promise.all([
    supabase
      .from("airdrops")
      .select("name, slug, website_url, updated_at")
      .eq("published", true)
      .eq("review_status", "approved")
      .neq("listing_state", "scam_alert")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("scam_reports")
      .select("project_name, reason, reviewed_at")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(5),
    supabase
      .from("airdrops")
      .select("name, slug, blacklist_reason, updated_at")
      .eq("listing_state", "scam_alert")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("article_verification_profiles")
      .select("title, url_path, updated_at")
      .eq("publication_status", "published")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("competitor_opportunities")
      .select("project_name, source_url, notes, updated_at")
      .eq("status", "drafted")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  return {
    verifiedAirdrops: (verifiedAirdrops ?? []) as Array<Record<string, unknown>>,
    scamReports: (scamReports ?? []) as Array<Record<string, unknown>>,
    scamAirdrops: (scamAirdrops ?? []) as Array<Record<string, unknown>>,
    articles: (articles ?? []) as Array<Record<string, unknown>>,
    reviewedCompetitor: (reviewedCompetitor ?? []) as Array<Record<string, unknown>>,
  };
}

function buildUpdateCopy(params: {
  slotKey: string;
  scheduleDate: Date;
  sources: {
    verifiedAirdrops: Array<Record<string, unknown>>;
    scamReports: Array<Record<string, unknown>>;
    scamAirdrops: Array<Record<string, unknown>>;
    articles: Array<Record<string, unknown>>;
    reviewedCompetitor: Array<Record<string, unknown>>;
  };
}) {
  const featured = params.sources.verifiedAirdrops[0];
  const article = params.sources.articles[0];
  const scamReport = params.sources.scamReports[0] ?? params.sources.scamAirdrops[0];
  const competitor = params.sources.reviewedCompetitor[0];
  const walletTip = pickWalletTip(params.slotKey);

  const featuredLabel = featured
    ? `${String(featured.name ?? "Featured verified opportunity")} (${String(featured.website_url ?? `https://airdropguard.com/airdrop/${String(featured.slug ?? "")}`)})`
    : "Featured verified opportunity: review this week in the AirdropGuard dashboard.";

  const scamWarning = scamReport
    ? `Risk reminder: ${String(scamReport.project_name ?? scamReport.name ?? "A monitored project")} requires extra verification before interacting.`
    : "Risk reminder: check impersonation signals and verify official links before interacting.";

  const articleLine = article
    ? `Article to review: ${String(article.title ?? "Security update")} (https://airdropguard.com${String(article.url_path ?? "/articles")})`
    : "Article to review: visit AirdropGuard Articles for the latest security guidance.";

  const competitorLine = competitor
    ? `Community update: reviewed Competitor Watch lead - ${String(competitor.project_name ?? "new opportunity")} (${String(competitor.source_url ?? "source reviewed")}).`
    : "Community update: no new reviewed competitor opportunities this cycle; monitoring remains active.";

  const lines = [
    `Featured verified airdrop: ${featuredLabel}`,
    `Wallet safety tip: ${walletTip}`,
    scamWarning,
    articleLine,
    competitorLine,
    "CTA: Check Before You Connect",
  ];

  const body = ensureSafeLanguage(lines.join("\n"));
  const embed = {
    title: "AirdropGuard Weekly Update",
    description: body,
    color: 2245375,
    footer: {
      text: "AirdropGuard • Check Before You Connect",
    },
    timestamp: params.scheduleDate.toISOString(),
  };

  return {
    title: "AirdropGuard Weekly Update",
    body,
    embed,
    sourceSummary: {
      featuredAirdrop: featured ?? null,
      scamSignal: scamReport ?? null,
      article: article ?? null,
      reviewedCompetitor: competitor ?? null,
      scheduleSlot: params.slotKey,
    },
  };
}

async function postToDiscord(params: {
  botToken: string | null;
  webhookUrl: string | null;
  channelId: string | null;
  title: string;
  body: string;
  embedPayload: Record<string, unknown>;
}) {
  if (params.botToken && params.channelId) {
    const response = await fetch(`https://discord.com/api/v10/channels/${params.channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${params.botToken}`,
      },
      body: JSON.stringify({
        content: "Check Before You Connect",
        embeds: [{
          title: params.title,
          description: params.body,
          ...(params.embedPayload ?? {}),
        }],
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Discord API send failed (${response.status}): ${text.slice(0, 350)}`);
    }

    const parsed = text ? JSON.parse(text) : {};
    return String(parsed.id ?? "");
  }

  if (params.webhookUrl) {
    const response = await fetch(params.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_name: "AirdropGuard Weekly Update",
        content: "Check Before You Connect",
        embeds: [{
          title: params.title,
          description: params.body,
          ...(params.embedPayload ?? {}),
        }],
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Discord webhook send failed (${response.status}): ${text.slice(0, 350)}`);
    }

    return "webhook_sent";
  }

  throw new Error("Discord destination not configured. Set DISCORD_BOT_TOKEN + DISCORD_ANNOUNCEMENTS_CHANNEL_ID or DISCORD_ANNOUNCEMENTS_WEBHOOK_URL.");
}

async function testDiscordConnection(params: {
  botToken: string | null;
  webhookUrl: string | null;
  channelId: string | null;
}) {
  if (params.botToken && params.channelId) {
    const response = await fetch(`https://discord.com/api/v10/channels/${params.channelId}`, {
      method: "GET",
      headers: {
        Authorization: `Bot ${params.botToken}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Discord channel access failed (${response.status}): ${text.slice(0, 350)}`);
    }

    const parsed = text ? JSON.parse(text) : {};
    return {
      mode: "bot_channel",
      ok: true,
      channelId: params.channelId,
      channelName: String(parsed.name ?? "unknown"),
    };
  }

  if (params.webhookUrl) {
    const response = await fetch(params.webhookUrl, { method: "GET" });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Discord webhook access failed (${response.status}): ${text.slice(0, 350)}`);
    }

    const parsed = text ? JSON.parse(text) : {};
    return {
      mode: "webhook",
      ok: true,
      channelId: String(parsed.channel_id ?? "unknown"),
      channelName: String(parsed.name ?? "unknown"),
    };
  }

  throw new Error("Discord destination not configured. Set DISCORD_BOT_TOKEN + DISCORD_ANNOUNCEMENTS_CHANNEL_ID or DISCORD_ANNOUNCEMENTS_WEBHOOK_URL.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { userId } = await assertAdmin(supabase, token);
    const payload = await req.json().catch(() => ({}));
    const action = typeof payload.action === "string" ? payload.action : "get_state";

    const settings = await getOrCreateSettings(supabase);

    if (action === "get_state") {
      const { data: updates, error } = await supabase
        .from("discord_social_updates")
        .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(`Unable to load Discord updates: ${error.message}`);

      return json({ settings, updates: (updates ?? []) as DiscordUpdateRow[] });
    }

    if (action === "generate") {
      const sources = await fetchGenerationSources(supabase);
      const slots = settings.schedule_days.map((day) => ({
        day,
        date: nextUtcForWeekday(day, settings.schedule_time_utc),
      }));

      const createdOrExisting: DiscordUpdateRow[] = [];

      for (const slot of slots) {
        const slotKey = `${slot.day}-${toIsoDateKey(slot.date)}`;
        const messageKey = `discord-weekly-${slotKey}`;
        const copy = buildUpdateCopy({ slotKey, scheduleDate: slot.date, sources });
        const dedupeHash = await sha256Hex(copy.body.toLowerCase().replace(/\s+/g, " ").trim());

        const { data: existing } = await supabase
          .from("discord_social_updates")
          .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
          .eq("message_key", messageKey)
          .maybeSingle();

        if (existing) {
          createdOrExisting.push(existing as DiscordUpdateRow);
          continue;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("discord_social_updates")
          .insert({
            message_key: messageKey,
            title: copy.title,
            body: copy.body,
            embed_payload: copy.embed,
            source_summary: copy.sourceSummary,
            status: "draft",
            scheduled_for: slot.date.toISOString(),
            dedupe_hash: dedupeHash,
            created_by: userId,
          })
          .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
          .single();

        if (insertError || !inserted) {
          throw new Error(`Unable to create draft update: ${insertError?.message ?? "unknown error"}`);
        }

        createdOrExisting.push(inserted as DiscordUpdateRow);
      }

      return json({ settings, updates: createdOrExisting, generatedCount: createdOrExisting.length });
    }

    if (action === "regenerate") {
      const updateId = typeof payload.updateId === "string" ? payload.updateId : "";
      if (!updateId) throw new Error("updateId is required for regenerate");

      const { data: row, error: rowError } = await supabase
        .from("discord_social_updates")
        .select("id, message_key, scheduled_for")
        .eq("id", updateId)
        .maybeSingle();
      if (rowError || !row) throw new Error(`Unable to load update for regenerate: ${rowError?.message ?? "not found"}`);

      const sources = await fetchGenerationSources(supabase);
      const scheduled = row.scheduled_for ? new Date(String(row.scheduled_for)) : new Date();
      const slotKey = String(row.message_key).replace(/^discord-weekly-/, "");
      const copy = buildUpdateCopy({ slotKey, scheduleDate: scheduled, sources });
      const dedupeHash = await sha256Hex(copy.body.toLowerCase().replace(/\s+/g, " ").trim());

      const { data: updated, error: updateError } = await supabase
        .from("discord_social_updates")
        .update({
          title: copy.title,
          body: copy.body,
          embed_payload: copy.embed,
          source_summary: copy.sourceSummary,
          dedupe_hash: dedupeHash,
          status: "draft",
          approved_by: null,
          approved_at: null,
          reject_reason: null,
          failed_at: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updateId)
        .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
        .single();

      if (updateError || !updated) {
        throw new Error(`Unable to regenerate update: ${updateError?.message ?? "unknown error"}`);
      }

      return json({ update: updated as DiscordUpdateRow });
    }

    if (action === "send_now" || action === "process_due") {
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN") ?? null;
      const webhookUrl = Deno.env.get("DISCORD_ANNOUNCEMENTS_WEBHOOK_URL") ?? null;
      const channelFromEnv = Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ?? null;
      const channelId = settings.announcements_channel_id ?? channelFromEnv;

      const sendOne = async (row: DiscordUpdateRow) => {
        const normalizedBody = row.body.toLowerCase().replace(/\s+/g, " ").trim();
        const currentDedupeHash = await sha256Hex(normalizedBody);

        if (row.status === "draft" || row.status === "rejected") {
          throw new Error("Only approved or scheduled updates can be sent.");
        }
        if (row.status === "sent" && row.discord_message_id) {
          return { row, skipped: true, reason: "already_sent" };
        }

        const { data: duplicateSent } = await supabase
          .from("discord_social_updates")
          .select("id")
          .eq("dedupe_hash", currentDedupeHash)
          .eq("status", "sent")
          .neq("id", row.id)
          .limit(1)
          .maybeSingle();

        if (duplicateSent) {
          const msg = "Duplicate message blocked: matching sent content already exists.";
          await supabase
            .from("discord_social_updates")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              last_error: msg,
              updated_at: new Date().toISOString(),
              attempt_count: row.attempt_count + 1,
            })
            .eq("id", row.id);
          throw new Error(msg);
        }

        try {
          const messageId = await postToDiscord({
            botToken,
            webhookUrl,
            channelId,
            title: row.title,
            body: row.body,
            embedPayload: row.embed_payload,
          });

          const { data: sentRow, error: sentError } = await supabase
            .from("discord_social_updates")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              failed_at: null,
              last_error: null,
              dedupe_hash: currentDedupeHash,
              discord_message_id: messageId,
              updated_at: new Date().toISOString(),
              attempt_count: row.attempt_count + 1,
            })
            .eq("id", row.id)
            .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
            .single();

          if (sentError || !sentRow) {
            throw new Error(`Message posted but update row failed to save: ${sentError?.message ?? "unknown error"}`);
          }

          return { row: sentRow as DiscordUpdateRow, skipped: false as const };
        } catch (error) {
          const err = error instanceof Error ? error.message : "Unknown Discord send error";

          await supabase
            .from("discord_social_updates")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              last_error: err,
              updated_at: new Date().toISOString(),
              attempt_count: row.attempt_count + 1,
            })
            .eq("id", row.id);

          throw new Error(err);
        }
      };

      if (action === "send_now") {
        const updateId = typeof payload.updateId === "string" ? payload.updateId : "";
        if (!updateId) throw new Error("updateId is required for send_now");

        const { data: row, error } = await supabase
          .from("discord_social_updates")
          .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
          .eq("id", updateId)
          .maybeSingle();

        if (error || !row) throw new Error(`Unable to load update: ${error?.message ?? "not found"}`);
        const sent = await sendOne(row as DiscordUpdateRow);
        return json({ update: sent.row, skipped: sent.skipped ?? false, reason: sent.reason ?? null });
      }

      if (!settings.auto_send_approved) {
        return json({ sentCount: 0, skipped: 0, message: "Auto-send is disabled" });
      }

      const nowIso = new Date().toISOString();
      const { data: dueRows, error: dueError } = await supabase
        .from("discord_social_updates")
        .select("id, message_key, title, body, embed_payload, source_summary, status, scheduled_for, approved_by, approved_at, sent_at, failed_at, reject_reason, last_error, attempt_count, dedupe_hash, discord_message_id, created_by, created_at, updated_at")
        .in("status", ["approved", "scheduled"])
        .lte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true })
        .limit(4);

      if (dueError) throw new Error(`Unable to load due updates: ${dueError.message}`);

      let sentCount = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of (dueRows ?? []) as DiscordUpdateRow[]) {
        try {
          const sent = await sendOne(row);
          if (sent.skipped) skipped += 1;
          else sentCount += 1;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Unknown send failure");
        }
      }

      return json({ sentCount, skipped, errors });
    }

    if (action === "test_connection") {
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN") ?? null;
      const webhookUrl = Deno.env.get("DISCORD_ANNOUNCEMENTS_WEBHOOK_URL") ?? null;
      const channelFromEnv = Deno.env.get("DISCORD_ANNOUNCEMENTS_CHANNEL_ID") ?? null;
      const channelId = settings.announcements_channel_id ?? channelFromEnv;

      const result = await testDiscordConnection({ botToken, webhookUrl, channelId });
      return json({ ok: true, destination: result });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 400);
  }
});
