-- Add missing columns required by the API gateway rate-limit and key lookup logic.
-- This is a non-destructive migration: it only adds columns and backfills existing rows.

BEGIN;

ALTER TABLE public.api_subscriptions
  ADD COLUMN IF NOT EXISTS key_value text;

ALTER TABLE public.api_subscriptions
  ADD COLUMN IF NOT EXISTS requests_used integer;

ALTER TABLE public.api_subscriptions
  ADD COLUMN IF NOT EXISTS requests_limit integer;

UPDATE public.api_subscriptions
SET requests_used = COALESCE(requests_used, 0)
WHERE requests_used IS NULL;

UPDATE public.api_subscriptions
SET requests_limit = COALESCE(requests_limit, 100)
WHERE requests_limit IS NULL;

ALTER TABLE public.api_subscriptions
  ALTER COLUMN requests_used SET DEFAULT 0,
  ALTER COLUMN requests_limit SET DEFAULT 100;

ALTER TABLE public.api_subscriptions
  ALTER COLUMN requests_used SET NOT NULL,
  ALTER COLUMN requests_limit SET NOT NULL;

COMMIT;
