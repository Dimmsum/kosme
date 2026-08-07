-- Migration 0015: Admin Control Centre (Phase 2)
-- Run in Supabase SQL Editor AFTER 0014_admin_role.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: Phase 2 of docs/ROADMAP.md gives the Super Admin the structural data that
-- every later phase depends on — institutions → programmes → cohorts, a service
-- catalog (categories → types with recommended durations & required hours), and
-- educator-to-cohort assignments. This migration adds the missing tables and
-- extends existing ones; the CRUD API lives in server/src/routes/admin/*.
--
-- What already existed (0003, 0010) and is only EXTENDED here, not recreated:
--   institutions, programmes, service_categories, user_profiles.
-- New in this migration: cohorts, service_types, educator_assignments.
--
-- RLS decision: same as 0014 — every server route reads/writes through the
-- Supabase service-role client (bypasses RLS entirely) and authorization is
-- enforced in Express (requireRole("super_admin")), not in Postgres policies.
-- New admin-only tables therefore ENABLE ROW LEVEL SECURITY with NO policies
-- (mirroring public.demo_accounts in 0013). Revisit only if a client-side anon
-- key ever needs to read these tables directly — nothing in this codebase does.
--
-- The `status` column added to user_profiles is a DB-level active/suspended flag
-- used by the admin users route. Clerk-level session banning is intentionally
-- out of scope for this stage (possible follow-up).
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Extend institutions with contact info + active flag
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true;


-- 2. Extend programmes with a description
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS description TEXT;


-- 3. Cohorts (belong to programmes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cohorts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  start_date   DATE,
  end_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see header).


-- 4. Service types (belong to a service_category lookup row)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_types (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id              TEXT NOT NULL REFERENCES public.service_categories(id),
  name                     TEXT NOT NULL,
  recommended_duration_min INT,
  recommended_duration_max INT,
  required_practical_hours INT  NOT NULL DEFAULT 0,
  required_practical_count INT  NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see header).


-- 5. Educator assignments (educator ↔ cohort)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.educator_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cohort_id   UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (educator_id, cohort_id)
);

ALTER TABLE public.educator_assignments ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see header).


-- 6. Extend user_profiles: programme/cohort placement + active/suspended status
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cohort_id    UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'suspended'));
