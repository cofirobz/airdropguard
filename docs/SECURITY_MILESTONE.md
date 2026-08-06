# Security Hardening Milestone

## Overview
This milestone addressed high-risk gaps identified during a focused security review of the application edge surface, admin controls, billing entitlements, and deployment security posture.

The review was undertaken to reduce production risk in five areas:
- unauthorized admin/data-modifying access,
- abuse of paid third-party integrations,
- race conditions in rate limiting,
- incorrect subscription entitlement assignment,
- missing baseline web security headers.

The hardening work was completed and deployed as release `v1.0-security-complete`.

## Critical Findings

### 1) Admin-capable Edge Functions lacked enforced admin authentication
- Original issue:
  - Admin-oriented functions could be reached without a strict server-side admin gate, increasing risk of unauthorized privileged operations.
- Resolution:
  - Added server-side admin checks using Supabase Auth + admin user table verification before privileged execution paths.
- Files changed:
  - `project/supabase/functions/analyze-airdrop/index.ts`
  - `project/supabase/functions/cryptorank-proxy/index.ts`
  - `project/supabase/functions/debug-enrichment/index.ts`

### 2) Public intelligence functions were vulnerable to request abuse against paid providers
- Original issue:
  - Public endpoints calling paid upstream services had insufficient abuse controls.
- Resolution:
  - Introduced server-side rate-limit storage and enforcement path for edge functions.
- Files changed:
  - `project/supabase/functions/token-security-intelligence/index.ts`
  - `project/supabase/functions/wallet-intelligence/index.ts`
  - `project/supabase/migrations/20260805221000_add_edge_rate_limits.sql`

### 3) Rate-limit increment logic depended on direct PostgreSQL connectivity from Edge Functions
- Original issue:
  - Initial limiter implementation used direct Postgres access (`npm:postgres` + `SUPABASE_DB_URL`), creating extra secret/connection-management risk.
- Resolution:
  - Migrated to Supabase client + database RPC (`supabase.rpc`) with DB-side atomic increment.
  - Removed direct Postgres client dependency from edge function code paths.
- Files changed:
  - `project/supabase/functions/token-security-intelligence/index.ts`
  - `project/supabase/functions/wallet-intelligence/index.ts`
  - `project/supabase/migrations/20260806090000_add_increment_edge_rate_limit_rpc.sql`

### 4) Stripe entitlement assignment had unsafe fallback behavior in checkout completion
- Original issue:
  - `checkout.session.completed` included plan fallback behavior that could over-entitle on malformed/missing metadata (`session.metadata?.plan || "pro"`).
- Resolution:
  - Updated entitlement derivation to fail-safe behavior consistent with `customer.subscription.updated`:
    - derive from immutable Stripe Price ID first,
    - then metadata,
    - otherwise default to `free`.
- Files changed:
  - `project/supabase/functions/stripe-webhook/index.ts`

### 5) Missing baseline hardening headers on app delivery path
- Original issue:
  - Frontend delivery lacked key baseline headers to reduce browser-side attack surface.
- Resolution:
  - Added baseline hardening headers, including:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - CSP policy for script/style/connect/frame/base/form constraints.
- Files changed:
  - `project/netlify.toml`

## Architectural Changes

### Admin authentication
- Privileged edge paths now enforce server-side admin identity checks (Supabase Auth token validation + admin membership verification) before sensitive operations.

### Edge Function hardening
- Public high-cost functions now include server-side abuse controls and fail-closed behavior when limiter dependencies are unavailable.

### RPC-based atomic rate limiting
- Rate-limit counting moved into Postgres RPC (`increment_edge_rate_limit`) so increment/read behavior is atomic under concurrency.
- RPC execution is restricted to `service_role`.

### Stripe entitlement validation
- Entitlement derivation now uses immutable Stripe Price IDs as the primary source of truth.
- Fallback logic is fail-safe (`free`) for unknown or malformed values.

### Security headers
- Netlify delivery config now includes baseline anti-clickjacking, anti-mime-sniffing, referrer policy, and CSP controls.

### Removal of direct PostgreSQL connections
- Edge function limiter paths no longer rely on direct DB connections from function runtime.
- `SUPABASE_DB_URL`-based direct access and `npm:postgres` limiter path were replaced by Supabase RPC.

## Accepted Risk
Anonymous rate limiting currently follows the official Supabase Edge Function examples using `X-Forwarded-For`.

Supabase does not currently provide a documented verified client-IP API for anonymous Edge Functions.

This is recorded as an accepted platform limitation and must be re-reviewed if Supabase introduces an official verified anonymous client-IP mechanism.

## Testing Completed
Validation completed for this milestone included:
- code-level review of all changed security-critical paths,
- verification that rate-limit paths use atomic RPC instead of direct Postgres access,
- verification of Stripe checkout entitlement fail-safe behavior,
- verification of Netlify security header configuration,
- production deployment and remote update confirmation,
- release tagging as `v1.0-security-complete`.

Notes:
- This section summarizes the validation performed during the hardening cycle and deployment checks for this release.

## Release
Version:
`v1.0-security-complete`
