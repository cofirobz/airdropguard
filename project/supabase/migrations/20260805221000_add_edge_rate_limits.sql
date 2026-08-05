-- Security: server-side rate limit storage for public edge functions that call paid providers.
create table if not exists public.edge_rate_limits (
  limiter_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint edge_rate_limits_request_count_nonnegative check (request_count >= 0),
  constraint edge_rate_limits_pkey primary key (limiter_key, window_start)
);

-- Security: RLS is enabled by default; edge functions use service role so no public direct writes are exposed.
alter table public.edge_rate_limits enable row level security;

create index if not exists edge_rate_limits_window_start_idx on public.edge_rate_limits (window_start);
