-- Migration 0020: Evidence upload stage tagging (before/during/after) — VER-2
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: service_photos already has a `type` column (before|after) used to bucket
-- the before/after grid on the student detail page, portfolio, and educator
-- views. That's a display grouping, not a workflow stage, and it has no
-- "during" value. VER-2 asks for a `stage` tag a student sets per photo at
-- upload time so evidence can be organised before/during/after the service
-- itself. Modelled as a new, additive column rather than repurposing `type`,
-- since `type` is read in several existing places
-- (portfolio.ts, verifications.ts, admin/portfolios.ts, volunteer/browse
-- pages, educator/students page) that are out of scope for this issue.
--
-- NULLABLE: existing photo rows predate this column and have no clean stage
-- to backfill (a photo's `type` of before/after doesn't reliably map to a
-- workflow stage — an "after" photo could have been taken during the
-- service). Rather than guess, `stage` starts NULL on old rows and the app
-- prompts for it going forward on new uploads. Same convention as
-- `duration_tag` in 0017 (nullable TEXT + CHECK, not a DB enum type).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.service_photos
  ADD COLUMN IF NOT EXISTS stage TEXT
                            CHECK (stage IN ('before', 'during', 'after'));
