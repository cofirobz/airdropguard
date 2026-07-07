-- Affiliate Hub: admin-managed links, tracked redirects, and public-safe listing surface

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text,
  description text,
  destination_url text NOT NULL,
  disclosure_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_links_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  slug text NOT NULL,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_slug ON public.affiliate_links (slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_active ON public.affiliate_links (is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_created_at ON public.affiliate_clicks (affiliate_link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_slug_created_at ON public.affiliate_clicks (slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON public.affiliate_clicks (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_affiliate_links_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_affiliate_links_updated_at ON public.affiliate_links;
CREATE TRIGGER trg_touch_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.touch_affiliate_links_updated_at();

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_links_admin_select" ON public.affiliate_links;
CREATE POLICY "affiliate_links_admin_select"
  ON public.affiliate_links FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_links_admin_insert" ON public.affiliate_links;
CREATE POLICY "affiliate_links_admin_insert"
  ON public.affiliate_links FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_links_admin_update" ON public.affiliate_links;
CREATE POLICY "affiliate_links_admin_update"
  ON public.affiliate_links FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_links_admin_delete" ON public.affiliate_links;
CREATE POLICY "affiliate_links_admin_delete"
  ON public.affiliate_links FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_clicks_admin_select" ON public.affiliate_clicks;
CREATE POLICY "affiliate_clicks_admin_select"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_clicks_admin_delete" ON public.affiliate_clicks;
CREATE POLICY "affiliate_clicks_admin_delete"
  ON public.affiliate_clicks FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

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
  created_at
FROM public.affiliate_links
WHERE is_active = true;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;

INSERT INTO public.affiliate_links (
  name,
  slug,
  category,
  description,
  destination_url,
  disclosure_text,
  is_active
)
SELECT
  'Ledger',
  'ledger',
  'Hardware Wallet',
  'Hardware wallet option for users who want stronger crypto asset security.',
  'https://example.com/your-ledger-affiliate-link',
  'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.',
  false
WHERE NOT EXISTS (SELECT 1 FROM public.affiliate_links);
