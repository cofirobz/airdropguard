ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS source_url text;

CREATE UNIQUE INDEX IF NOT EXISTS airdrops_source_url_idx
  ON airdrops (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';
