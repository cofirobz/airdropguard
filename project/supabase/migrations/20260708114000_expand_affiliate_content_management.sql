-- Manual affiliate content management expansion.
-- Adds rich content fields, explicit display toggles, and updates public view.

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS banner_image_url text,
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS why_we_recommend text,
  ADD COLUMN IF NOT EXISTS best_for text,
  ADD COLUMN IF NOT EXISTS pros text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cons text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS security_benefits text,
  ADD COLUMN IF NOT EXISTS things_to_consider text,
  ADD COLUMN IF NOT EXISTS official_website text,
  ADD COLUMN IF NOT EXISTS button_text text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS show_on_recommended_tools boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_learn_articles boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_scam_alerts boolean NOT NULL DEFAULT false;

UPDATE public.affiliate_links
SET button_text = COALESCE(NULLIF(TRIM(button_text), ''), 'Visit Partner')
WHERE button_text IS NULL OR TRIM(button_text) = '';

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
  l.full_description,
  l.why_we_recommend,
  l.best_for,
  l.pros,
  l.cons,
  l.security_benefits,
  l.things_to_consider,
  l.logo_url,
  l.banner_image_url,
  l.disclosure_text,
  l.official_website,
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
  l.created_at
FROM public.affiliate_links l
LEFT JOIN public.affiliate_placements ap
  ON ap.affiliate_link_id = l.id
 AND ap.placement_name = 'recommended-tools'
WHERE l.is_active = true
  AND l.show_on_recommended_tools = true
  AND COALESCE(ap.enabled, true) = true
ORDER BY l.is_featured DESC, l.priority_order ASC, l.created_at DESC;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
