-- Migration 0011: Switch user_profiles to Clerk authentication
-- Run in Supabase SQL Editor AFTER 0010_category_max_required.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: user_profiles.id was a FK to auth.users (Supabase Auth).
-- The app now uses Clerk for auth, so users never appear in auth.users.
-- We need to:
--   1. Break the FK so id can be any UUID (not tied to auth.users).
--   2. Give id a gen_random_uuid() default so the server upsert can omit it.
--   3. Add a clerk_id column as the new unique identity key.
--   4. Remove the auth.users trigger that is now dead code.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Drop the old FK constraint linking id to auth.users
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;


-- 2. Give id a default so inserts that omit it still get a UUID
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- 3. Add clerk_id column (the stable Clerk user identifier, e.g. "user_abc123")
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS clerk_id TEXT;

-- Back-fill: existing rows will have NULL clerk_id (no Clerk user exists for them).
-- New rows inserted via /api/auth/sync will always have it set.

-- Unique index so the upsert ON CONFLICT (clerk_id) works correctly.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_clerk_id_key
  ON public.user_profiles (clerk_id)
  WHERE clerk_id IS NOT NULL;


-- 4. Drop the Supabase-Auth trigger — Clerk handles sign-up now
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
