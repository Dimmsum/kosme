-- Migration 0022: General reusable consent-record model (CON-1)
-- Run in Supabase SQL Editor AFTER 0019_client_source.sql.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: `client_signups.photo_consent` (0012) only exists for the Kosmè-sourced
-- volunteer signup path. VER-1's `services.client_source` (0019) established
-- that a logged service's client can come from 5 other sources
-- (friend_family, school_assigned, walk_in_client_day, salon_placement,
-- other) that have no `client_signups` row to hang consent off of at all.
-- POR-2 needs one place to check "was photo/detail consent captured for this
-- client" regardless of source, so this introduces a single polymorphic
-- table instead of bolting a second boolean onto another table.
--
-- DESIGN: `subject_type`/`subject_id` (not a single FK) because the subject
-- can be a `client_signups` row (consent captured at signup time, before any
-- service exists) or, for sources with no signup record, a `services` row
-- directly (consent captured by the student at log time — wiring the log
-- form itself is POR-2's job, not this migration's). `subject_type` is a
-- plain TEXT + CHECK, matching the `client_source`/`duration_tag`/`status`
-- convention elsewhere in this schema.
--
-- `client_signups.photo_consent` is NOT dropped here — existing reads of it
-- (client-signup admin views) keep working unchanged; it now also gets
-- mirrored into a `consent_records` row by `server/src/routes/client-signup.ts`
-- so `consent_records` is the canonical read path going forward.
--
-- BACKFILL: one `consent_records` row per existing `client_signups` row.
--
-- RLS: consent_records is server-role-only, same pattern as client_signups
-- (0012) — no client ever reads/writes it directly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.consent_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('client_signup', 'service')),
  subject_id    UUID NOT NULL,
  photo_consent BOOLEAN NOT NULL,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_type, subject_id)
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.consent_records
  USING (false)
  WITH CHECK (false);

-- Backfill: one row per existing client_signups submission.
INSERT INTO public.consent_records (subject_type, subject_id, photo_consent, captured_at)
SELECT 'client_signup', id, photo_consent, created_at
FROM public.client_signups
ON CONFLICT (subject_type, subject_id) DO NOTHING;
