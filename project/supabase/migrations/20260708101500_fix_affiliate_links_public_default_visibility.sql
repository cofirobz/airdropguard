-- Ensure active affiliates remain visible on Recommended Tools even when
-- placement rows were not seeded historically. If a placement row exists,
-- it can still explicitly disable recommended-tools visibility.

DROP VIEW IF EXISTS public.affiliate_links_public;

CREATE OR REPLACE VIEW public.affiliate_links_public
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.name,
  l.slug,
  l.category,
  l.description,
  l.disclosure_text,
  l.logo_url,
  l.is_active,
  l.is_featured,
  l.is_featured AS featured,
  l.priority_order,
  l.created_at
FROM public.affiliate_links l
LEFT JOIN public.affiliate_placements ap
  ON ap.affiliate_link_id = l.id
 AND ap.placement_name = 'recommended-tools'
WHERE l.is_active = true
  AND COALESCE(ap.enabled, true) = true
ORDER BY l.is_featured DESC, l.priority_order ASC, l.created_at DESC;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
