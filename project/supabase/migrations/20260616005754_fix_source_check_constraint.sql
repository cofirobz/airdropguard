ALTER TABLE airdrops DROP CONSTRAINT airdrops_source_check;

ALTER TABLE airdrops ADD CONSTRAINT airdrops_source_check
  CHECK (source = ANY (ARRAY[
    'manual'::text,
    'cryptorank'::text,
    'community_submission'::text,
    'airdropsio'::text,
    'airdropalert_rss'::text
  ]));
