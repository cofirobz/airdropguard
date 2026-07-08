-- Banner system: persisted admin-managed banner inventory

CREATE TABLE IF NOT EXISTS public.banner_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  contact_email text,
  website_url text,
  placement text NOT NULL,
  destination_url text NOT NULL,
  banner_image_url text NOT NULL,
  alt_text text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banner_ads_placement_check CHECK (placement IN ('homepage_hero', 'homepage_mid', 'sidebar', 'footer', 'recommended_tools')),
  CONSTRAINT banner_ads_status_check CHECK (status IN ('draft', 'live', 'scheduled', 'expired', 'disabled')),
  CONSTRAINT banner_ads_destination_url_http_check CHECK (destination_url ~* '^https?://'),
  CONSTRAINT banner_ads_banner_image_url_http_check CHECK (banner_image_url ~* '^https?://'),
  CONSTRAINT banner_ads_destination_url_not_html_check CHECK (destination_url !~* '<\\s*a\\b'),
  CONSTRAINT banner_ads_date_order_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_banner_ads_placement_status_dates
  ON public.banner_ads (placement, status, start_date, end_date, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_banner_ads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_banner_ads_updated_at ON public.banner_ads;
CREATE TRIGGER trg_touch_banner_ads_updated_at
BEFORE UPDATE ON public.banner_ads
FOR EACH ROW
EXECUTE FUNCTION public.touch_banner_ads_updated_at();

ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banner_ads_admin_select" ON public.banner_ads;
CREATE POLICY "banner_ads_admin_select"
  ON public.banner_ads FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "banner_ads_admin_insert" ON public.banner_ads;
CREATE POLICY "banner_ads_admin_insert"
  ON public.banner_ads FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "banner_ads_admin_update" ON public.banner_ads;
CREATE POLICY "banner_ads_admin_update"
  ON public.banner_ads FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "banner_ads_admin_delete" ON public.banner_ads;
CREATE POLICY "banner_ads_admin_delete"
  ON public.banner_ads FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "banner_ads_public_read" ON public.banner_ads;
CREATE POLICY "banner_ads_public_read"
  ON public.banner_ads FOR SELECT
  TO anon, authenticated
  USING (
    status = 'live'
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );
