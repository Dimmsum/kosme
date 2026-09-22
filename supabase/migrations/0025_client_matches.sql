-- Migration 0025: Manual admin-assisted student↔client matching (CON-2)
-- Run in Supabase SQL Editor AFTER 0024_educator_decisions.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: `client_signups` (0012) are anonymous public form submissions, not
-- user accounts, so nothing links a signed-up volunteer client to the student
-- who will serve them. `volunteer_requests` (0009) can't hold this either: it
-- is keyed on a `volunteer_id` user account and represents the client asking,
-- not an admin pairing. This adds a dedicated table for super-admin-made
-- pairings rather than overloading either one.
--
-- DESIGN:
--   * A table, not a `matched_student_id` column on `client_signups`: one
--     client can be paired with several students (e.g. a hair student and a
--     nails student), and ending a match keeps the row as history instead of
--     nulling it out. Automated matching (KAI-5) can write into the same
--     table later.
--   * `status` is TEXT + CHECK (`active | ended`), matching the
--     `client_source`/`duration_tag`/`status` convention elsewhere.
--   * A partial unique index allows at most one ACTIVE match per
--     (signup, student) pair, while ended rows can pile up as history.
--   * No `is_demo` column: `client_signups` are always real submissions, and
--     the admin route only lets real (non-demo) students be matched.
--
-- RLS: enabled with no policies, service-role access only, same as every
-- other admin table (see CLAUDE.md: authorization lives in Express).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id   UUID NOT NULL REFERENCES public.client_signups(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  matched_by  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ended_by    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS client_matches_one_active_pair
  ON public.client_matches (signup_id, student_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS client_matches_student_idx
  ON public.client_matches (student_id);

ALTER TABLE public.client_matches ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see header).
