-- Fix INSERT: require a valid email format instead of allowing anything
DROP POLICY IF EXISTS "insert_newsletter" ON newsletter_subscribers;
CREATE POLICY "insert_newsletter" ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'
  );

-- Fix SELECT: restrict to admin users only (was open to all authenticated)
DROP POLICY IF EXISTS "select_newsletter_admin" ON newsletter_subscribers;
CREATE POLICY "select_newsletter_admin" ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));
