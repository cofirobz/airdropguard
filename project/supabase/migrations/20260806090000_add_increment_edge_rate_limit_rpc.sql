-- Security: atomic rate-limit counter as an RPC, replacing direct-Postgres access from edge functions.
-- Single-statement UPSERT keeps the increment-and-read atomic under concurrency.
CREATE OR REPLACE FUNCTION public.increment_edge_rate_limit(
  p_limiter_key text,
  p_window_start timestamptz
)
RETURNS integer
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  INSERT INTO public.edge_rate_limits (limiter_key, window_start, request_count)
  VALUES (p_limiter_key, p_window_start, 1)
  ON CONFLICT (limiter_key, window_start)
  DO UPDATE SET
    request_count = public.edge_rate_limits.request_count + 1,
    updated_at = timezone('utc', now())
  RETURNING request_count;
$$;

-- Security: functions are EXECUTE-able by PUBLIC by default; restrict to the service role
-- edge functions authenticate as, so anon/authenticated callers cannot invoke this directly.
REVOKE ALL ON FUNCTION public.increment_edge_rate_limit(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_edge_rate_limit(text, timestamptz) TO service_role;
