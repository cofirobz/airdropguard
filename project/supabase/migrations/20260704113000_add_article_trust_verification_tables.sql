-- Article trust and verification metadata
CREATE TABLE IF NOT EXISTS public.article_verification_profiles (
  article_key text PRIMARY KEY,
  title text NOT NULL,
  url_path text NOT NULL UNIQUE,
  publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'scheduled', 'published')),
  verification_status text NOT NULL DEFAULT 'ai_assisted_draft' CHECK (verification_status IN ('ai_assisted_draft', 'human_reviewed', 'verified_airdropguard')),
  reviewed_by text,
  reviewed_at date,
  last_updated_at timestamptz,
  estimated_read_minutes integer NOT NULL DEFAULT 8 CHECK (estimated_read_minutes > 0),
  official_docs_url text,
  official_github_url text,
  official_website_url text,
  official_x_url text,
  official_blog_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.article_verification_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_profiles_public_select" ON public.article_verification_profiles;
CREATE POLICY "article_profiles_public_select"
  ON public.article_verification_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "article_profiles_admin_insert" ON public.article_verification_profiles;
CREATE POLICY "article_profiles_admin_insert"
  ON public.article_verification_profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "article_profiles_admin_update" ON public.article_verification_profiles;
CREATE POLICY "article_profiles_admin_update"
  ON public.article_verification_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.article_review_internal (
  article_key text PRIMARY KEY REFERENCES public.article_verification_profiles(article_key) ON DELETE CASCADE,
  facts_checked boolean NOT NULL DEFAULT false,
  sources_verified boolean NOT NULL DEFAULT false,
  links_tested boolean NOT NULL DEFAULT false,
  scam_guidance_reviewed boolean NOT NULL DEFAULT false,
  security_advice_reviewed boolean NOT NULL DEFAULT false,
  grammar_checked boolean NOT NULL DEFAULT false,
  internal_review_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.article_review_internal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_review_internal_admin_select" ON public.article_review_internal;
CREATE POLICY "article_review_internal_admin_select"
  ON public.article_review_internal FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "article_review_internal_admin_insert" ON public.article_review_internal;
CREATE POLICY "article_review_internal_admin_insert"
  ON public.article_review_internal FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "article_review_internal_admin_update" ON public.article_review_internal;
CREATE POLICY "article_review_internal_admin_update"
  ON public.article_review_internal FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

INSERT INTO public.article_verification_profiles (
  article_key,
  title,
  url_path,
  publication_status,
  verification_status,
  reviewed_by,
  reviewed_at,
  last_updated_at,
  estimated_read_minutes,
  official_docs_url,
  official_github_url,
  official_website_url,
  official_x_url,
  official_blog_url
)
VALUES (
  'layer-2-airdrops-2026',
  'Ethereum Layer 2 Airdrops in 2026: Security, ROI and Risk Framework',
  '/articles/layer-2-airdrops-2026',
  'published',
  'verified_airdropguard',
  'AirdropGuard Team',
  CURRENT_DATE,
  now(),
  16,
  'https://ethereum.org/en/layer-2/',
  null,
  'https://airdropguard.com',
  'https://x.com/Dropguardai',
  null
)
ON CONFLICT (article_key) DO NOTHING;

INSERT INTO public.article_review_internal (
  article_key,
  facts_checked,
  sources_verified,
  links_tested,
  scam_guidance_reviewed,
  security_advice_reviewed,
  grammar_checked,
  internal_review_notes
)
VALUES (
  'layer-2-airdrops-2026',
  true,
  true,
  true,
  true,
  true,
  true,
  'Initial verification baseline created from existing editorial content.'
)
ON CONFLICT (article_key) DO NOTHING;
