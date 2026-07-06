-- Permanent deletion suppression fingerprints and admin notification dedupe support

CREATE TABLE IF NOT EXISTS public.deleted_entity_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('airdrop', 'submission', 'competitor_opportunity')),
  fingerprint_type text NOT NULL CHECK (fingerprint_type IN ('project_name', 'website_url', 'source_url', 'slug', 'token_symbol', 'contract_address')),
  fingerprint_value text NOT NULL,
  reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_entity_suppressions_identity
  ON public.deleted_entity_suppressions(entity_type, fingerprint_type, fingerprint_value);

CREATE INDEX IF NOT EXISTS idx_deleted_entity_suppressions_lookup
  ON public.deleted_entity_suppressions(entity_type, fingerprint_value);

ALTER TABLE public.deleted_entity_suppressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deleted_entity_suppressions_admin_select" ON public.deleted_entity_suppressions;
CREATE POLICY "deleted_entity_suppressions_admin_select"
  ON public.deleted_entity_suppressions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "deleted_entity_suppressions_admin_insert" ON public.deleted_entity_suppressions;
CREATE POLICY "deleted_entity_suppressions_admin_insert"
  ON public.deleted_entity_suppressions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "deleted_entity_suppressions_admin_update" ON public.deleted_entity_suppressions;
CREATE POLICY "deleted_entity_suppressions_admin_update"
  ON public.deleted_entity_suppressions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "deleted_entity_suppressions_admin_delete" ON public.deleted_entity_suppressions;
CREATE POLICY "deleted_entity_suppressions_admin_delete"
  ON public.deleted_entity_suppressions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS occurrence_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

UPDATE public.admin_notifications
SET
  dedupe_key = COALESCE(dedupe_key, md5(notification_type || '|' || title || '|' || message || '|' || COALESCE(context::text, ''))),
  occurrence_count = COALESCE(occurrence_count, 1),
  last_seen_at = COALESCE(last_seen_at, created_at, now())
WHERE dedupe_key IS NULL OR last_seen_at IS NULL OR occurrence_count IS NULL;

WITH ranked_notifications AS (
  SELECT
    id,
    dedupe_key,
    last_seen_at,
    created_at,
    occurrence_count,
    FIRST_VALUE(id) OVER (
      PARTITION BY dedupe_key
      ORDER BY last_seen_at DESC, created_at DESC, id DESC
    ) AS keeper_id
  FROM public.admin_notifications
  WHERE COALESCE(dedupe_key, '') <> ''
), aggregated_notifications AS (
  SELECT
    dedupe_key,
    keeper_id,
    MAX(last_seen_at) AS latest_seen_at,
    SUM(COALESCE(occurrence_count, 1)) AS total_occurrence_count
  FROM ranked_notifications
  GROUP BY dedupe_key, keeper_id
)
UPDATE public.admin_notifications AS target
SET
  last_seen_at = aggregated_notifications.latest_seen_at,
  occurrence_count = aggregated_notifications.total_occurrence_count
FROM aggregated_notifications
WHERE target.id = aggregated_notifications.keeper_id;

WITH ranked_notifications AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY dedupe_key
      ORDER BY last_seen_at DESC, created_at DESC, id DESC
    ) AS keeper_id
  FROM public.admin_notifications
  WHERE COALESCE(dedupe_key, '') <> ''
)
DELETE FROM public.admin_notifications AS target
USING ranked_notifications
WHERE target.id = ranked_notifications.id
  AND ranked_notifications.id <> ranked_notifications.keeper_id;

ALTER TABLE public.admin_notifications
  ALTER COLUMN dedupe_key SET NOT NULL,
  ALTER COLUMN dedupe_key SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_notifications_dedupe_key
  ON public.admin_notifications(dedupe_key)
  WHERE dedupe_key <> '';

CREATE INDEX IF NOT EXISTS idx_admin_notifications_last_seen_at
  ON public.admin_notifications(last_seen_at DESC);
