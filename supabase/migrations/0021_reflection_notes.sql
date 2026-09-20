-- Migration 0021: Reflection notes on services (VER-3)
-- Run in Supabase SQL Editor AFTER 0017_service_timer.sql (services table).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY A NEW COLUMN INSTEAD OF RENAMING/REUSING `notes`:
-- `services.notes` (added in 0003_core_tables.sql) is a free-text field the
-- student fills in at LOG time (POST /api/services, see
-- client/app/student/services/page.tsx) describing the service itself — e.g.
-- "client wanted a blunt cut, fine hair". It is actively read as that same
-- "service note" by several other consumers across the app:
--   - server/src/routes/verifications.ts   (educator verify queue)
--   - server/src/routes/confirmations.ts   (volunteer confirmation queue)
--   - client/app/educator/verify/page.tsx
--   - client/app/educator/students/page.tsx
--   - client/app/volunteer/dashboard/page.tsx
--   - client/app/volunteer/confirmations/page.tsx
--   - client/app/admin/portfolios/page.tsx
--   - client/app/admin/submissions/page.tsx
-- Renaming/repurposing it as "reflection notes" would (a) misrepresent that
-- existing data — it is a description of the work, not a reflection on it —
-- and (b) silently break every one of those read sites, which all expect a
-- "notes about the service" field populated at log time.
--
-- Reflection notes are a distinct concept per VER-3: private, student-authored
-- reflection written AFTER the service happened, edited on the service detail
-- page (client/app/student/services/[id]/page.tsx) rather than the initial log
-- form. Different author intent, different point in the workflow — so this
-- gets its own column rather than overloading `notes`.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS reflection_notes TEXT;

COMMENT ON COLUMN public.services.reflection_notes IS
  'Student-authored reflection written after the service occurred, edited on the service detail page. Distinct from `notes`, which is the service description captured at log time.';
