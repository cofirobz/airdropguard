CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users NOT NULL,
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  daily_time_available text CHECK (daily_time_available IN ('15', '30', '60+')),
  preferred_chains text[] DEFAULT '{}',
  risk_tolerance text CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_user_preferences"
ON public.user_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert_own_user_preferences"
ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_user_preferences"
ON public.user_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_user_preferences"
ON public.user_preferences FOR DELETE TO authenticated
USING (auth.uid() = user_id);
