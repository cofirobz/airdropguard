import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RSS_URL = "https://airdropalert.com/feed/rssfeed";
const UA = "Mozilla/5.0 (compatible; AirdropGuard/1.0)";

const SKIP_DOMAINS = [
  "airdropalert.com", "twitter.com", "x.com", "discord.gg", "discord.com",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const results: object[] = [];

  // ── 1. Fetch RSS ────────────────────────────────────────────────────────────
  let rssStatus = 0;
  let rssError = "";
  let articleUrls: string[] = [];

  try {
    const rssRes = await fetch(RSS_URL, {
      headers: { "User-Agent": UA, Accept: "text/xml,*/*" },
      signal: AbortSignal.timeout(15_000),
    });
    rssStatus = rssRes.status;
    if (rssRes.ok) {
      const xml = await rssRes.text();
      articleUrls = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .slice(0, 5)
        .map(m => {
          const block = m[1];
          return { url: extractLink(block), title: extractField(block, "title") };
        })
        .filter(x => x.url)
        .map(x => x.url);
    } else {
      rssError = `RSS HTTP ${rssRes.status}`;
    }
  } catch (e) {
    rssError = e instanceof Error ? e.message : "rss fetch failed";
  }

  // ── 2. Probe each article ───────────────────────────────────────────────────
  for (const url of articleUrls) {
    const diag: Record<string, unknown> = { url };

    try {
      const t0 = Date.now();
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(10_000),
      });
      diag.fetch_ms = Date.now() - t0;
      diag.status = res.status;
      diag.ok = res.ok;
      diag.content_type = res.headers.get("content-type") ?? null;

      if (!res.ok) {
        diag.error = `HTTP ${res.status}`;
        results.push(diag);
        continue;
      }

      const raw = await res.text();
      diag.html_bytes = raw.length;

      // ── All <a href> tags ────────────────────────────────────────────────
      const allHrefs: string[] = [];
      for (const m of raw.matchAll(/href="([^"]{1,600})"/gi)) {
        allHrefs.push(m[1].trim());
      }
      diag.total_a_href_count = allHrefs.length;

      // External hrefs (start with http)
      const externalHrefs = allHrefs.filter(h => h.startsWith("http"));
      diag.external_href_count = externalHrefs.length;
      diag.first_10_external = externalHrefs.slice(0, 10);

      // ── What the extraction pipeline would see ───────────────────────────
      // Anchors with <a> tags (matching current extractAnchors logic)
      const anchorAnchors: { href: string; text: string; cls: string }[] = [];
      for (const m of raw.slice(0, 80_000).matchAll(/<a\s([^>]{0,500})>([\s\S]{0,300}?)<\/a>/gi)) {
        const hrefM = /href="([^"]{1,600})"/i.exec(m[1]);
        if (!hrefM) continue;
        const href = hrefM[1].trim();
        if (!href.startsWith("http")) continue;
        const cls = (/class="([^"]+)"/i.exec(m[1]) ?? [])[1] ?? "";
        const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
        anchorAnchors.push({ href, text, cls });
      }
      diag.anchor_tag_count = anchorAnchors.length;

      const shareClsRe = /\b(?:share|social-share|btn-share|addthis|addtoany|sharethis)\b/i;
      const usable = anchorAnchors.filter(a =>
        !SKIP_DOMAINS.some(d => a.href.includes(d)) &&
        !isShareOrTracking(a.href) &&
        !shareClsRe.test(a.cls)
      );
      diag.usable_anchor_count = usable.length;
      diag.first_10_usable = usable.slice(0, 10).map(a => ({ href: a.href, text: a.text, cls: a.cls }));

      // Twitter candidates
      const twitterCandidates = anchorAnchors.filter(a =>
        /(?:twitter|x)\.com\/(?!(?:intent|share|home|search|hashtag|status|i\/))[a-zA-Z0-9_]{1,50}\/?$/.test(a.href) &&
        !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
      );
      diag.twitter_candidates = twitterCandidates.map(a => a.href);

      // All twitter hrefs (including blocked ones, for comparison)
      diag.all_twitter_hrefs = anchorAnchors.filter(a => a.href.includes("twitter.com") || a.href.includes("x.com")).map(a => ({ href: a.href, cls: a.cls }));

      // Discord candidates
      const discordCandidates = anchorAnchors.filter(a =>
        /discord(?:\.gg|\.com\/invite)\/[a-zA-Z0-9\-]+/.test(a.href) &&
        !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
      );
      diag.discord_candidates = discordCandidates.map(a => a.href);

      // Telegram candidates
      const telegramCandidates = anchorAnchors.filter(a =>
        /t\.me\/[a-zA-Z0-9_\-]+/.test(a.href) &&
        !isShareOrTracking(a.href) && !shareClsRe.test(a.cls)
      );
      diag.telegram_candidates = telegramCandidates.map(a => a.href);

      // Website candidate
      const siteKeyRe = /\b(?:website|official|visit|homepage)\b/i;
      const websiteCandidate =
        (usable.find(a => siteKeyRe.test(a.text)) ??
         usable.find(a => siteKeyRe.test(a.cls)) ??
         usable[0])?.href ?? null;
      diag.website_candidate = websiteCandidate;

      // Deadline candidate from structured HTML
      const labelRe = /(?:end(?:s|ing)?|deadline|expires?|until|close[sd]?|campaign\s+end)/i;
      const dtMatches: string[] = [];
      for (const m of raw.matchAll(/<dt[^>]*>([\s\S]{0,120}?)<\/dt>\s*<dd[^>]*>([\s\S]{0,200}?)<\/dd>/gi)) {
        const label = m[1].replace(/<[^>]+>/g, "").trim();
        const val = m[2].replace(/<[^>]+>/g, "").trim();
        dtMatches.push(`${label} → ${val}`);
      }
      diag.dt_dd_pairs = dtMatches.slice(0, 10);
      diag.deadline_dt_candidate = dtMatches.find(s => labelRe.test(s)) ?? null;

      // Deadline from text
      const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 12_000);
      const deadlineTextMatch =
        /(?:end(?:s|ing)?|deadline|expires?|until|close[sd]?)\s*[:\-]?\s*(\w+ \d{1,2},? \d{4})/i.exec(text) ??
        /(?:end(?:s|ing)?|deadline|expires?)\s*[:\-]?\s*(\d{1,2} \w+ \d{4})/i.exec(text) ??
        /(?:end(?:s|ing)?|deadline)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i.exec(text);
      diag.deadline_text_candidate = deadlineTextMatch?.[1] ?? null;

      // <li> items
      const liItems: string[] = [];
      for (const m of raw.slice(0, 80_000).matchAll(/<li[^>]*>([\s\S]{0,500}?)<\/li>/gi)) {
        const t = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
        if (t.length >= 10) liItems.push(t);
      }
      diag.li_item_count = liItems.length;
      diag.first_10_li_items = liItems.slice(0, 10);

      // Snippet of plain text around "website" / "official"
      const siteSnippet = /(website|official site|visit|homepage)[^<]{0,100}/gi.exec(raw);
      diag.site_keyword_snippet = siteSnippet?.[0]?.slice(0, 120) ?? null;

      // og:image
      const ogImg = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(raw)
        ?? /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i.exec(raw);
      diag.og_image = ogImg?.[1] ?? null;

      // First 500 chars of raw HTML (to see if Cloudflare / bot challenge)
      diag.html_preview = raw.slice(0, 500);

    } catch (e) {
      diag.error = e instanceof Error ? e.message : "fetch failed";
    }

    results.push(diag);
  }

  return new Response(
    JSON.stringify({ rss_status: rssStatus, rss_error: rssError || null, article_count: articleUrls.length, articles: results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
