ALTER TABLE public.airdrops
  ADD COLUMN IF NOT EXISTS past_distribution_status text,
  ADD COLUMN IF NOT EXISTS ai_suggested_opportunity_type text,
  ADD COLUMN IF NOT EXISTS ai_suggested_past_distribution_status text,
  ADD COLUMN IF NOT EXISTS ai_classification_reason text,
  ADD COLUMN IF NOT EXISTS admin_classification_confirmed boolean;

ALTER TABLE public.airdrops
  ALTER COLUMN past_distribution_status SET DEFAULT NULL,
  ALTER COLUMN ai_suggested_opportunity_type SET DEFAULT NULL,
  ALTER COLUMN ai_suggested_past_distribution_status SET DEFAULT NULL,
  ALTER COLUMN ai_classification_reason SET DEFAULT NULL,
  ALTER COLUMN admin_classification_confirmed SET DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airdrops_past_distribution_status_check'
  ) THEN
    ALTER TABLE public.airdrops
      ADD CONSTRAINT airdrops_past_distribution_status_check
      CHECK (
        past_distribution_status IS NULL
        OR past_distribution_status IN (
          'none',
          'confirmed_past_airdrop',
          'claim_live',
          'claim_ended',
          'distribution_complete'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airdrops_ai_suggested_opportunity_type_check'
  ) THEN
    ALTER TABLE public.airdrops
      ADD CONSTRAINT airdrops_ai_suggested_opportunity_type_check
      CHECK (
        ai_suggested_opportunity_type IS NULL
        OR ai_suggested_opportunity_type IN (
          'confirmed_airdrop',
          'potential_airdrop',
          'points_program',
          'rewards_program',
          'testnet',
          'scam_alert'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airdrops_ai_suggested_past_distribution_status_check'
  ) THEN
    ALTER TABLE public.airdrops
      ADD CONSTRAINT airdrops_ai_suggested_past_distribution_status_check
      CHECK (
        ai_suggested_past_distribution_status IS NULL
        OR ai_suggested_past_distribution_status IN (
          'none',
          'confirmed_past_airdrop',
          'claim_live',
          'claim_ended',
          'distribution_complete'
        )
      );
  END IF;
END
$$;
