# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kosmè is a cosmetology education platform: students log practical services,
educators verify them, verified work becomes an employer-facing portfolio.
Three-part monorepo:

- `client/` — Next.js 14 (App Router) + TypeScript + Tailwind, deployed on Vercel. Public marketing site plus five authenticated role apps (student, educator, volunteer client, employer, super admin).
- `server/` — Express + TypeScript API (`tsx` in dev, compiled with `tsc` for prod). All DB access goes through here — the client never talks to Supabase directly for role data.
- `supabase/migrations/` — numbered, sequential SQL migrations (`0002`...`0021`). No ORM; Supabase JS client (`@supabase/supabase-js`) with hand-written queries.

Auth is Clerk. Clerk is the identity provider; `public.user_profiles.role` in
Postgres is the **source of truth for authorization**, fetched server-side —
never trust `Clerk.publicMetadata.role` for access control, only as a
fallback display value.

## Commands

Run from repo root unless noted.

```bash
npm run install:all      # installs root + client + server deps
npm run dev               # runs client (:3000) and server (:3001) concurrently
npm run dev:client        # client only — cd client && npm run dev
npm run dev:server        # server only — cd server && npm run dev (tsx watch)
npm run build:client       # cd client && npm run build
npm run build:server       # cd server && npm run build (tsc)
```

Inside `client/`: `npm run lint` (`next lint`), `npm run start` (serve built output).
Inside `server/`: `npm start` (run compiled `dist/index.js` after `npm run build`).

One-off scripts (from `server/`, need env vars set — see `server/.env.example`):
```bash
npm run seed:demo          # creates the 4 seeded demo accounts (idempotent upsert)
npm run seed:super-admin   # SUPER_ADMIN_EMAIL/PASSWORD/NAME env vars — only way to provision super_admin
```

There is no test suite configured in this repo (no Jest/Vitest/Playwright) — don't invent test commands.

Env vars: `server/.env.example` and `client/.env.example` list what's required (Supabase URL/anon/service-role keys, Clerk secret key, `NEXT_PUBLIC_API_URL`, `ALLOWED_ORIGINS`).

## Architecture

### Auth & authorization flow

1. Client authenticates via Clerk (`client/lib/auth-context.tsx` wraps `@clerk/nextjs`).
2. `client/middleware.ts` (`clerkMiddleware`) only checks *signed in vs. not* — the public-route list (`/`, `/login`, `/signup`, `/students`, `/educators`, `/clients`, `/employers`, `/demo`) is the only routing gate at this layer.
3. Per-role access is enforced **twice**, independently:
   - **Client-side (UX only):** every role's `app/<role>/layout.tsx` calls `useAuth()`, redirects to `/login` if unauthenticated and to `ROLE_DASHBOARD[role]` if the logged-in role doesn't match the section (see `client/app/student/layout.tsx`).
   - **Server-side (real enforcement):** every protected route in `server/src/index.ts` is mounted behind `requireAuth` (verifies the Clerk JWT, looks up `user_profiles` by `clerk_id` to get the internal UUID + `role` + `is_demo`) and, where needed, `requireRole(...roles)` (`server/src/middleware/auth.ts`). `/api/admin/*` is the one route group additionally gated with `requireRole("super_admin")` at the mount point in `index.ts`.
4. `role` is looked up fresh from `user_profiles` on every request in `requireAuth` — there is no session-cached role server-side.
5. All server DB access uses `supabaseAdmin` (service-role key, bypasses RLS) — see `server/src/lib/supabase.ts`. RLS is enabled on tables but **no policies are defined**; authorization is enforced entirely in Express middleware, not Postgres. This is a deliberate, documented decision (see migration `0014_admin_role.sql` and `docs/ROADMAP.md` Phase 1) — don't add RLS policies without revisiting that decision, and don't assume RLS protects anything.
6. `client/lib/api.ts`'s `apiGet/apiPost/apiPatch/apiPut/apiUpload/apiDelete` attach the Clerk bearer token to every request and dispatch a `session-expired` event on a 401. `auth-context.tsx` listens for that event but **re-verifies the Clerk session is actually gone before signing out** — a 401 can be a transient/server-side auth failure, not real session expiry. Preserve this check if touching either file.

### Server structure (`server/src`)

- `index.ts` — single Express app; owns CORS (explicit allow-list + a regex for `kosme-*.vercel.app` preview deploys), three-tier rate limiting (global/auth/upload/demo, `express-rate-limit`), and every route mount with its auth middleware. This is the map of what's public vs. protected — check it before assuming a route's auth requirements.
- `routes/` — one file per resource, flat except `routes/admin/` (one file per admin module: `institutions`, `programmes`, `cohorts`, `service-catalog`, `educator-assignments`, `users`, `clients`, `employers`, `submissions`, `flags`, `audit`, `portfolios`, `settings`), aggregated by `routes/admin/index.ts`.
- `middleware/auth.ts` — `requireAuth`, `requireRole`.
- `lib/supabase.ts` — the two Supabase clients (anon vs. service-role — service-role is what routes actually use).
- `lib/audit.ts` — every admin mutation writes an `audit_log` row through this; reuse it for any new admin write rather than inserting into `audit_log` directly.
- `lib/validation.ts` — shared UUID validation used across admin routes.
- `scripts/` — the two seed scripts (demo accounts, super admin), the only provisioning paths for those account types.

### Client structure (`client/app`)

- Route groups per role: `student/`, `educator/`, `volunteer/`, `employer/`, `admin/` are the **authenticated dashboards**; `students/`, `educators/`, `clients/`, `employers/` (note plural/singular split) are **public marketing pages** for each audience. This split is intentional but undocumented in code — `docs/ISSUES.md`'s `CLN-1` tracks auditing/clarifying it further. When adding a page, check which pair you actually mean.
- Each authenticated role has its own `layout.tsx` doing the auth-gate + nav-shell pattern described above — copy that pattern for any new role-scoped page rather than re-deriving auth logic.
- `lib/auth-context.tsx` — the `AuthProvider`/`useAuth()` hook, `UserRole` type, `ROLE_DASHBOARD` map. `normalizeRole()` maps the legacy `"volunteer"` role value to `"client"` — keep this alias when touching role logic.
- `lib/api.ts` — the only sanctioned way to call the API from client components (handles the bearer token + 401 handling described above).
- `lib/supabase.ts` — anon-key Supabase client, used client-side only for a handful of read queries (e.g. `service_categories` lookups) that don't need server enforcement.
- `components/admin/` — shared primitives for every admin module page (`AdminHeader`, `Modal`, `ConfirmDialog`, `DataStates`, `FormControls`) — extend these instead of rebuilding form/modal/loading-state markup per module.
- `middleware.ts` — Clerk route protection, public-route allow-list (see above).

### Demo mode

`is_demo` boolean on `user_profiles`/`services` (trigger-synced) fully
partitions demo accounts from real ones: demo accounts only ever see
demo-flagged records and vice versa, enforced per-route (`dashboard.ts`,
`verifications.ts`, `portfolio.ts`, `services.ts` filter on `is_demo` — not
RLS, since these use the service-role client). `super_admin` is excluded from
demo mode by a DB `CHECK` constraint (`demo_accounts.role <> 'super_admin'`)
— there is no demo super admin, by design. See `README.md` for the full
login-ticket flow (`POST /api/demo/login` issues a short-lived Clerk sign-in
token; no shared password is ever exposed).

### Database migrations

`supabase/migrations/*.sql`, strictly sequential and numbered — never
renumber or edit a shipped migration; add a new one. Check the existing
numbering (`0021` is latest as of this writing) before adding the next.
Several migrations exist purely to add one column with a `CHECK` constraint
rather than reusing/overloading an existing column (e.g. `reflection_notes`
vs. `notes`, `client_source`, `duration_tag`) — follow that convention:
prefer a new, precisely-named column over repurposing one that existing
queries already depend on.

## Working from the tracker docs

- **`docs/ISSUES.md`** is the single live tracker for outstanding and
  completed feature work — check it before starting any feature-shaped task
  to see if it's already scoped as an issue (with an ID like `VER-4`,
  `ALT-2`), what it depends on, and which files it touches. When you finish
  an issue, check it off (`- [ ]` → `- [x]`) in the same turn and add a
  one-line note on what was built and where (file paths/routes) — follow the
  existing entries' format exactly, they're the convention. If a listed item
  turns out to already exist or isn't needed, say so inline rather than
  deleting the line. New issues should scope a thin tracer-bullet slice
  (schema + backend + frontend together) rather than a full backend pass
  followed by a separate frontend pass — split by feature/behavior, not by
  layer, matching every existing entry.
- **`docs/ROADMAP.md`** is superseded/historical only — the original
  phase-level breakdown with the reasoning behind early decisions (RLS
  approach, demo-mode scoping). Useful for *why* something was built a
  certain way, but never treat it as current status or an open-work list;
  `docs/ISSUES.md` wins on anything both files touch.
- **`docs/DESIGN_RULES.md`** is the frontend design system reference (colors,
  type, spacing, radius/shadow, motion, component-reuse rules), derived from
  the current `client/` code. Follow it for any new or changed UI in
  `client/` so new work matches the existing visual language — check it
  before hand-rolling button/card/badge/modal markup, and update it in the
  same PR if a change deliberately shifts the system it describes.
