-- Add import-related columns to airdrops
-- source: where the record originated ('manual', 'cryptorank')
-- human_verified: admin has reviewed and confirmed
-- review_status: 'approved' (public), 'pending', 'rejected', 'replaced_demo'
-- is_demo: marked as demo data when "Replace Demo Airdrops" is triggered
-- trust_label: e.g. 'Blue-Chip Verified' for auto-approved major projects
-- cryptorank_id: original ID from CryptoRank, prevents duplicate imports

ALTER TABLE airdrops
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS human_verified boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_label text,
  ADD COLUMN IF NOT EXISTS cryptorank_id text;

-- Unique index prevents duplicate CryptoRank imports
CREATE UNIQUE INDEX IF NOT EXISTS airdrops_cryptorank_id_idx
  ON airdrops (cryptorank_id)
  WHERE cryptorank_id IS NOT NULL;
