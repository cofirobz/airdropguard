-- Fix public affiliate visibility for anon users.
-- The previous view used security_invoker=true, which applied base-table RLS
-- for anon and could return zero rows even when partners were active.

DROP VIEW IF EXISTS public.affiliate_links_public;

CREATE OR REPLACE VIEW public.affiliate_links_public
WITH (security_invoker = false)
AS
SELECT
  l.id,
  l.name,
  l.slug,
  l.category,
  l.description,
  l.full_description,
  l.why_we_recommend,
  l.best_for,
  l.pros,
  l.cons,
  l.security_benefits,
  l.things_to_consider,
  l.logo_url,
  recommended.desktop_banner_url,
  recommended.mobile_banner_url,
  recommended.square_banner_url,
  recommended.hero_banner_url,
  COALESCE(recommended.hero_banner_url, recommended.desktop_banner_url, l.banner_image_url) AS banner_image_url,
  l.disclosure_text,
  COALESCE(NULLIF(TRIM(l.website_url), ''), NULLIF(TRIM(l.official_website), ''), l.destination_url) AS official_website,
  COALESCE(NULLIF(TRIM(l.website_url), ''), NULLIF(TRIM(l.official_website), ''), l.destination_url) AS website_url,
  l.documentation_url,
  l.support_url,
  COALESCE(NULLIF(TRIM(l.button_text), ''), 'Visit Partner') AS button_text,
  l.tags,
  l.seo_title,
  l.meta_description,
  l.is_active,
  l.is_featured,
  l.is_featured AS featured,
  l.show_on_recommended_tools,
  l.show_on_homepage,
  l.show_on_learn_articles,
  l.show_on_scam_alerts,
  l.priority_order,
  l.display_order,
  l.weight,
  l.partner_rating,
  l.partner_trust_score,
  l.created_at
FROM public.affiliate_links l
LEFT JOIN LATERAL (
  SELECT
    b.desktop_banner_url,
    b.mobile_banner_url,
    b.square_banner_url,
    b.hero_banner_url
  FROM public.affiliate_banners b
  WHERE b.affiliate_link_id = l.id
    AND b.enabled = true
    AND b.status = 'active'
    AND ('recommended-tools' = ANY (b.placements))
    AND (b.start_at IS NULL OR b.start_at <= now())
    AND (b.end_at IS NULL OR b.end_at >= now())
  ORDER BY b.display_order ASC, b.weight DESC, b.created_at DESC
  LIMIT 1
) recommended ON true
WHERE l.status = 'active'
  AND l.is_active = true
  AND l.show_on_recommended_tools = true
ORDER BY l.is_featured DESC, l.display_order ASC, l.priority_order ASC, l.created_at DESC;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
