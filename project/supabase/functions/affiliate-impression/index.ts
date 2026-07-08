import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function detectDeviceType(userAgent: string | null): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const value = String(userAgent || '').toLowerCase();
  if (!value) return 'unknown';
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(value)) return 'tablet';
  if (/(mobi|iphone|ipod|android.*mobile|windows phone)/i.test(value)) return 'mobile';
  return 'desktop';
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

  const url = new URL(req.url);
  const slug = (url.searchParams.get('slug') || '').toLowerCase().trim();
  const placement = (url.searchParams.get('source') || '').toLowerCase().trim() || null;
  const bannerId = (url.searchParams.get('banner') || '').trim();

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: 'Invalid slug' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: link, error: linkError } = await supabase
    .from('affiliate_links')
    .select('id, slug, is_active, status')
    .eq('slug', slug)
    .maybeSingle();

  if (linkError || !link || !link.is_active || link.status !== 'active') {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userAgent = req.headers.get('user-agent');
  const deviceType = detectDeviceType(userAgent);
  const countryCode = (req.headers.get('cf-ipcountry') || req.headers.get('x-country-code') || '').trim().toUpperCase() || null;
  const referrer = req.headers.get('referer');
  const clientIp = resolveClientIp(req);
  const ipSalt = Deno.env.get('AFFILIATE_IP_HASH_SALT') || '';
  const ipHash = clientIp ? await sha256Hex(`${ipSalt}:${clientIp}`) : null;

  await supabase.from('affiliate_impressions').insert({
    affiliate_link_id: link.id,
    affiliate_banner_id: /^[0-9a-f-]{36}$/i.test(bannerId) ? bannerId : null,
    slug,
    placement_name: placement,
    device_type: deviceType,
    country_code: countryCode,
    referrer,
    user_agent: userAgent,
    ip_hash: ipHash,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});