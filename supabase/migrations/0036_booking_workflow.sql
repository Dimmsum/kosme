-- Migration 0036: Revised booking workflow (SFB-7)
-- Run in Supabase SQL Editor AFTER 0035_employer_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: the client process is built around service requests and bookings, with
-- the person RECEIVING a request being the one who accepts it. Status must say
-- whose response is awaited, and there must be a booking-level "awaiting client
-- confirmation" step after the student finishes the service.
--
--   pending_student               client → student request; the student accepts
--   pending_client                student → client request, or a student's own
--                                 client; the client accepts / confirms
--   confirmed                     both agreed
--   reschedule_requested          a new time is proposed
--   cancelled
--   awaiting_client_confirmation  student stopped the timer; client confirms the
--                                 service took place
--   completed  ("Service Completed")  client confirmed
--
-- Old `pending` is split by who requested it. Old `completed` meant "timer
-- stopped", so it becomes awaiting_client_confirmation unless the client had
-- already confirmed.
--
-- "Add My Client": a student can record their own client (student_clients) who
-- may not have an account yet. appointments.client_id becomes nullable until
-- the client signs up and claims the invite (POST /api/student-clients/claim),
-- at which point their bookings attach to them.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

UPDATE public.appointments SET status = 'pending_student' WHERE status = 'pending' AND requested_by = client_id;
UPDATE public.appointments SET status = 'pending_client'  WHERE status = 'pending';

UPDATE public.appointments a SET status = 'awaiting_client_confirmation'
WHERE a.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.confirmations c WHERE c.service_id = a.service_id AND c.status = 'confirmed'
  );

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check CHECK (status IN (
    'pending_student', 'pending_client', 'confirmed', 'reschedule_requested',
    'cancelled', 'awaiting_client_confirmation', 'completed'
  ));
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'pending_client';

CREATE TABLE IF NOT EXISTS public.student_clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  invite_token   TEXT NOT NULL UNIQUE,
  client_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  claimed_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_clients_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS student_clients_student_idx ON public.student_clients (student_id);
ALTER TABLE public.student_clients ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).

ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS student_client_id UUID REFERENCES public.student_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS own_client        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_has_client_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_has_client_check CHECK (client_id IS NOT NULL OR student_client_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS appointments_student_client_idx ON public.appointments (student_client_id);
