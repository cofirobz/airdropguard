/*
# Add is_sponsored field to airdrops

1. Modified Tables
- `airdrops`
  - Add `is_sponsored` (boolean, default false) — marks airdrops as paid/sponsored listings.
  - Sponsored airdrops can be pinned at the top of sections and display a "Sponsored" badge.
2. Security
- No RLS changes. Existing policies remain in place.
3. Notes
1. This field is for monetization — projects pay to have their airdrop marked as sponsored.
2. The admin panel will get a toggle for this field alongside the existing is_trending/is_featured toggles.
*/

ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;
