-- Migration 0031: School Admin role + role-specific user fields + soft delete
-- Run in Supabase SQL Editor AFTER 0030_client_journey.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: stakeholder feedback asks for a School Admin role (scoped to one
-- institution via user_profiles.institution_id), role-specific management
-- fields, and a way to deactivate vs. permanently remove an account while
-- retaining verified records. Like super_admin, school_admin is provisioned by
-- seed script only — never via the public /signup form.
--
-- Deleted accounts are anonymised in place (status = 'deleted'), not removed:
-- services/verifications reference user_profiles(id) and must be retained.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (id, label) VALUES
  ('school_admin', 'School Admin')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS student_id   TEXT,
  ADD COLUMN IF NOT EXISTS staff_id     TEXT,
  ADD COLUMN IF NOT EXISTS access_level TEXT
    CHECK (access_level IN ('view', 'manage')),
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_status_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_status_check
  CHECK (status IN ('active', 'suspended', 'deactivated', 'deleted'));

-- Programmes a school admin may administer (NULL/empty = whole institution).
CREATE TABLE IF NOT EXISTS public.school_admin_programmes (
  admin_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, programme_id)
);
ALTER TABLE public.school_admin_programmes ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).
