-- Enterprise Affiliate Hub expansion (safe additive migration)

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS affiliate_network text,
  ADD COLUMN IF NOT EXISTS commission_rate text,
  ADD COLUMN IF NOT EXISTS cookie_duration_days integer,
  ADD COLUMN IF NOT EXISTS payment_threshold text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS priority_order integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS placements jsonb NOT NULL DEFAULT jsonb_build_object(
    'recommended_tools', true,
    'learn_articles', false,
    'scam_alerts', false,
    'airdrop_pages', false,
    'dashboard', false,
    'homepage', false,
    'footer', false,
    'future_blog_articles', false
  ),
  ADD COLUMN IF NOT EXISTS last_click_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_links_destination_url_http'
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_destination_url_http
      CHECK (destination_url ~* '^https?://');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_links_active_requires_destination'
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_active_requires_destination
      CHECK (NOT is_active OR (length(trim(destination_url)) > 0 AND destination_url ~* '^https?://'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_featured ON public.affiliate_links (is_featured);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_priority ON public.affiliate_links (priority_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_network ON public.affiliate_links (affiliate_network);

CREATE TABLE IF NOT EXISTS public.affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_disclosure text NOT NULL,
  default_placement text NOT NULL DEFAULT 'recommended_tools',
  recommended_tools_enabled boolean NOT NULL DEFAULT true,
  click_tracking_enabled boolean NOT NULL DEFAULT true,
  analytics_retention_days integer NOT NULL DEFAULT 365,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_affiliate_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_affiliate_settings_updated_at ON public.affiliate_settings;
CREATE TRIGGER trg_touch_affiliate_settings_updated_at
BEFORE UPDATE ON public.affiliate_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_affiliate_settings_updated_at();

ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_settings_admin_select" ON public.affiliate_settings;
CREATE POLICY "affiliate_settings_admin_select"
  ON public.affiliate_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_settings_admin_insert" ON public.affiliate_settings;
CREATE POLICY "affiliate_settings_admin_insert"
  ON public.affiliate_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_settings_admin_update" ON public.affiliate_settings;
CREATE POLICY "affiliate_settings_admin_update"
  ON public.affiliate_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

INSERT INTO public.affiliate_settings (
  default_disclosure,
  default_placement,
  recommended_tools_enabled,
  click_tracking_enabled,
  analytics_retention_days
)
SELECT
  'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.',
  'recommended_tools',
  true,
  true,
  365
WHERE NOT EXISTS (SELECT 1 FROM public.affiliate_settings);

CREATE TABLE IF NOT EXISTS public.affiliate_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner text NOT NULL,
  website text,
  applied boolean NOT NULL DEFAULT false,
  application_date date,
  status text NOT NULL DEFAULT 'new',
  commission text,
  cookie_length text,
  payment_threshold text,
  payment_method text,
  account_manager text,
  notes text,
  follow_up_reminder date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_affiliate_opportunities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_affiliate_opportunities_updated_at ON public.affiliate_opportunities;
CREATE TRIGGER trg_touch_affiliate_opportunities_updated_at
BEFORE UPDATE ON public.affiliate_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.touch_affiliate_opportunities_updated_at();

ALTER TABLE public.affiliate_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_opportunities_admin_select" ON public.affiliate_opportunities;
CREATE POLICY "affiliate_opportunities_admin_select"
  ON public.affiliate_opportunities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_opportunities_admin_insert" ON public.affiliate_opportunities;
CREATE POLICY "affiliate_opportunities_admin_insert"
  ON public.affiliate_opportunities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_opportunities_admin_update" ON public.affiliate_opportunities;
CREATE POLICY "affiliate_opportunities_admin_update"
  ON public.affiliate_opportunities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_opportunities_admin_delete" ON public.affiliate_opportunities;
CREATE POLICY "affiliate_opportunities_admin_delete"
  ON public.affiliate_opportunities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP VIEW IF EXISTS public.affiliate_links_public;

CREATE OR REPLACE VIEW public.affiliate_links_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  category,
  description,
  disclosure_text,
  logo_url,
  is_featured,
  priority_order,
  created_at
FROM public.affiliate_links
WHERE is_active = true
  AND COALESCE((placements ->> 'recommended_tools')::boolean, true) = true
ORDER BY is_featured DESC, priority_order ASC, created_at DESC;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;
