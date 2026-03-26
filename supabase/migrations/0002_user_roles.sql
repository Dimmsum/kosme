-- Migration 0002: Role-based access control
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Roles lookup table — single source of truth for valid roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (id, label) VALUES
  ('student',  'Student'),
  ('educator', 'Educator / Lecturer'),
  ('client',   'Volunteer Client'),
  ('employer', 'Employer / Salon Owner')
ON CONFLICT (id) DO NOTHING;


-- 2. User roles table — links each auth user to exactly one role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL REFERENCES public.roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read the roles list
-- This lets the signup page fetch available roles without a session
CREATE POLICY "roles_readable_by_all"
  ON public.roles FOR SELECT
  USING (true);

-- Users can only read their own role row
CREATE POLICY "user_roles_readable_by_owner"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);


-- 4. Trigger: auto-insert role into user_roles when a new auth user is created
-- Reads the role from raw_user_meta_data (set via options.data in signUp calls)
-- Silently skips if the role is missing or not in the roles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';

  IF v_role IS NOT NULL AND EXISTS (SELECT 1 FROM public.roles WHERE id = v_role) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop first so migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
