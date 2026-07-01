-- Drop the permissive INSERT policy and replace it with one that
-- restricts inserters to only create rows with status = 'pending'.
-- This prevents public users from forging an 'approved' or 'rejected' status.

DROP POLICY IF EXISTS "insert_airdrop_submissions" ON airdrop_submissions;

CREATE POLICY "insert_airdrop_submissions" ON airdrop_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');
