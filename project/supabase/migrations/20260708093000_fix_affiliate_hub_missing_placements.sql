-- Backfill missing affiliate placement tracking objects when 20260707143000 was not applied.

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

NOTIFY pgrst, 'reload schema';
