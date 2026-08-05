-- Migration 0013: Demo accounts
-- Run in Supabase SQL Editor AFTER 0012_client_signups.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: We need a frictionless "browse as student / educator / client / employer"
-- demo login for onboarding, events, and general exploration — without ever
-- exposing real user data to anonymous demo visitors, and without ever letting
-- a demo account be the super_admin role. This migration adds:
--   1. An is_demo flag on user_profiles (and a denormalized copy on services,
--      kept in sync by trigger) so app routes can cheaply filter demo data
--      out of real users' views and vice versa.
--   2. A demo_accounts table mapping each demo-enabled role to exactly one
--      seeded Clerk user (populated by server/src/scripts/seed-demo-accounts.ts,
--      not by hand).
--   3. A minimal demo institution/programme so seeded demo profiles have
--      realistic-looking context to browse.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. is_demo flag on user_profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;


-- 2. is_demo flag on services, auto-populated from the logging student
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_service_is_demo()
RETURNS TRIGGER AS $$
BEGIN
  SELECT is_demo INTO NEW.is_demo
  FROM public.user_profiles
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS services_set_is_demo ON public.services;
CREATE TRIGGER services_set_is_demo
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_service_is_demo();


-- 3. demo_accounts — one seeded Clerk account per demo-enabled role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_accounts (
  role          TEXT PRIMARY KEY REFERENCES public.roles(id),
  clerk_user_id TEXT NOT NULL UNIQUE,
  user_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Belt-and-braces: a demo account must never be super_admin, even if that
  -- role is added to public.roles later (Phase 1 admin work).
  CONSTRAINT demo_accounts_no_super_admin CHECK (role <> 'super_admin')
);

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;
-- No policies added — this table is only ever read by the server via the
-- service-role client (see server/src/routes/demo.ts), never by anon/authenticated
-- clients directly.


-- 4. Minimal demo institution/programme for seeded profiles to belong to
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.institutions (id, name)
VALUES ('00000000-0000-0000-0000-00000000d1de', 'Kosmè Demo Academy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.programmes (id, institution_id, name, required_services_count)
VALUES (
  '00000000-0000-0000-0000-00000000d2de',
  '00000000-0000-0000-0000-00000000d1de',
  'Demo Cosmetology Programme',
  10
)
ON CONFLICT (id) DO NOTHING;
