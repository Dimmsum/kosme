-- Migration 0030: Client-led booking journey (CLI-1..CLI-4)
-- Run in Supabase SQL Editor AFTER 0029_messages.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: stakeholder review of the client login (client-feedback.md) asked for a
-- client who finds a student, checks their portfolio and availability, and
-- books a service, plus a softer "Report an Issue" step instead of "Dispute".
-- Three gaps in the schema:
--   1. Nothing described what a student offers or when they are free, so a
--      client had nothing to filter students on.
--   2. `appointments` assumed the student always made the request, so there was
--      no way to tell who is waiting on whom once a client can book too.
--   3. A client dispute carried no reason, and rejected the student's work.
--
-- DESIGN:
--   * `student_profiles` mirrors `client_profiles` (0027): one optional row per
--     student, so a student with no row is still listed with empty defaults.
--     `services_offered` holds category ids the student can practise on a
--     client; verified categories are merged in at read time, not stored.
--   * `appointments.requested_by` records who opened the request. The OTHER
--     party accepts, declines or counter-proposes while status = 'pending'.
--     Existing rows were all student-initiated, so they backfill to student_id.
--   * `confirmations.issue_reason` / `issue_note` are set only when
--     status = 'disputed' (the status value is kept so every existing read of
--     it still works; the UI calls it "Issue reported"). A reported issue does
--     NOT change `services.status` - it flags the record for review.
--
-- RLS: enabled with no policies, service-role access only.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. student_profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id          UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  bio              TEXT,
  location         TEXT,
  willing_to_travel BOOLEAN NOT NULL DEFAULT FALSE,
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  availability     JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_listed        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS student_profiles_set_updated_at ON public.student_profiles;
CREATE TRIGGER student_profiles_set_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;


-- 2. appointments.requested_by
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

UPDATE public.appointments SET requested_by = student_id WHERE requested_by IS NULL;


-- 3. confirmations: reason for a reported issue
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.confirmations
  ADD COLUMN IF NOT EXISTS issue_reason TEXT
    CHECK (issue_reason IN (
      'service_cancelled',
      'service_incomplete',
      'not_received',
      'details_incorrect',
      'other'
    )),
  ADD COLUMN IF NOT EXISTS issue_note TEXT;
