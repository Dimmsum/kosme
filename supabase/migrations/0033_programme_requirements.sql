-- Migration 0033: Programme requirements, reusable templates, effective dating
-- Run in Supabase SQL Editor AFTER 0032_programme_capacity.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY (SFB-3): "Required Count" / "Required Hours" must not live permanently on
-- the master service. They differ by programme, institution and curriculum
-- version, so they move to programme_requirements. The master catalogue keeps
-- the service itself and its recommended duration.
--
-- A programme's requirements are stored as dated SETS: every row sharing a
-- (programme_id, effective_from) belongs to one snapshot. A cohort uses the
-- latest set whose effective_from <= the cohort's start date, so a curriculum
-- change dated in the future never alters existing cohorts (resolved in
-- server/src/lib/requirements.ts).
--
-- scope:
--   programme → minimum practical hours for the whole programme (required_hours)
--   category  → count and/or hours for a service category (category_id)
--   service   → count and/or hours for one master service (service_type_id)
--
-- Legacy columns service_categories.max_required and
-- service_types.required_practical_* are KEPT as a fallback for students with no
-- programme (incl. demo accounts) and for programmes with no set yet. They are
-- no longer editable in the Service Catalogue UI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.programme_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id    UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  scope           TEXT NOT NULL CHECK (scope IN ('programme', 'category', 'service')),
  category_id     TEXT REFERENCES public.service_categories(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  required_count  INT CHECK (required_count >= 0),
  required_hours  INT CHECK (required_hours >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT programme_requirements_shape_check CHECK (
    (scope = 'programme' AND category_id IS NULL AND service_type_id IS NULL) OR
    (scope = 'category'  AND category_id IS NOT NULL AND service_type_id IS NULL) OR
    (scope = 'service'   AND service_type_id IS NOT NULL AND category_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS programme_requirements_unique
  ON public.programme_requirements (programme_id, effective_from, scope, COALESCE(category_id, ''), COALESCE(service_type_id::text, ''));
CREATE INDEX IF NOT EXISTS programme_requirements_lookup
  ON public.programme_requirements (programme_id, effective_from);

CREATE TABLE IF NOT EXISTS public.programme_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.programme_template_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES public.programme_templates(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL CHECK (scope IN ('programme', 'category', 'service')),
  category_id     TEXT REFERENCES public.service_categories(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  required_count  INT CHECK (required_count >= 0),
  required_hours  INT CHECK (required_hours >= 0),
  CONSTRAINT template_requirements_shape_check CHECK (
    (scope = 'programme' AND category_id IS NULL AND service_type_id IS NULL) OR
    (scope = 'category'  AND category_id IS NOT NULL AND service_type_id IS NULL) OR
    (scope = 'service'   AND service_type_id IS NOT NULL AND category_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS template_requirements_unique
  ON public.programme_template_requirements (template_id, scope, COALESCE(category_id, ''), COALESCE(service_type_id::text, ''));

-- The template a programme was last created/updated from (informational; a
-- programme's own set may then be varied independently).
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.programme_templates(id) ON DELETE SET NULL;

ALTER TABLE public.programme_requirements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_template_requirements ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).

-- Backfill: give every existing programme the requirements students were
-- already working to (the global catalogue values), dated far in the past so
-- all existing cohorts keep them. Idempotent via the unique index.
INSERT INTO public.programme_requirements (programme_id, effective_from, scope, category_id, required_count)
SELECT p.id, DATE '1900-01-01', 'category', c.id, c.max_required
FROM public.programmes p CROSS JOIN public.service_categories c
WHERE c.max_required > 0
ON CONFLICT DO NOTHING;

INSERT INTO public.programme_requirements (programme_id, effective_from, scope, service_type_id, required_count, required_hours)
SELECT p.id, DATE '1900-01-01', 'service', t.id,
       NULLIF(t.required_practical_count, 0), NULLIF(t.required_practical_hours, 0)
FROM public.programmes p CROSS JOIN public.service_types t
WHERE t.required_practical_count > 0 OR t.required_practical_hours > 0
ON CONFLICT DO NOTHING;
