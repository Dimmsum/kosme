-- Migration 0005: Merge user_profiles and user_roles into a single table
-- Run this in your Supabase SQL Editor AFTER 0004_shortlist.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: Having two separate tables (user_profiles and user_roles) forces every
-- query that needs both profile data AND the role to do an extra join or a
-- second round-trip.  Putting `role` directly on `user_profiles` simplifies
-- every route and every RLS policy while keeping one source of truth.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Add role column to user_profiles (FK to public.roles)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT REFERENCES public.roles(id);


-- 2. Back-fill role from user_roles into user_profiles
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.user_profiles p
SET    role = r.role
FROM   public.user_roles r
WHERE  r.user_id = p.id;


-- 3. Replace handle_new_user_profile trigger so it also sets role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN v_role IS NOT NULL AND EXISTS (SELECT 1 FROM public.roles WHERE id = v_role)
      THEN v_role
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The on_auth_user_created_profile trigger already exists (from 0003).
-- Re-declare it to be safe (idempotent).
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


-- 4. Remove the now-redundant user_roles trigger
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();


-- 5. Fix RLS policies that referenced user_roles — update them to use user_profiles.role
-- ─────────────────────────────────────────────────────────────────────────────

-- user_profiles: employer/educator can read student rows
DROP POLICY IF EXISTS "user_profiles_read_by_employer_or_educator" ON public.user_profiles;
CREATE POLICY "user_profiles_read_by_employer_or_educator"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('employer', 'educator')
    )
  );

-- services: educator reads all services awaiting review
DROP POLICY IF EXISTS "services_read_by_educator" ON public.services;
CREATE POLICY "services_read_by_educator"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'educator'
    )
  );

-- services: employer reads verified services for portfolio browse
DROP POLICY IF EXISTS "services_read_verified_by_employer" ON public.services;
CREATE POLICY "services_read_verified_by_employer"
  ON public.services FOR SELECT
  USING (
    status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'employer'
    )
  );

-- service_photos: educator/employer can read photos attached to services they can view
DROP POLICY IF EXISTS "service_photos_read_via_service" ON public.service_photos;
CREATE POLICY "service_photos_read_via_service"
  ON public.service_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id
        AND (
          s.student_id = auth.uid()
          OR s.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('educator', 'employer')
          )
        )
    )
  );

-- confirmations: educator reads all confirmations
DROP POLICY IF EXISTS "confirmations_read_by_educator" ON public.confirmations;
CREATE POLICY "confirmations_read_by_educator"
  ON public.confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'educator'
    )
  );


-- 6. Drop user_roles table (data is now in user_profiles.role)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.user_roles;
