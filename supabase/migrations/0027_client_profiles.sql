-- Migration 0027: Volunteer client profiles + availability (CON-3)
-- Run in Supabase SQL Editor AFTER 0026_single_active_timer.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: students had no way to see who a volunteer client is, what services
-- they will receive, or when they are free. That information only existed on
-- the anonymous `client_signups` form (0012), which has no link to a client's
-- user account. This gives each client user a profile students can browse.
--
-- DESIGN:
--   * One row per client user (`user_id` is the primary key), not columns on
--     `user_profiles`, which every role shares.
--   * `services_willing` holds `service_categories.id` values (TEXT keys).
--   * `availability` is JSONB: [{ "day": "mon", "from": "09:00", "to": "13:00" }].
--     The API validates the shape; weekly windows are all the booking flow
--     needs, so there is no separate slots table.
--   * `is_listed` lets a client hide from the student directory.
--   * No `is_demo` column: the directory joins `user_profiles.is_demo`, so
--     demo and real clients stay partitioned without a second copy to sync.
--
-- RLS: enabled with no policies, service-role access only (see CLAUDE.md).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_profiles (
  user_id           UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  bio               TEXT,
  location          TEXT,
  willing_to_travel BOOLEAN NOT NULL DEFAULT FALSE,
  services_willing  TEXT[] NOT NULL DEFAULT '{}',
  availability      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_listed         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS client_profiles_set_updated_at ON public.client_profiles;
CREATE TRIGGER client_profiles_set_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
