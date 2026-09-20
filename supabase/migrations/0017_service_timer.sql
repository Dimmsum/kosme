-- Migration 0017: Service type + start/stop timer (MVP #3 — Phase 3 logging, Phase 4 partial)
-- Run in Supabase SQL Editor AFTER 0015_admin_control_centre.sql (needs service_types).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: MVP item #3 wires the Phase-2 service catalog into the student log flow and
-- adds a server-authoritative start/stop timer. A student picks a service_type
-- (which carries recommended_duration_min/max from 0015), starts the service, and
-- stops it — the elapsed minutes are computed server-side and compared against the
-- recommended range to tag the service under | within | over (the Phase-4-partial
-- bit that later feeds educator alerts).
--
-- Timer model is server-authoritative: started_at lives in the DB and status moves
-- to 'in_progress' on start, so a running service survives a refresh or a device
-- switch. actual_duration_min / duration_tag are only written on stop.
--
-- RLS: services already has its 0003 policies; nothing new here since every server
-- route reads/writes through the service-role client (see 0014/0015 header notes).
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. New columns on services
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_type_id     UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_duration_min INT,
  ADD COLUMN IF NOT EXISTS duration_tag        TEXT
                                               CHECK (duration_tag IN ('under', 'within', 'over'));


-- 2. Allow the new 'in_progress' status (a service being timed, pre-submission)
-- ─────────────────────────────────────────────────────────────────────────────
-- The inline CHECK from 0003 is named services_status_check by Postgres. Drop and
-- recreate it with the extra value. IF EXISTS keeps this safe on partial re-runs.
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN ('in_progress', 'awaiting_client', 'awaiting_educator', 'verified', 'rejected'));
