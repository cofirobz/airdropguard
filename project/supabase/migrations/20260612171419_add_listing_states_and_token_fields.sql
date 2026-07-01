-- Add token verification fields to submissions
ALTER TABLE airdrop_submissions
  ADD COLUMN IF NOT EXISTS token_name            TEXT,
  ADD COLUMN IF NOT EXISTS token_symbol          TEXT,
  ADD COLUMN IF NOT EXISTS token_address         TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendation     TEXT,    -- verify | review_further | blacklist
  ADD COLUMN IF NOT EXISTS token_verification    TEXT,    -- verified | suspicious | not_found | invalid_address | scam_detected | not_provided
  ADD COLUMN IF NOT EXISTS token_scan_result     JSONB,
  ADD COLUMN IF NOT EXISTS scam_warnings         JSONB;   -- string[]

-- Add listing state and blacklist reason to airdrops
ALTER TABLE airdrops
  ADD COLUMN IF NOT EXISTS listing_state    TEXT NOT NULL DEFAULT 'verified',  -- verified | under_review | scam_alert
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
