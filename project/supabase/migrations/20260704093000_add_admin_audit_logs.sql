-- Admin audit trail for human verification decisions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid,
  admin_identifier text NOT NULL,
  action_taken text NOT NULL,
  ai_recommendation text,
  final_decision text NOT NULL,
  notes text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_select_admin" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select_admin"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_audit_logs_insert_admin" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert_admin"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS admin_audit_logs_action_at_idx ON public.admin_audit_logs (action_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_taken_idx ON public.admin_audit_logs (action_taken);
