-- Migration 0028: Appointments between students and volunteer clients (CON-4)
-- Run in Supabase SQL Editor AFTER 0027_client_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: nothing held a planned service. `services` rows describe work that is
-- running or done, so a student who agreed a time with a volunteer had
-- nowhere to record it, and no way to start the timer from the booking.
--
-- DESIGN:
--   * `status` is TEXT + CHECK, matching the other status columns:
--     pending | confirmed | reschedule_requested | cancelled | completed.
--     A client declining a request is `cancelled` with `cancelled_by` set.
--   * A reschedule is a proposal on the same row (`proposed_starts_at`,
--     `proposed_by`), not a second appointment. The other party accepts it
--     (the proposal becomes `starts_at`) or declines it. `confirmed_at` records
--     whether the appointment was ever confirmed, so declining a reschedule of
--     a confirmed booking returns it to `confirmed`, while declining a
--     counter-offer on a never-confirmed one cancels it.
--   * `service_id` links the booking to the `services` row created when the
--     student starts the timer from it (CON-6). It is UNIQUE so one booking
--     yields at most one service.
--   * `service_name` is stored as typed because a booking can name a practical
--     that is not a catalog `service_types` row.
--   * No `is_demo` column: both users are checked to be on the same side of the
--     demo boundary when the booking is created.
--
-- RLS: enabled with no policies, service-role access only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  category_id        TEXT NOT NULL REFERENCES public.service_categories(id),
  service_type_id    UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL,
  starts_at          TIMESTAMPTZ NOT NULL,
  est_duration_min   INTEGER NOT NULL CHECK (est_duration_min BETWEEN 15 AND 480),
  location           TEXT NOT NULL,
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'reschedule_requested', 'cancelled', 'completed')),
  proposed_starts_at TIMESTAMPTZ,
  proposed_by        UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  confirmed_at       TIMESTAMPTZ,
  cancelled_by       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  service_id         UUID UNIQUE REFERENCES public.services(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_student_idx ON public.appointments (student_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_client_idx ON public.appointments (client_id, starts_at);

DROP TRIGGER IF EXISTS appointments_set_updated_at ON public.appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
