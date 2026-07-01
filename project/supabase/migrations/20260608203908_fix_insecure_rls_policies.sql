-- Drop all insecure policies with USING(true) / WITH CHECK(true)
DROP POLICY IF EXISTS airdrops_admin_delete ON airdrops;
DROP POLICY IF EXISTS airdrops_admin_insert ON airdrops;
DROP POLICY IF EXISTS airdrops_admin_update ON airdrops;
DROP POLICY IF EXISTS airdrops_anon_delete ON airdrops;
DROP POLICY IF EXISTS airdrops_anon_insert ON airdrops;
DROP POLICY IF EXISTS airdrops_anon_update ON airdrops;

DROP POLICY IF EXISTS tasks_admin_delete ON airdrop_tasks;
DROP POLICY IF EXISTS tasks_admin_insert ON airdrop_tasks;
DROP POLICY IF EXISTS tasks_admin_update ON airdrop_tasks;
DROP POLICY IF EXISTS tasks_anon_delete ON airdrop_tasks;
DROP POLICY IF EXISTS tasks_anon_insert ON airdrop_tasks;
DROP POLICY IF EXISTS tasks_anon_update ON airdrop_tasks;

-- Replace with secure policies: only authenticated users can write
-- Airdrops: authenticated write
CREATE POLICY "airdrops_authenticated_insert" ON airdrops FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "airdrops_authenticated_update" ON airdrops FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "airdrops_authenticated_delete" ON airdrops FOR DELETE
  TO authenticated USING (true);

-- Airdrop tasks: authenticated write
CREATE POLICY "tasks_authenticated_insert" ON airdrop_tasks FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "tasks_authenticated_update" ON airdrop_tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "tasks_authenticated_delete" ON airdrop_tasks FOR DELETE
  TO authenticated USING (true);
