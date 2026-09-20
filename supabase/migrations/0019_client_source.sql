-- Migration 0019: client_source on services (VER-1)
-- Run in Supabase SQL Editor AFTER 0017_service_timer.sql.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: VER-0a explicitly deferred capturing *who* the client actually was
-- (friend/family, a school-assigned client, a walk-in on a client day, a salon
-- placement, a Kosmè-sourced volunteer, or something else) out of the original
-- timer slice. It's needed now so downstream work (CON-1's consent model,
-- reporting) has a source to key off regardless of whether a `client_id` row
-- exists — a friend/family or walk-in service has no `client_signups`/
-- `user_profiles` row to link to, so this can't be derived from `client_id`.
--
-- Same convention as `duration_tag` (0017) and `status` (0003): a plain TEXT
-- column with a CHECK constraint rather than a Postgres ENUM type, so adding a
-- value later is just DROP/ADD CONSTRAINT, not ALTER TYPE.
--
-- BACKFILL: existing rows predate this field and have no real source to
-- record. Add the column with a default of 'other' so the NOT NULL can be
-- applied in the same migration (matches how `status` (0003) and
-- `duration_tag`-adjacent columns default rather than requiring a separate
-- backfill pass), then drop the default so every future insert must pass an
-- explicit value — enforced app-side in `server/src/routes/services.ts`.
--
-- RLS: services already has its 0003 policies; nothing new here since every
-- server route reads/writes through the service-role client (see 0014/0015
-- header notes).
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. New column on services, backfilled to 'other' then locked to NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS client_source TEXT NOT NULL DEFAULT 'other';

ALTER TABLE public.services
  ALTER COLUMN client_source DROP DEFAULT;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_client_source_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_client_source_check
  CHECK (client_source IN (
    'friend_family',
    'school_assigned',
    'walk_in_client_day',
    'salon_placement',
    'kosme_volunteer',
    'other'
  ));
