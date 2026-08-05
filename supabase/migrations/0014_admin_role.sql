-- Migration 0014: Super Admin role
-- Run in Supabase SQL Editor AFTER 0013_demo_accounts.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: Phase 1 of docs/ROADMAP.md needs a working Super Admin login. Roles
-- are DB-driven (public.roles + user_profiles.role), so adding the role here
-- is the only schema change required to unlock it.
--
-- RLS decision: every existing server route reads/writes through
-- supabaseAdmin (the Supabase service-role client), which already bypasses
-- RLS entirely — authorization for every role in this app is enforced in
-- Express route middleware (requireRole), not in Postgres policies. We are
-- deliberately NOT adding a "super_admin bypasses RLS" policy per table here:
-- it would be dead weight (never evaluated by the service-role client) and
-- would only matter if a client-side Supabase key ever queried these tables
-- directly, which nothing in this codebase does. If that changes, revisit.
--
-- IMPORTANT: super_admin is intentionally excluded from the self-service
-- signup role list (server/src/routes/auth.ts validRoles) — an account can
-- only become super_admin via server/src/scripts/seed-super-admin.ts (direct
-- Clerk + DB provisioning), never through the public /signup form. It is
-- also excluded from demo_accounts by a CHECK constraint (0013) — the demo
-- login can never grant admin access.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (id, label) VALUES
  ('super_admin', 'Super Admin')
ON CONFLICT (id) DO NOTHING;
