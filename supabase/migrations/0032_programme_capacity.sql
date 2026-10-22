-- Migration 0032: Programme details, programme/cohort capacity, institution subscriptions
-- Run in Supabase SQL Editor AFTER 0031_school_admin_role.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: stakeholder feedback (SFB-2) wants programmes to carry real curriculum
-- metadata, and wants capacity configured per programme and cohort because
-- schools may eventually be charged by number of programmes and/or cohort size.
-- Super Admin needs to see what each institution's allocation permits and its
-- current usage.
--
-- Capacity columns are nullable: NULL = unlimited / not configured. Usage is
-- derived (counts of programmes / non-deleted students), never stored.
-- Limits are enforced in Express (server/src/lib/capacity.ts), not Postgres.
-- (0032 was reserved in the SFB plan for a Phase 1 follow-up that wasn't needed.)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS qualification_type TEXT
    CHECK (qualification_type IN ('certificate', 'diploma', 'advanced_diploma', 'apprenticeship', 'short_course', 'other')),
  ADD COLUMN IF NOT EXISTS level            TEXT,
  ADD COLUMN IF NOT EXISTS duration_weeks   INT  CHECK (duration_weeks > 0),
  ADD COLUMN IF NOT EXISTS awarding_body    TEXT,
  ADD COLUMN IF NOT EXISTS start_date       DATE,
  ADD COLUMN IF NOT EXISTS end_date         DATE,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  ADD COLUMN IF NOT EXISTS capacity         INT  CHECK (capacity >= 0);

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_dates_check;
ALTER TABLE public.programmes
  ADD CONSTRAINT programmes_dates_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS capacity INT CHECK (capacity >= 0);

-- One allocation row per institution.
CREATE TABLE IF NOT EXISTS public.institution_subscriptions (
  institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
  plan_name      TEXT,
  max_programmes INT  CHECK (max_programmes >= 0),
  max_students   INT  CHECK (max_students >= 0),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  period_start   DATE,
  period_end     DATE,
  notes          TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).
