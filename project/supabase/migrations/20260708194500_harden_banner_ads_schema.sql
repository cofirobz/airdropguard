-- Safe hardening migration for banner_ads schema parity.
-- This migration is idempotent and only adds missing fields/constraints.

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
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS placement text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS destination_url text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS banner_image_url text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS alt_text text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.banner_ads ALTER COLUMN project_name SET NOT NULL;
ALTER TABLE public.banner_ads ALTER COLUMN placement SET NOT NULL;
ALTER TABLE public.banner_ads ALTER COLUMN destination_url SET NOT NULL;
ALTER TABLE public.banner_ads ALTER COLUMN banner_image_url SET NOT NULL;
ALTER TABLE public.banner_ads ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.banner_ads ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.banner_ads ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.banner_ads ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.banner_ads
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.banner_ads
SET updated_at = now()
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_placement_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_placement_check
      CHECK (placement IN ('homepage_hero', 'homepage_mid', 'sidebar', 'footer', 'recommended_tools'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_status_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_status_check
      CHECK (status IN ('draft', 'live', 'scheduled', 'expired', 'disabled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_destination_url_http_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_destination_url_http_check
      CHECK (destination_url ~* '^https?://');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_banner_image_url_http_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_banner_image_url_http_check
      CHECK (banner_image_url ~* '^https?://');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_destination_url_not_html_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_destination_url_not_html_check
      CHECK (destination_url !~* '<\\s*a\\b');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banner_ads_date_order_check'
      AND conrelid = 'public.banner_ads'::regclass
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_date_order_check
      CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);
  END IF;
END $$;
