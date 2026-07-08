import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function parseSlug(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.findIndex((part) => part === 'affiliate-redirect');
  const fromPath = fnIdx >= 0 ? (parts[fnIdx + 1] || '') : (parts[parts.length - 1] || '');
  const normalized = fromPath.toLowerCase().trim();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : '';
}

function parseSource(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = (url.searchParams.get('source') || '').toLowerCase().trim();
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.findIndex((part) => part === 'affiliate-redirect');
  const fromPath = fnIdx >= 0 ? (parts[fnIdx + 2] || '') : '';
  const candidate = (fromQuery || fromPath || '').toLowerCase().trim();

  if (!candidate) return null;
  const normalized = candidate
    .replace(/[^a-z0-9-\s_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!/^[a-z0-9-]+$/.test(normalized)) return null;

  const aliases: Record<string, string> = {
    'affiliate-detail': 'affiliate-page',
    'api-docs': 'articles',
    dashboard: 'homepage',
    'scam-alert': 'scam-alerts',
  };

  return aliases[normalized] || normalized;
}

function mapTrackerValue(source: string | null): string | null {
  if (!source) return null;

  const mapping: Record<string, string> = {
    homepage: 'homepage',
    'recommended-tools': 'recommended-tools',
    learn: 'learn',
    articles: 'articles',
    'scam-alerts': 'scam-alerts',
    'affiliate-page': 'affiliate-page',
  };

  return mapping[source] || null;
}

function applyTracker(destination: string, trackerValue: string | null): string {
  if (!trackerValue) return destination;

  try {
    const url = new URL(destination);
    if (!url.searchParams.has('tracker')) {
      url.searchParams.set('tracker', trackerValue);
    }
    return url.toString();
  } catch {
    return destination;
  }
}

function cleanUnavailableHtml(slug: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Link unavailable | AirdropGuard</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #060a18; color: #e5e7eb; }
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { max-width: 560px; width: 100%; border: 1px solid rgba(148,163,184,0.25); border-radius: 16px; background: rgba(15,23,42,0.75); padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 8px; color: #cbd5e1; line-height: 1.5; }
    a { color: #67e8f9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .meta { margin-top: 12px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>Link unavailable</h1>
      <p>This partner link is unavailable right now.</p>
      <p>Please return to <a href="https://airdropguard.com/recommended-tools">Recommended Tools</a> or <a href="https://airdropguard.com/">AirdropGuard home</a>.</p>
      <p class="meta">Reference slug: ${slug || 'unknown'}</p>
    </section>
  </main>
</body>
</html>`;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function resolveClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  const first = forwarded.split(',')[0]?.trim();
  return first || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const slug = parseSlug(req);
  const source = parseSource(req);
  if (!slug) {
    return new Response(cleanUnavailableHtml('invalid-slug'), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: link, error: linkError } = await supabase
    .from('affiliate_links')
    .select('id, destination_url, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (linkError || !link || !link.is_active) {
    return new Response(cleanUnavailableHtml(slug), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const destination = String(link.destination_url || '').trim();
  if (!/^https?:\/\//i.test(destination)) {
    return new Response(cleanUnavailableHtml(slug), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const trackerValue = mapTrackerValue(source);

  const finalDestination = applyTracker(destination, trackerValue);

  const referrer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');
  const clientIp = resolveClientIp(req);
  const ipSalt = Deno.env.get('AFFILIATE_IP_HASH_SALT') || '';

  let ipHash: string | null = null;
  if (clientIp) {
    ipHash = await sha256Hex(`${ipSalt}:${clientIp}`);
  }

  const { data: settings } = await supabase
    .from('affiliate_settings')
    .select('click_tracking_enabled')
    .limit(1)
    .maybeSingle();

  const clickTrackingEnabled = settings?.click_tracking_enabled !== false;

  if (clickTrackingEnabled) {
    await supabase.from('affiliate_clicks').insert({
      affiliate_link_id: link.id,
      slug,
      placement_name: source,
      tracker_value: trackerValue,
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    });
  }

  await supabase
    .from('affiliate_links')
    .update({ last_click_at: new Date().toISOString() })
    .eq('id', link.id);

  return Response.redirect(finalDestination, 302);
});
