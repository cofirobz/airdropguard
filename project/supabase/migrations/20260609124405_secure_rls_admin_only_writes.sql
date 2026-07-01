/*
# Secure RLS: restrict writes to admin users only

1. New Tables
- `admin_users`
  - `id` uuid PK, references auth.users(id) ON DELETE CASCADE
  - `email` text UNIQUE NOT NULL — admin email for lookups
  - `created_at` timestamptz

2. Modified Policies
- `airdrops` and `airdrop_tasks`: DROP all authenticated write policies that use USING(true)
- Replace with policies that check `auth.uid() IN (SELECT id FROM admin_users)`

3. Security
- Only users listed in admin_users can INSERT, UPDATE, DELETE airdrops and airdrop_tasks
- Public SELECT (anon + authenticated) remains unchanged
- No data loss — only policy changes

4. Notes
- Seeds the existing admin user (cofirobz@googlemail.com) into admin_users
*/

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users table policies: anyone can read (for auth checks), only admins can write
CREATE POLICY "admin_users_public_select" ON admin_users FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admin_users_admin_insert" ON admin_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "admin_users_admin_delete" ON admin_users FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));

-- Seed existing admin
INSERT INTO admin_users (id, email)
SELECT id, email FROM auth.users WHERE email = 'cofirobz@googlemail.com';

-- Drop insecure write policies on airdrops
DROP POLICY IF EXISTS "airdrops_authenticated_insert" ON airdrops;
DROP POLICY IF EXISTS "airdrops_authenticated_update" ON airdrops;
DROP POLICY IF EXISTS "airdrops_authenticated_delete" ON airdrops;

-- Create secure write policies on airdrops (admin-only)
CREATE POLICY "airdrops_admin_insert" ON airdrops FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "airdrops_admin_update" ON airdrops FOR UPDATE
  TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "airdrops_admin_delete" ON airdrops FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));

-- Drop insecure write policies on airdrop_tasks
DROP POLICY IF EXISTS "tasks_authenticated_insert" ON airdrop_tasks;
DROP POLICY IF EXISTS "tasks_authenticated_update" ON airdrop_tasks;
DROP POLICY IF EXISTS "tasks_authenticated_delete" ON airdrop_tasks;

-- Create secure write policies on airdrop_tasks (admin-only)
CREATE POLICY "tasks_admin_insert" ON airdrop_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "tasks_admin_update" ON airdrop_tasks FOR UPDATE
  TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "tasks_admin_delete" ON airdrop_tasks FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));
