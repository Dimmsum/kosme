-- Migration 0035: Employer business profiles
-- Run in Supabase SQL Editor AFTER 0034_service_groups.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY (SFB-6): Super Admin's employer view only had name/phone/status. It needs
-- business name, contact person, location, business type and a verification
-- status. Employers fill their own details in (employer profile page); Super
-- Admin can edit them and sets verification_status.
--
-- "Activity" is derived (shortlist count / last shortlisted), not stored.
-- verification_status is informational for now: it does not gate portfolio
-- access. Suspending an employer uses user_profiles.status (enforced by
-- requireAuth since 0031), not this table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.employer_profiles (
  user_id             UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  business_name       TEXT,
  contact_person      TEXT,
  location            TEXT,
  business_type       TEXT CHECK (business_type IN ('salon', 'spa', 'barbershop', 'mobile_service', 'school_academy', 'agency', 'other')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).
