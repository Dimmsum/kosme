-- Migration 0024: Educator review decisions (VER-8)
-- Run in Supabase SQL Editor AFTER 0023_events.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: The educator review queue (client/app/educator/verify/page.tsx) only
-- supported verify/reject. Adding "request corrections" needs a status the
-- student can land back on with a route into the pipeline (rather than the
-- terminal `rejected` state), and "adjust hours on approve" needs a place to
-- store the educator's corrected duration without overwriting the student's
-- own logged `actual_duration_min` — same "new precisely-named column"
-- convention as `duration_tag`/`client_source`/`reflection_notes`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. services.status — add 'corrections_requested'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN (
    'in_progress', 'awaiting_client', 'awaiting_educator',
    'corrections_requested', 'verified', 'rejected'
  ));

-- 2. services.adjusted_duration_min — educator's corrected hour count, set
--    optionally when approving. NULL means the logged actual_duration_min
--    stands as-is.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS adjusted_duration_min INT
  CHECK (adjusted_duration_min IS NULL OR adjusted_duration_min >= 0);

-- 3. verifications.status — add 'corrections_requested' so the "request
--    corrections" decision has a record alongside verified/rejected.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_status_check
  CHECK (status IN ('pending', 'verified', 'rejected', 'corrections_requested'));
