-- Allow anon writes for admin functionality (v1 - no auth system yet)
CREATE POLICY "airdrops_anon_insert" ON airdrops FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "airdrops_anon_update" ON airdrops FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "airdrops_anon_delete" ON airdrops FOR DELETE TO anon USING (true);

CREATE POLICY "tasks_anon_insert" ON airdrop_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "tasks_anon_update" ON airdrop_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tasks_anon_delete" ON airdrop_tasks FOR DELETE TO anon USING (true);
