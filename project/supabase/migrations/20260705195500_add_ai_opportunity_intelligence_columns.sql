ALTER TABLE airdrops
  ADD COLUMN IF NOT EXISTS opportunity_intelligence JSONB,
  ADD COLUMN IF NOT EXISTS ai_reasoning JSONB,
  ADD COLUMN IF NOT EXISTS human_decision TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendation_override TEXT,
  ADD COLUMN IF NOT EXISTS human_override_score INTEGER,
  ADD COLUMN IF NOT EXISTS final_published_score INTEGER;

ALTER TABLE airdrops
  DROP CONSTRAINT IF EXISTS airdrops_human_override_score_range,
  DROP CONSTRAINT IF EXISTS airdrops_final_published_score_range,
  DROP CONSTRAINT IF EXISTS airdrops_ai_recommendation_override_check;

ALTER TABLE airdrops
  ADD CONSTRAINT airdrops_human_override_score_range
    CHECK (human_override_score IS NULL OR (human_override_score >= 0 AND human_override_score <= 100)),
  ADD CONSTRAINT airdrops_final_published_score_range
    CHECK (final_published_score IS NULL OR (final_published_score >= 0 AND final_published_score <= 100)),
  ADD CONSTRAINT airdrops_ai_recommendation_override_check
    CHECK (
      ai_recommendation_override IS NULL OR
      ai_recommendation_override IN ('verify', 'review_further', 'blacklist')
    );
