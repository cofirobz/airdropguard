CREATE OR REPLACE FUNCTION get_airdrop_results_stats(p_airdrop_id uuid)
RETURNS TABLE (
  total_responses    bigint,
  received_count     bigint,
  not_eligible_count bigint,
  waiting_count      bigint,
  top_reward_range   text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)                                                   AS total_responses,
    COUNT(*) FILTER (WHERE status = 'received')                AS received_count,
    COUNT(*) FILTER (WHERE status = 'not_eligible')            AS not_eligible_count,
    COUNT(*) FILTER (WHERE status = 'waiting')                 AS waiting_count,
    (
      SELECT  reward_range
      FROM    airdrop_results
      WHERE   airdrop_id    = p_airdrop_id
        AND   status        = 'received'
        AND   reward_range  IS NOT NULL
      GROUP   BY reward_range
      ORDER   BY COUNT(*) DESC
      LIMIT   1
    )                                                          AS top_reward_range
  FROM airdrop_results
  WHERE airdrop_id = p_airdrop_id;
$$;
