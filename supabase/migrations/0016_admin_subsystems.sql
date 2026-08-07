-- Migration 0016: Admin subsystems — audit trail, flags, alerts, settings
-- Run in Supabase SQL Editor AFTER 0015_admin_control_centre.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: The Super Admin dashboard modules for Audit Trail, Flagged Issues, Alerts,
-- and Settings need backing storage. These are admin-only subsystems written and
-- read exclusively through the Express service-role client behind
-- requireRole("super_admin"), so — per the 0014/0015 decision — every table here
-- ENABLEs ROW LEVEL SECURITY with NO policies (service-role bypasses RLS;
-- authorization is enforced in Express, not Postgres).
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. audit_log — append-only record of admin actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,          -- e.g. 'create', 'update', 'delete', 'suspend'
  entity_type TEXT NOT NULL,          -- e.g. 'institution', 'user', 'service_type'
  entity_id   TEXT,                   -- id of the affected row (TEXT: some PKs are text)
  metadata    JSONB,                  -- arbitrary context (changed fields, names, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log (entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only.


-- 2. flags — issues raised against any entity, resolved by an admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_by  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS flags_status_idx ON public.flags (status, created_at DESC);

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only.


-- 3. alerts — admin-authored notices, optionally targeted at one role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_role TEXT REFERENCES public.roles(id),  -- NULL = everyone
  title         TEXT NOT NULL,
  body          TEXT,
  severity      TEXT NOT NULL DEFAULT 'info'
                CHECK (severity IN ('info', 'warning', 'critical')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alerts_active_idx ON public.alerts (active, created_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only.


-- 4. app_settings — key/value platform configuration & feature flags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only.

-- Seed the KAI feature flag (roadmap Phase 7 — assistive AI surfaces, off by default).
INSERT INTO public.app_settings (key, value) VALUES
  ('kai_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
