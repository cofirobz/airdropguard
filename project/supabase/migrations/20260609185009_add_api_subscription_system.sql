
-- API Subscriptions
CREATE TABLE api_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_subscription" ON api_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subscription" ON api_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_subscription" ON api_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_subscription" ON api_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- API Keys
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_keys" ON api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_keys" ON api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_keys" ON api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_keys" ON api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- API Usage Logs
CREATE TABLE api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  endpoint text NOT NULL,
  status_code integer NOT NULL DEFAULT 200,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_logs" ON api_usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- API Projects (separate from airdrops, for the developer API)
CREATE TABLE api_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  website_url text DEFAULT '',
  github_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_active_projects" ON api_projects FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "auth_select_projects" ON api_projects FOR SELECT TO authenticated USING (status = 'active' OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_insert_projects" ON api_projects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_update_projects" ON api_projects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_delete_projects" ON api_projects FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- API Project Scores
CREATE TABLE api_project_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES api_projects NOT NULL UNIQUE,
  score integer CHECK (score >= 0 AND score <= 100),
  risk_level text DEFAULT '',
  summary text DEFAULT '',
  positives text[] DEFAULT '{}',
  concerns text[] DEFAULT '{}',
  github_score integer,
  team_score integer,
  security_score integer,
  community_score integer,
  website_score integer,
  tokenomics_score integer,
  reviewed_by_human boolean DEFAULT false,
  last_reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_project_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_scores" ON api_project_scores FOR SELECT TO anon USING (true);
CREATE POLICY "auth_select_scores" ON api_project_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_scores" ON api_project_scores FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_update_scores" ON api_project_scores FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_delete_scores" ON api_project_scores FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
