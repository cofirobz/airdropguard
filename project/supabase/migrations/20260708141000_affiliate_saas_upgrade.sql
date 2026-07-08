ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS affiliate_click_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS documentation_url text,
  ADD COLUMN IF NOT EXISTS support_url text,
  ADD COLUMN IF NOT EXISTS affiliate_notes text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weight numeric(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS partner_rating numeric(4,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_trust_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

UPDATE public.affiliate_links
SET
  affiliate_click_url = COALESCE(NULLIF(TRIM(affiliate_click_url), ''), destination_url),
  website_url = COALESCE(NULLIF(TRIM(website_url), ''), NULLIF(TRIM(official_website), ''), destination_url),
  affiliate_notes = COALESCE(affiliate_notes, notes),
  display_order = COALESCE(display_order, priority_order, 100),
  status = CASE
    WHEN lower(COALESCE(status, '')) IN ('active', 'draft', 'archived') THEN lower(status)
    WHEN is_active THEN 'active'
    ELSE 'draft'
  END,
  partner_trust_score = GREATEST(0, LEAST(100, COALESCE(partner_trust_score, 0))),
  partner_rating = GREATEST(0, LEAST(5, COALESCE(partner_rating, 0))),
  weight = GREATEST(0.01, COALESCE(weight, 1));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'affiliate_links_status_check'
      AND conrelid = 'public.affiliate_links'::regclass
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_status_check
      CHECK (status IN ('active', 'draft', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'affiliate_links_partner_rating_range'
      AND conrelid = 'public.affiliate_links'::regclass
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_partner_rating_range
      CHECK (partner_rating >= 0 AND partner_rating <= 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'affiliate_links_partner_trust_score_range'
      AND conrelid = 'public.affiliate_links'::regclass
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_partner_trust_score_range
      CHECK (partner_trust_score >= 0 AND partner_trust_score <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_status_display_order
  ON public.affiliate_links (status, is_featured DESC, display_order ASC, priority_order ASC);

CREATE TABLE IF NOT EXISTS public.affiliate_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  banner_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  desktop_banner_url text,
  mobile_banner_url text,
  square_banner_url text,
  hero_banner_url text,
  alt_text text,
  placements text[] NOT NULL DEFAULT '{}'::text[],
  enabled boolean NOT NULL DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  device_targeting text NOT NULL DEFAULT 'all',
  rotation_mode text NOT NULL DEFAULT 'weighted',
  weight numeric(10,2) NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 100,
  desktop_width integer,
  desktop_height integer,
  mobile_width integer,
  mobile_height integer,
  square_width integer,
  square_height integer,
  hero_width integer,
  hero_height integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_banners_status_check CHECK (status IN ('active', 'draft', 'archived')),
  CONSTRAINT affiliate_banners_device_targeting_check CHECK (device_targeting IN ('desktop', 'mobile', 'tablet', 'all')),
  CONSTRAINT affiliate_banners_rotation_mode_check CHECK (rotation_mode IN ('random', 'weighted', 'sequential', 'highest_ctr')),
  CONSTRAINT affiliate_banners_nonempty_name CHECK (length(trim(banner_name)) > 0),
  CONSTRAINT affiliate_banners_has_asset CHECK (
    NULLIF(TRIM(COALESCE(desktop_banner_url, '')), '') IS NOT NULL OR
    NULLIF(TRIM(COALESCE(mobile_banner_url, '')), '') IS NOT NULL OR
    NULLIF(TRIM(COALESCE(square_banner_url, '')), '') IS NOT NULL OR
    NULLIF(TRIM(COALESCE(hero_banner_url, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_affiliate_banners_partner_order
  ON public.affiliate_banners (affiliate_link_id, status, enabled, display_order, weight DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_banners_placements_gin
  ON public.affiliate_banners USING gin (placements);

CREATE OR REPLACE FUNCTION public.touch_affiliate_banners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_affiliate_banners_updated_at ON public.affiliate_banners;
CREATE TRIGGER trg_touch_affiliate_banners_updated_at
BEFORE UPDATE ON public.affiliate_banners
FOR EACH ROW
EXECUTE FUNCTION public.touch_affiliate_banners_updated_at();

ALTER TABLE public.affiliate_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_banners_admin_select" ON public.affiliate_banners;
CREATE POLICY "affiliate_banners_admin_select"
  ON public.affiliate_banners FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_banners_admin_insert" ON public.affiliate_banners;
CREATE POLICY "affiliate_banners_admin_insert"
  ON public.affiliate_banners FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_banners_admin_update" ON public.affiliate_banners;
CREATE POLICY "affiliate_banners_admin_update"
  ON public.affiliate_banners FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_banners_admin_delete" ON public.affiliate_banners;
CREATE POLICY "affiliate_banners_admin_delete"
  ON public.affiliate_banners FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.affiliate_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  affiliate_banner_id uuid REFERENCES public.affiliate_banners(id) ON DELETE CASCADE,
  slug text NOT NULL,
  placement_name text,
  device_type text,
  country_code text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_impressions_link_created_at
  ON public.affiliate_impressions (affiliate_link_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_impressions_banner_created_at
  ON public.affiliate_impressions (affiliate_banner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_impressions_placement_created_at
  ON public.affiliate_impressions (placement_name, created_at DESC);

ALTER TABLE public.affiliate_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_impressions_admin_select" ON public.affiliate_impressions;
CREATE POLICY "affiliate_impressions_admin_select"
  ON public.affiliate_impressions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_impressions_admin_delete" ON public.affiliate_impressions;
CREATE POLICY "affiliate_impressions_admin_delete"
  ON public.affiliate_impressions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS affiliate_banner_id uuid REFERENCES public.affiliate_banners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS country_code text;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_banner_created_at
  ON public.affiliate_clicks (affiliate_banner_id, created_at DESC);

DROP VIEW IF EXISTS public.affiliate_banners_public;
CREATE OR REPLACE VIEW public.affiliate_banners_public
WITH (security_invoker = true)
AS
SELECT
  b.id,
  b.affiliate_link_id,
  l.name,
  l.slug,
  l.category,
  COALESCE(NULLIF(TRIM(l.affiliate_click_url), ''), l.destination_url) AS affiliate_click_url,
  COALESCE(NULLIF(TRIM(l.website_url), ''), NULLIF(TRIM(l.official_website), ''), l.destination_url) AS website_url,
  l.documentation_url,
  l.support_url,
  l.logo_url,
  l.partner_rating,
  l.partner_trust_score,
  l.is_featured,
  l.display_order AS partner_display_order,
  l.weight AS partner_weight,
  b.banner_name,
  b.desktop_banner_url,
  b.mobile_banner_url,
  b.square_banner_url,
  b.hero_banner_url,
  b.alt_text,
  b.placements,
  b.enabled,
  b.status,
  b.start_at,
  b.end_at,
  b.timezone,
  b.device_targeting,
  b.rotation_mode,
  b.weight,
  b.display_order,
  b.desktop_width,
  b.desktop_height,
  b.mobile_width,
  b.mobile_height,
  b.square_width,
  b.square_height,
  b.hero_width,
  b.hero_height,
  b.created_at,
  b.updated_at
FROM public.affiliate_banners b
JOIN public.affiliate_links l
  ON l.id = b.affiliate_link_id
WHERE l.status = 'active'
  AND l.is_active = true
  AND b.enabled = true
  AND b.status = 'active'
  AND (b.start_at IS NULL OR b.start_at <= now())
  AND (b.end_at IS NULL OR b.end_at >= now());

GRANT SELECT ON public.affiliate_banners_public TO anon, authenticated;

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
  recommended.desktop_banner_url,
  recommended.mobile_banner_url,
  recommended.square_banner_url,
  recommended.hero_banner_url,
  COALESCE(recommended.hero_banner_url, recommended.desktop_banner_url, l.banner_image_url) AS banner_image_url,
  l.disclosure_text,
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