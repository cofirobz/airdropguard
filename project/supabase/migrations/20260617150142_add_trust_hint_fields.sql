ALTER TABLE airdrops
  ADD COLUMN IF NOT EXISTS docs_url     text,
  ADD COLUMN IF NOT EXISTS funding_info text,
  ADD COLUMN IF NOT EXISTS investors    text,
  ADD COLUMN IF NOT EXISTS team_info    text;
