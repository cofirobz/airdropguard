DROP POLICY IF EXISTS "delete_airdrop_submissions_admin" ON public.airdrop_submissions;

CREATE POLICY "delete_airdrop_submissions_admin"
  ON public.airdrop_submissions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.email()));
