-- ALT-1: event model for the educator activity feed + priority alerts.
--
-- Decision: one `events` table, not a reuse of `alerts` and not two separate
-- tables.
--
--   * `alerts` (migration 0016) is admin-authored broadcast messages —
--     manually created/edited, audience is a whole role, has a manual
--     active toggle. Timer/confirmation events are system-generated, scoped
--     to one student/service, and fire automatically. Different shape,
--     different lifecycle — reusing `alerts` would overload it with rows it
--     was never designed to hold (see CLAUDE.md's convention of a new
--     column/table over repurposing one existing queries depend on).
--   * A single `events` table (not two) because activity-feed and
--     priority-alert rows share every column (actor, service, message,
--     timestamp) and differ only in urgency — `tier` is a filter, not a
--     schema difference. This lets a future "everything for this student"
--     view union both tiers for free.
--
-- Tiers (ALT-2/ALT-3/ALT-4 build on this):
--   activity  — non-urgent: service_started, service_stopped
--   priority  — needs educator attention: duration_over, duration_under,
--               confirmation_completed, ready_for_verification
--
-- Priority rows are dismissible per-educator (`acknowledged_at`/`_by`) so
-- the bell badge count can go down; activity rows are not (it's a log, not
-- an inbox).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier            TEXT NOT NULL CHECK (tier IN ('activity', 'priority')),
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'service_started',
                    'service_stopped',
                    'duration_over',
                    'duration_under',
                    'confirmation_completed',
                    'ready_for_verification'
                  )),
  student_id      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES public.services(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  is_demo         BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_feed_idx ON public.events (tier, created_at DESC);
CREATE INDEX IF NOT EXISTS events_student_idx ON public.events (student_id, created_at DESC);

-- Denormalized is_demo, auto-populated from the acting student — same
-- pattern as services.is_demo (migration 0013's set_service_is_demo).
CREATE OR REPLACE FUNCTION public.set_event_is_demo()
RETURNS TRIGGER AS $$
BEGIN
  SELECT is_demo INTO NEW.is_demo
  FROM public.user_profiles
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS events_set_is_demo ON public.events;
CREATE TRIGGER events_set_is_demo
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_is_demo();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only, same as every other admin/ops
-- table in this schema (see CLAUDE.md: authorization is enforced in Express
-- middleware, not Postgres).
