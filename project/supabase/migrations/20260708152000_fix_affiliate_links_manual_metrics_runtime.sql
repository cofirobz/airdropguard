ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS manual_conversions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_estimated_revenue numeric(12,2) NOT NULL DEFAULT 0;

UPDATE public.affiliate_links
SET
  manual_conversions = GREATEST(0, COALESCE(manual_conversions, 0)),
  manual_estimated_revenue = GREATEST(0, COALESCE(manual_estimated_revenue, 0));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'affiliate_links_manual_conversions_nonnegative'
      AND conrelid = 'public.affiliate_links'::regclass
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_manual_conversions_nonnegative
      CHECK (manual_conversions >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'affiliate_links_manual_estimated_revenue_nonnegative'
      AND conrelid = 'public.affiliate_links'::regclass
  ) THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_manual_estimated_revenue_nonnegative
      CHECK (manual_estimated_revenue >= 0);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';