-- Discord Social Ops automation: safe draft/approval/schedule/send workflow

CREATE TABLE IF NOT EXISTS public.discord_social_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_send_approved boolean NOT NULL DEFAULT false,
  schedule_days text[] NOT NULL DEFAULT ARRAY['tuesday','friday']::text[],
  schedule_time_utc time NOT NULL DEFAULT '14:00:00'::time,
  timezone text NOT NULL DEFAULT 'UTC',
  announcements_channel_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discord_social_settings_schedule_day_count CHECK (array_length(schedule_days, 1) = 2),
  CONSTRAINT discord_social_settings_schedule_day_values CHECK (
    schedule_days <@ ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::text[]
  ),
  CONSTRAINT discord_social_settings_timezone_nonempty CHECK (length(trim(timezone)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_social_settings_singleton
  ON public.discord_social_settings ((true));

ALTER TABLE public.discord_social_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discord_social_settings_admin_select" ON public.discord_social_settings;
CREATE POLICY "discord_social_settings_admin_select"
  ON public.discord_social_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_settings_admin_insert" ON public.discord_social_settings;
CREATE POLICY "discord_social_settings_admin_insert"
  ON public.discord_social_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_settings_admin_update" ON public.discord_social_settings;
CREATE POLICY "discord_social_settings_admin_update"
  ON public.discord_social_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_settings_admin_delete" ON public.discord_social_settings;
CREATE POLICY "discord_social_settings_admin_delete"
  ON public.discord_social_settings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.discord_social_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'AirdropGuard Weekly Update',
  body text NOT NULL,
  embed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'sent', 'failed', 'rejected')),
  scheduled_for timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  reject_reason text,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  dedupe_hash text NOT NULL,
  discord_message_id text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discord_social_updates_body_nonempty CHECK (length(trim(body)) > 0),
  CONSTRAINT discord_social_updates_scheduled_for_required CHECK (
    status <> 'scheduled' OR scheduled_for IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_discord_social_updates_status_created
  ON public.discord_social_updates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_social_updates_scheduled_for
  ON public.discord_social_updates (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_discord_social_updates_sent_dedupe
  ON public.discord_social_updates (dedupe_hash)
  WHERE status = 'sent';

ALTER TABLE public.discord_social_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discord_social_updates_admin_select" ON public.discord_social_updates;
CREATE POLICY "discord_social_updates_admin_select"
  ON public.discord_social_updates FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_updates_admin_insert" ON public.discord_social_updates;
CREATE POLICY "discord_social_updates_admin_insert"
  ON public.discord_social_updates FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_updates_admin_update" ON public.discord_social_updates;
CREATE POLICY "discord_social_updates_admin_update"
  ON public.discord_social_updates FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "discord_social_updates_admin_delete" ON public.discord_social_updates;
CREATE POLICY "discord_social_updates_admin_delete"
  ON public.discord_social_updates FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

INSERT INTO public.discord_social_settings (auto_send_approved, schedule_days, schedule_time_utc, timezone)
SELECT false, ARRAY['tuesday','friday']::text[], '14:00:00'::time, 'UTC'
WHERE NOT EXISTS (SELECT 1 FROM public.discord_social_settings);
