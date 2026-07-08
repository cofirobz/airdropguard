-- Add first-class opportunity types for AirdropGuard listings.
-- Existing listings default to Potential Airdrop unless already marked as scam/blacklisted.

ALTER TABLE public.airdrops
  ADD COLUMN IF NOT EXISTS opportunity_type text NOT NULL DEFAULT 'potential_airdrop';

UPDATE public.airdrops
SET opportunity_type = 'scam_alert'
WHERE opportunity_type <> 'scam_alert'
  AND (
    lower(COALESCE(listing_state, '')) = 'scam_alert'
    OR lower(COALESCE(ai_recommendation_override, '')) = 'blacklist'
    OR blacklist_reason IS NOT NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airdrops_opportunity_type_check'
      AND conrelid = 'public.airdrops'::regclass
  ) THEN
    ALTER TABLE public.airdrops
      ADD CONSTRAINT airdrops_opportunity_type_check
      CHECK (opportunity_type IN (
        'confirmed_airdrop',
        'potential_airdrop',
        'points_program',
        'rewards_program',
        'testnet',
        'scam_alert'
      ));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
