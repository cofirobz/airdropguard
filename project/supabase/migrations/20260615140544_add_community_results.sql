CREATE TABLE airdrop_results (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  airdrop_id   uuid        NOT NULL REFERENCES airdrops(id)   ON DELETE CASCADE,
  status       text        NOT NULL CHECK (status IN ('received', 'not_eligible', 'waiting')),
  reward_range text        CHECK (reward_range IN ('<100', '100-500', '500-1000', '1000-5000', '5000+')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, airdrop_id)
);

ALTER TABLE airdrop_results ENABLE ROW LEVEL SECURITY;

-- Community stats are publicly visible (no PII beyond opaque user_id UUIDs)
CREATE POLICY "select_airdrop_results"  ON airdrop_results FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_own_result"       ON airdrop_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_result"       ON airdrop_results FOR UPDATE
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

CREATE POLICY "delete_own_result"       ON airdrop_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
