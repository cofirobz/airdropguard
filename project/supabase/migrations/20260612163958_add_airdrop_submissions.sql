CREATE TABLE airdrop_submissions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  project_name              TEXT NOT NULL,
  website_url               TEXT,
  twitter_url               TEXT,
  discord_url               TEXT,
  telegram_url              TEXT,
  blockchain                TEXT,
  category                  TEXT,

  -- Airdrop Info
  airdrop_type              TEXT,
  description               TEXT,
  tasks_required            TEXT,
  deadline                  DATE,
  reward_confirmed          TEXT DEFAULT 'Unknown',
  token_confirmed           TEXT DEFAULT 'Unknown',
  eligibility_requirements  TEXT,

  -- Trust & Verification
  team_info                 TEXT,
  funding_investors         TEXT,
  whitepaper_url            TEXT,
  github_url                TEXT,
  contract_address          TEXT,
  audit_url                 TEXT,

  -- Risk Assessment
  requires_wallet_connection BOOLEAN DEFAULT false,
  requires_transaction       BOOLEAN DEFAULT false,
  requires_payment           BOOLEAN DEFAULT false,
  requires_seed_phrase       BOOLEAN DEFAULT false,

  -- Meta
  additional_notes          TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  admin_notes               TEXT,
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE airdrop_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit
CREATE POLICY "insert_airdrop_submissions" ON airdrop_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admin users can read submissions
CREATE POLICY "select_airdrop_submissions_admin" ON airdrop_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

-- Only admin users can update submissions
CREATE POLICY "update_airdrop_submissions_admin" ON airdrop_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));
