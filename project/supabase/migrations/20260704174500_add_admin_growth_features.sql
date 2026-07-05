-- Admin growth features: AI article drafts, competitor watch, in-app admin notifications

CREATE TABLE IF NOT EXISTS public.ai_article_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL,
  body text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  estimated_read_minutes integer NOT NULL DEFAULT 8 CHECK (estimated_read_minutes > 0),
  status text NOT NULL DEFAULT 'ai_assisted_draft' CHECK (status IN ('ai_assisted_draft', 'human_reviewed', 'verified_airdropguard', 'published', 'rejected')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_article_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_article_drafts_admin_select" ON public.ai_article_drafts;
CREATE POLICY "ai_article_drafts_admin_select"
  ON public.ai_article_drafts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "ai_article_drafts_admin_insert" ON public.ai_article_drafts;
CREATE POLICY "ai_article_drafts_admin_insert"
  ON public.ai_article_drafts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "ai_article_drafts_admin_update" ON public.ai_article_drafts;
CREATE POLICY "ai_article_drafts_admin_update"
  ON public.ai_article_drafts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "ai_article_drafts_admin_delete" ON public.ai_article_drafts;
CREATE POLICY "ai_article_drafts_admin_delete"
  ON public.ai_article_drafts FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.competitor_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  source_type text NOT NULL DEFAULT 'airdrop_directory' CHECK (source_type IN ('airdrop_directory', 'ecosystem_blog', 'foundation_announcement', 'testnet_campaign', 'quest_platform', 'research_news')),
  trust_level text NOT NULL DEFAULT 'medium' CHECK (trust_level IN ('high', 'medium', 'low')),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitor_sources_admin_select" ON public.competitor_sources;
CREATE POLICY "competitor_sources_admin_select"
  ON public.competitor_sources FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_sources_admin_insert" ON public.competitor_sources;
CREATE POLICY "competitor_sources_admin_insert"
  ON public.competitor_sources FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_sources_admin_update" ON public.competitor_sources;
CREATE POLICY "competitor_sources_admin_update"
  ON public.competitor_sources FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_sources_admin_delete" ON public.competitor_sources;
CREATE POLICY "competitor_sources_admin_delete"
  ON public.competitor_sources FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

INSERT INTO public.competitor_sources (source_name, source_url, source_type, trust_level, notes, is_active)
VALUES
  ('AirdropAlert Airdrops', 'https://airdropalert.com/airdrops/', 'airdrop_directory', 'medium', 'Trusted airdrop directory with campaign and listing coverage.', true),
  ('Airdrops.io', 'https://airdrops.io/', 'airdrop_directory', 'medium', 'High-visibility public airdrop directory.', true),
  ('Galxe Quests', 'https://galxe.com/quest', 'quest_platform', 'high', 'Major quest platform with campaign and reward programs.', true),
  ('Layer3 Quests', 'https://layer3.xyz/quests', 'quest_platform', 'high', 'Quest platform for campaign-based ecosystem incentives.', true),
  ('Base Blog', 'https://blog.base.org/', 'ecosystem_blog', 'high', 'Official ecosystem blog for launch and incentive announcements.', true),
  ('Arbitrum Blog', 'https://blog.arbitrum.io/', 'foundation_announcement', 'high', 'Official announcement channel for ecosystem and foundation updates.', true),
  ('CoinMarketCap Airdrops', 'https://coinmarketcap.com/airdrop/', 'research_news', 'medium', 'Public research and listing source for airdrop discovery.', true)
ON CONFLICT (source_url) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.competitor_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.competitor_sources(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  source_url text NOT NULL,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  category text,
  blockchain text,
  confidence_level text NOT NULL DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  why_matched text NOT NULL,
  similarity_score numeric(5,2),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'queued', 'ignored', 'duplicate', 'drafted')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_opportunities_status ON public.competitor_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_competitor_opportunities_discovered ON public.competitor_opportunities(discovered_at DESC);

ALTER TABLE public.competitor_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitor_opportunities_admin_select" ON public.competitor_opportunities;
CREATE POLICY "competitor_opportunities_admin_select"
  ON public.competitor_opportunities FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_opportunities_admin_insert" ON public.competitor_opportunities;
CREATE POLICY "competitor_opportunities_admin_insert"
  ON public.competitor_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_opportunities_admin_update" ON public.competitor_opportunities;
CREATE POLICY "competitor_opportunities_admin_update"
  ON public.competitor_opportunities FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "competitor_opportunities_admin_delete" ON public.competitor_opportunities;
CREATE POLICY "competitor_opportunities_admin_delete"
  ON public.competitor_opportunities FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  is_read boolean NOT NULL DEFAULT false,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(is_read, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_notifications_admin_select" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_select"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_notifications_admin_insert" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_insert"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_notifications_admin_update" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_update"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_notifications_admin_delete" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_delete"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));
