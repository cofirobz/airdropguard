-- Add optional Phase 2 fields for type-specific airdrop experiences.
-- Nullable only so existing listings and inserts remain compatible.

ALTER TABLE public.airdrops
  ADD COLUMN IF NOT EXISTS points_name text,
  ADD COLUMN IF NOT EXISTS season_name text,
  ADD COLUMN IF NOT EXISTS snapshot_date date,
  ADD COLUMN IF NOT EXISTS claim_status text,
  ADD COLUMN IF NOT EXISTS reward_status text,
  ADD COLUMN IF NOT EXISTS risk_reasons text[],
  ADD COLUMN IF NOT EXISTS official_safe_url text,
  ADD COLUMN IF NOT EXISTS network_name text,
  ADD COLUMN IF NOT EXISTS faucet_url text;

COMMENT ON COLUMN public.airdrops.points_name IS 'Optional points-program display name.';
COMMENT ON COLUMN public.airdrops.season_name IS 'Optional season or campaign label.';
COMMENT ON COLUMN public.airdrops.snapshot_date IS 'Optional snapshot date for confirmed airdrops.';
COMMENT ON COLUMN public.airdrops.claim_status IS 'Optional claim status text.';
COMMENT ON COLUMN public.airdrops.reward_status IS 'Optional reward status text.';
COMMENT ON COLUMN public.airdrops.risk_reasons IS 'Optional structured risk reasons for scam alerts.';
COMMENT ON COLUMN public.airdrops.official_safe_url IS 'Optional safe official URL for risky listings.';
COMMENT ON COLUMN public.airdrops.network_name IS 'Optional network name for testnet listings.';
COMMENT ON COLUMN public.airdrops.faucet_url IS 'Optional faucet URL for testnet listings.';

NOTIFY pgrst, 'reload schema';