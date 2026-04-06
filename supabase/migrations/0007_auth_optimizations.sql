-- Migration 0007: Auth optimisations
-- Run in Supabase SQL Editor AFTER 0006_storage_service_photos.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY:
--   1. The handle_new_user_profile trigger used ON CONFLICT DO NOTHING, so if a
--      profile row exists but role is NULL (e.g. created before migration 0005),
--      a new sign-up attempt would leave the role unset.  Fixed to DO UPDATE.
--   2. Added get_my_role() RPC so the client can retrieve the authoritative role
--      in a single fast function call instead of a full table SELECT when the
--      JWT user_metadata lacks a role (legacy accounts).
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Fix handle_new_user_profile: update role + full_name if they were missing
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
  ON CONFLICT (id) DO UPDATE
    SET role      = COALESCE(EXCLUDED.role,      public.user_profiles.role),
        full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. Fast RPC for role lookup — used as fallback when JWT metadata has no role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
