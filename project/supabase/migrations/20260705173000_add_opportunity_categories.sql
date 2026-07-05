-- Add explicit opportunity categories for platform segmentation.
-- Safe to re-run because each value uses IF NOT EXISTS.
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'Verified Airdrop',
    'Points Program',
    'Speculative Token',
    'Scam Alert'
  ]
  LOOP
    EXECUTE format('ALTER TYPE public.category ADD VALUE IF NOT EXISTS %L', v);
  END LOOP;
END $$;
