-- Affiliate placement tracking without duplicating affiliate partner records

CREATE TABLE IF NOT EXISTS public.affiliate_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  placement_name text NOT NULL,
  tracker_value text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_placements_name_format CHECK (placement_name ~ '^[a-z0-9-]+$'),
  CONSTRAINT affiliate_placements_unique_per_link UNIQUE (affiliate_link_id, placement_name)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_placements_link ON public.affiliate_placements (affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_placements_name_enabled ON public.affiliate_placements (placement_name, enabled);

CREATE OR REPLACE FUNCTION public.touch_affiliate_placements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_affiliate_placements_updated_at ON public.affiliate_placements;
CREATE TRIGGER trg_touch_affiliate_placements_updated_at
BEFORE UPDATE ON public.affiliate_placements
FOR EACH ROW
EXECUTE FUNCTION public.touch_affiliate_placements_updated_at();

ALTER TABLE public.affiliate_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_placements_admin_select" ON public.affiliate_placements;
CREATE POLICY "affiliate_placements_admin_select"
  ON public.affiliate_placements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_placements_admin_insert" ON public.affiliate_placements;
CREATE POLICY "affiliate_placements_admin_insert"
  ON public.affiliate_placements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_placements_admin_update" ON public.affiliate_placements;
CREATE POLICY "affiliate_placements_admin_update"
  ON public.affiliate_placements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_placements_admin_delete" ON public.affiliate_placements;
CREATE POLICY "affiliate_placements_admin_delete"
  ON public.affiliate_placements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS placement_name text,
  ADD COLUMN IF NOT EXISTS tracker_value text;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_placement_created_at
  ON public.affiliate_clicks (placement_name, created_at DESC);

-- Guard against duplicate partners while preserving one affiliate record per company.
CREATE OR REPLACE FUNCTION public.ensure_unique_affiliate_partner_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.affiliate_links l
    WHERE lower(l.name) = lower(NEW.name)
      AND (TG_OP = 'INSERT' OR l.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'Affiliate partner already exists: %', NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_links_unique_name ON public.affiliate_links;
CREATE TRIGGER trg_affiliate_links_unique_name
BEFORE INSERT OR UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.ensure_unique_affiliate_partner_name();

-- Standard placements and tracker values. Existing placement booleans are respected.
WITH placement_seed AS (
  SELECT *
  FROM (VALUES
    ('homepage', 'homepage', 'homepage'),
    ('recommended-tools', 'recommended_tools', 'recommended-tools'),
    ('learn', 'learn_articles', 'learn'),
    ('airdrop-page', 'airdrop_pages', 'airdrop-page'),
    ('scam-alert', 'scam_alerts', 'scam-alert'),
    ('dashboard', 'dashboard', 'dashboard'),
    ('api-docs', NULL, 'api-docs'),
    ('footer', 'footer', 'footer')
  ) AS v(placement_name, legacy_key, tracker_value)
)
INSERT INTO public.affiliate_placements (
  affiliate_link_id,
  placement_name,
  tracker_value,
  enabled
)
SELECT
  l.id,
  s.placement_name,
  s.tracker_value,
  CASE
    WHEN s.legacy_key IS NULL THEN false
    ELSE COALESCE((l.placements ->> s.legacy_key)::boolean, false)
  END AS enabled
FROM public.affiliate_links l
CROSS JOIN placement_seed s
ON CONFLICT (affiliate_link_id, placement_name)
DO UPDATE SET
  tracker_value = EXCLUDED.tracker_value,
  enabled = public.affiliate_placements.enabled;

CREATE OR REPLACE FUNCTION public.seed_default_affiliate_placements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.affiliate_placements (affiliate_link_id, placement_name, tracker_value, enabled)
  VALUES
    (NEW.id, 'homepage', 'homepage', COALESCE((NEW.placements ->> 'homepage')::boolean, false)),
    (NEW.id, 'recommended-tools', 'recommended-tools', COALESCE((NEW.placements ->> 'recommended_tools')::boolean, true)),
    (NEW.id, 'learn', 'learn', COALESCE((NEW.placements ->> 'learn_articles')::boolean, false)),
    (NEW.id, 'airdrop-page', 'airdrop-page', COALESCE((NEW.placements ->> 'airdrop_pages')::boolean, false)),
    (NEW.id, 'scam-alert', 'scam-alert', COALESCE((NEW.placements ->> 'scam_alerts')::boolean, false)),
    (NEW.id, 'dashboard', 'dashboard', COALESCE((NEW.placements ->> 'dashboard')::boolean, false)),
    (NEW.id, 'api-docs', 'api-docs', false),
    (NEW.id, 'footer', 'footer', COALESCE((NEW.placements ->> 'footer')::boolean, false))
  ON CONFLICT (affiliate_link_id, placement_name) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_affiliate_placements ON public.affiliate_links;
CREATE TRIGGER trg_seed_default_affiliate_placements
AFTER INSERT ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_affiliate_placements();

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
  l.is_featured,
  l.priority_order,
  l.created_at
FROM public.affiliate_links l
WHERE l.is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.affiliate_placements ap
    WHERE ap.affiliate_link_id = l.id
      AND ap.placement_name = 'recommended-tools'
      AND ap.enabled = true
  )
ORDER BY l.is_featured DESC, l.priority_order ASC, l.created_at DESC;

GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;
