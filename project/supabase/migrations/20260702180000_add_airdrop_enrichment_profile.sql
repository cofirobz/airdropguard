ALTER TABLE public.airdrops
  ADD COLUMN IF NOT EXISTS enrichment_profile jsonb;

COMMENT ON COLUMN public.airdrops.enrichment_profile IS
  'Phase 1 AI enrichment cache and per-field intelligence metadata: value, confidence, source URL, and snapshots.';
