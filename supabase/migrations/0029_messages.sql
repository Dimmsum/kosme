-- Migration 0029: In-app messages between students and volunteer clients (CON-5)
-- Run in Supabase SQL Editor AFTER 0028_appointments.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: students and clients had to swap phone numbers to arrange anything
-- (the accepted-request card showed the volunteer's phone). Messages keep the
-- conversation inside Kosmè.
--
-- DESIGN:
--   * A thread is the (student_id, client_id) pair, so there is no threads
--     table: `sender_id` is always one of the two.
--   * `read_at` is set when the recipient opens the thread; unread counts are
--     rows addressed to the caller with `read_at IS NULL`.
--   * New messages reach the other side by polling the API, so there is no
--     realtime subscription and the client never talks to Supabase directly.
--
-- RLS: enabled with no policies, service-role access only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messages_sender_in_thread CHECK (sender_id IN (student_id, client_id))
);

CREATE INDEX IF NOT EXISTS messages_thread_idx ON public.messages (student_id, client_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
