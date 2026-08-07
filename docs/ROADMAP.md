# Kosmè Platform Roadmap

Source: internal "next steps" email, broken into phases and mapped onto the
current codebase (Next.js 14 client w/ Clerk auth, Express API server,
Supabase/Postgres). Status column tracks what already exists vs. what's new
work.

**Legend:** ✅ exists · 🔶 partially exists · ⬜ not started

> **Maintenance instruction (for the AI / whoever picks up this file):**
> This roadmap is a living checklist, not a one-time snapshot. Whenever you
> finish a work item from this document, **update this file in the same
> turn**: flip its `⬜` to `✅` (or `🔶` if only partially done), add a short
> note on *what* was built and *where* (file paths, routes), and update the
> phase's "Current state" section and the MVP list entry if it's on that
> list. Don't wait to be asked — treat "done" as including the roadmap edit.
> If a work item turns out to already exist or to not be needed, say so
> inline rather than deleting the line, so the history of the decision isn't lost.

---

## Phase 1 — Super Admin Login & Dashboard Access (URGENT)

**Goal:** A working Super Admin can log in and reach a dashboard shell today.

### Current state
- Roles are DB-driven: `public.roles` lookup table + `user_profiles.role`
  (`supabase/migrations/0002_user_roles.sql`, `0005_merge_profile_role.sql`,
  `0014_admin_role.sql`). Current roles: `student`, `educator`, `client`,
  `employer`, `super_admin`.
- Auth is Clerk (`client/lib/auth-context.tsx`), with role fetched from the
  server (`GET /api/auth/me`) after sign-in, and `ROLE_DASHBOARD` mapping
  used to redirect post-login (`super_admin` → `/admin/dashboard`).
- Route protection is `clerkMiddleware` (`client/middleware.ts`) — checks
  *authenticated or not* only; per-role gating (including `/admin`) happens
  client-side in each role's `layout.tsx`, same pattern as every other role.
  Real enforcement is server-side (`requireRole` on every API route) — the
  client check is UX only, so this is not a security gap.
- Per-role dashboards exist under
  `client/app/{student,educator,volunteer,employer,admin}`.

### Work items
1. **Database** — ✅ done (2026-08-05)
   - `supabase/migrations/0014_admin_role.sql` adds `super_admin` to
     `public.roles`.
   - RLS decision: **no new RLS policies added.** Every server route already
     reads/writes through the Supabase service-role client (bypasses RLS
     entirely); authorization is enforced in Express (`requireRole`), not
     Postgres. Documented inline in the migration — revisit only if a
     client-side Supabase key ever queries these tables directly.
2. **Server (`server/src`)** — ✅ done (2026-08-05)
   - `middleware/auth.ts` already exposed `role` + a generic `requireRole(...roles)`
     guard (built for the demo-isolation work); reused as-is for `super_admin`.
   - `routes/admin.ts` — mount point for admin endpoints, currently one route:
     `GET /api/admin/overview` (headline counts: students/educators/clients/
     employers/institutions/pending verifications/verified services, demo
     data excluded). Mounted in `index.ts` as
     `app.use("/api/admin", requireAuth, requireRole("super_admin"), adminRouter)`.
   - `scripts/seed-super-admin.ts` (`npm run seed:super-admin`) — the *only*
     way to provision a `super_admin` account (reads `SUPER_ADMIN_EMAIL` /
     `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` env vars). `super_admin` is
     excluded from `routes/auth.ts`'s self-service `validRoles` list, so
     `/signup` can never grant it.
3. **Client (`client/app`)** — ✅ done (2026-08-05)
   - `super_admin` added to `UserRole` and `ROLE_DASHBOARD` (→ `/admin/dashboard`)
     in `auth-context.tsx`.
   - `client/app/admin/layout.tsx` — sidebar shell (desktop) + horizontally
     scrollable pill nav (mobile) listing all 14 modules; same
     loading/role-mismatch-redirect pattern as the other four role layouts.
   - `client/app/admin/dashboard/page.tsx` — real page wired to
     `GET /api/admin/overview`.
   - 13 module stub pages (`users`, `institutions`, `educators`, `clients`,
     `employers`, `submissions`, `flags`, `audit`, `portfolios`, `reports`,
     `alerts`, `settings`, `demo`) using a shared `components/admin/ModuleStub.tsx`,
     each labeled with which phase actually builds it out. `admin/demo`
     is the one exception — it's a real info card linking to the already-live
     `/demo` picker, not a stub.
   - `client/app/admin/page.tsx` redirects `/admin` → `/admin/dashboard`.
   - Did **not** add role-specific matching to `middleware.ts` — see "Current
     state" above for why that's consistent with the rest of the app rather
     than a gap.
4. **Demo login** — ✅ done (2026-08-05), scoped to general browsing, **not**
   super_admin per explicit product decision:
   - `supabase/migrations/0013_demo_accounts.sql` — `is_demo` flag on
     `user_profiles`/`services` (trigger-synced), `demo_accounts` mapping
     table with a `CHECK (role <> 'super_admin')` guard, seeded demo
     institution/programme.
   - `server/src/scripts/seed-demo-accounts.ts` (`npm run seed:demo`) —
     creates one real Clerk user per demo role (student/educator/client/employer).
   - `server/src/routes/demo.ts` + `index.ts` — public `GET /api/demo/roles`,
     `POST /api/demo/login` issues a short-lived Clerk sign-in token
     (`signInTokens.createSignInToken`), rate-limited.
   - `client/app/demo/page.tsx` — public role picker; exchanges the ticket via
     `signIn.create({ strategy: "ticket", ticket })`.
   - Data isolation: `dashboard.ts`, `verifications.ts`, `portfolio.ts`,
     `services.ts` filter list/browse queries on `is_demo` so demo accounts
     only ever see demo data and vice versa (services use service-role
     Supabase client, so this had to be enforced in-route, not via RLS).
   - `client/components/DemoBanner.tsx` — sticky "browsing as demo X · switch
     role · exit" bar wired into all four dashboard layouts.
   - Entry points: `/demo` linked from `Nav.tsx` (desktop + mobile) and the
     login page; `/demo(.*)` added to `middleware.ts` public routes.
   - **Not yet run against a live environment** — still needs the migration
     applied and `npm run seed:demo` executed with real Clerk/Supabase env vars.

### Super Admin dashboard modules (shell only in Phase 1 — most are stubs wired to Phase 2/3 data)
| Module | Route (proposed) | Depends on |
|---|---|---|
| Dashboard Overview | `/admin/dashboard` | Phase 4 alerts, Phase 3 submissions |
| User Verification | `/admin/users` | existing `user_profiles` |
| Institutions, Programmes & Cohorts | `/admin/institutions` | Phase 2 schema |
| Educator Assignments | `/admin/educators` | Phase 2 schema |
| Volunteer Client Management | `/admin/clients` | existing `client-signup.ts`, `volunteer-requests.ts` |
| Employer Management | `/admin/employers` | existing employer routes |
| Practical Submissions | `/admin/submissions` | existing `services.ts`, `verifications.ts` |
| Flagged Issues | `/admin/flags` | Phase 3 flag support (new) |
| Audit Trail | `/admin/audit` | new `audit_log` table |
| Portfolio Oversight | `/admin/portfolios` | existing `portfolio.ts` |
| Reports & Analytics | `/admin/reports` | Phase 4/5 data |
| Alerts | `/admin/alerts` | Phase 4 |
| Settings | `/admin/settings` | Phase 2 config tables |
| Demo Mode | `/demo` | ✅ built — public role picker (student/educator/client/employer), Clerk sign-in-token login, isolated demo dataset, banner with switch-role/exit. Not super-admin-capable by design. |

**Phase 1 exit criteria:** ✅ met (2026-08-05, pending a live-environment run).
A Super Admin can log in, land on `/admin/dashboard` with real headline
stats, and see every module in the nav — most pages are empty states pointing
at "coming in Phase X", per the original criteria. Still needed before this
is actually usable: apply `0014_admin_role.sql` and run
`npm run seed:super-admin` against the real Clerk/Supabase project (not yet
done — no live environment access from this session).

---

## Phase 2 — Admin Control Centre

**Goal:** Super Admin manages the structural data every later phase depends on.

### New schema — ✅ done (2026-08-07), `supabase/migrations/0015_admin_control_centre.sql`
- ✅ `institutions` — **extended** (already existed from 0003): added
  `contact_email`, `contact_phone`, `is_active`.
- ✅ `programmes` — **extended** (already existed from 0003): added `description`.
- ✅ `cohorts` — new: id, programme_id (FK, cascade), name, start_date, end_date.
- ✅ `service_categories` — reused as-is (0003/0010 seeded lookup); no recreate.
- ✅ `service_types` — new: id, category_id (FK), name, `recommended_duration_min`,
  `recommended_duration_max`, `required_practical_hours`, `required_practical_count`.
- ✅ `educator_assignments` — new: id, educator_id (FK), cohort_id (FK),
  `UNIQUE(educator_id, cohort_id)`. Scoping to what an educator sees/approves is
  read in later phases; this table is the source of the mapping.
- ✅ Extend `user_profiles`: added `programme_id`, `cohort_id`, and a
  `status` (`active`|`suspended`) flag. `institution_id` already existed (0003).
- RLS: new tables `ENABLE ROW LEVEL SECURITY` with **no policies** (service-role
  access only), consistent with the 0014 decision — documented in the migration.

### Work items
1. **CRUD API routes** — ✅ done (2026-08-07). Restructured `server/src/routes/admin.ts`
   into a `server/src/routes/admin/` directory (aggregator `index.ts` keeps
   `GET /overview` and mounts sub-routers under the same `requireRole("super_admin")`
   guard): `institutions.ts`, `programmes.ts`, `cohorts.ts`, `service-catalog.ts`
   (categories **and** types), `educator-assignments.ts`, `users.ts`. Shared UUID
   validation moved to `server/src/lib/validation.ts`. **Not yet run against a live
   Supabase project** — needs `0015` applied.
2. ⬜ CRUD UI under `/admin/institutions`, `/admin/programmes-cohorts`,
   `/admin/service-catalog`, `/admin/educators` — tables + create/edit forms.
   (Backend endpoints above are ready to wire up.)
3. **User management API** — ✅ done (2026-08-07), `admin/users.ts`: list with
   `?role=`/`?status=`/`?institution_id=`/`?q=`/`?include_demo=` filters, `GET /:id`
   with names embedded, `PATCH /:id` to assign institution/programme/cohort and set
   status. Role changes (esp. to/from `super_admin`) are **rejected** here by design —
   only `seed-super-admin.ts` can grant that role. UI (`/admin/users`) is ⬜.
4. ✅ Checked `0010_category_max_required.sql` — `service_categories` (with
   `max_required`) already existed and is reused; `service_types` (duration/hours)
   is the net-new table added in `0015`.

**Dependency note:** Phase 3 (Kosmè Verify) reads `service_types` for
duration/hours, and Phase 4 alerting logic reads the same recommended
duration fields — so Phase 2's schema should be finalized before Phase 3 UI
is built against it, even if Phase 3 work starts in parallel.

**Phase 2 exit criteria:** Super Admin can create an institution → programme →
cohort → assign an educator → define a service category/type with recommended
duration and required hours, entirely through the UI.

---

## Phase 3 — Kosmè Verify (practical service logging & verification)

**Goal:** Students log practical services end-to-end; educators verify them.

### Current state
- 🔶 `server/src/routes/services.ts`, `confirmations.ts`, `verifications.ts`
  already exist — likely cover a subset of this flow. **Audit these before
  building new endpoints** to avoid duplicating logging/confirmation logic.
- 🔶 `supabase/migrations/0006_storage_service_photos.sql`,
  `0008_fix_storage_public_read.sql` — photo storage already wired.

### Student flow
- ⬜ Log service form: category → type (pulls from Phase 2 `service_types`) →
  client source (enum below) → shows recommended duration.
- ⬜ Start/Stop Service timer — writes `started_at`/`ended_at`, computes
  `actual_duration_min`.
- ⬜ Checkpoint reminders during an active service (client-side timer +
  push/toast; server-side scheduled reminder is a Phase 4 concern).
- ⬜ Evidence upload: before/during/after photos (extend existing
  `service_photos` storage/table with a `stage` enum column).
- ⬜ Reflection notes field.
- ⬜ Client confirmation send (🔶 `confirmations.ts` may cover this — verify).
- ⬜ Submit for educator verification (status transition `draft → submitted`).

**Client source enum:** `friend_family | school_assigned | walk_in_client_day
| salon_placement | kosme_volunteer | other`

### Educator flow
- ⬜ Submission review queue (list + detail view): scheduled time vs. actual
  duration, photos, client confirmation status.
- ⬜ Approve (with optional hour adjustment), request corrections, reject,
  flag.
- ⬜ Only `approved` services count toward verified hours — this status must
  be the single source of truth used by Phase 5 (Portfolio) and Phase 4
  (reports).

**Phase 3 exit criteria:** A student can complete one full service log
(start → evidence → confirm → submit) and an educator can approve it, with
the approved hours visible somewhere countable (even if Phase 5's portfolio
UI isn't built yet).

---

## Phase 4 — Timing, Hours & Educator Alerts

**Goal:** Recommended durations drive real-time feedback and educator alerts.

### Work items
1. ⬜ Backfill `recommended_duration_min/max` per `service_type` (Phase 2
   schema) with real values, e.g.:
   - Basic Facial: 60–90 min
   - Basic Manicure: 45–60 min
   - Soft Glam Makeup: 75–120 min
2. ⬜ On Stop Service, compare `actual_duration_min` against the range and
   tag the service (`under | within | over`).
3. ⬜ Event/notification pipeline — two tiers:
   - **Activity feed** (non-urgent): service started, service stopped,
     client confirmation completed. Rendered in the educator dashboard feed.
   - **Priority alerts** (bell/alert area): service exceeded/under
     recommended time, ready for verification.
4. ⬜ Decide delivery mechanism: simplest viable is a Postgres `alerts` table
   + polling from the educator dashboard (matches current stack — no new
   infra); real-time (Supabase Realtime / websockets) can follow later if
   polling proves too slow.

**Phase 4 exit criteria:** Starting/stopping a service produces a visible
event in the educator's feed, and an out-of-range duration produces a
distinct priority alert.

---

## Phase 5 — Kosmè Portfolio

**Goal:** Auto-generated, employer-facing portfolio built only from
educator-verified work.

### Current state
- ✅ `server/src/routes/portfolio.ts` already exists — audit what it
  currently returns before extending.

### Work items
1. ⬜ Portfolio query = student profile + all services where
   `status = approved`, joined with photos (respecting consent, see below)
   and captions.
2. ⬜ Consent flag per photo/client (`consent_to_display boolean`) — only
   show images where consent was captured; ties into Kosmè Connect's consent
   records (Phase 6).
3. ⬜ Skill summary — derived rollup of approved service categories/types
   per student (simple count/aggregate to start; KAI Portfolio Assist
   (Phase 7) can later generate prose from this data).
4. ⬜ Verification badge — visual indicator tied to `approved` status, not a
   separate field to keep single source of truth.
5. ⬜ Employer-facing view (`/employer/portfolios/[studentId]` or similar,
   reusing existing employer route group).

**Phase 5 exit criteria:** A student with ≥1 approved service has a
viewable, employer-shareable portfolio page showing only verified work.

---

## Phase 6 — Kosmè Connect (volunteer client side)

**Goal:** Sourcing and managing volunteer practice clients; students with
their own clients are unaffected.

### Current state
- 🔶 `server/src/routes/client-signup.ts`, `volunteer-requests.ts` — some of
  this may already exist. Audit before building.

### Work items
1. ⬜ Volunteer client sign-up form: service interests, location/parish,
   availability.
2. ⬜ Consent record capture (reusable by Phase 5 portfolio photo consent).
3. ⬜ Client confirmation (may already be covered by Phase 3's confirmation
   flow — reuse rather than duplicate).
4. ⬜ Future (post-MVP): student ↔ client matching (manual admin-assisted
   matching first; automated matching is explicitly a KAI Match / Phase 7
   concern later).

**Phase 6 exit criteria:** A volunteer client can sign up, record consent,
and appear in a list an admin/educator can manually connect to a student.

---

## Phase 7 — KAI (Kosmè Assistive Intelligence)

**Goal:** Placeholder UI/API surface for AI features — **no live model calls
required for MVP.**

**Hard constraint:** KAI never verifies, grades, approves, rejects, or
substitutes for educator judgement. Every KAI touchpoint is assistive only
and must sit alongside, never inside, the approval decision.

| Area | Feature | Placeholder scope for MVP |
|---|---|---|
| Kosmè Verify | KAI Log Assist | UI affordance ("Ask KAI to help") on reflection notes + missing-evidence prompts; button present, disabled or stubbed response |
| Kosmè Portfolio | KAI Portfolio Assist | "Generate caption/bio" button on portfolio editor; stubbed |
| Educator/Admin Dashboard | KAI Insights | Placeholder card on `/admin/dashboard` and educator dashboard: "Cohort insights coming soon" |
| Kosmè Connect | KAI Match | Not built; explicitly deferred past MVP per the email |

### Work items
- ⬜ Add a `kai_enabled` feature flag (env var or `admin/settings`) so these
  surfaces can be toggled without a redeploy once real AI integration starts.
- ⬜ Stub API routes (`routes/kai/*`) returning a fixed "not yet available"
  response, so frontend integration work isn't blocked on model selection.

---

## MVP Priority (build order)

The email is explicit that these are the MVP cut — everything else in the
phases above beyond this list is post-MVP polish/expansion:

1. Super Admin login & dashboard access (Phase 1) — ✅ done, see `/admin`
2. Admin control centre (Phase 2)
3. Student service logging + recommended duration + start/stop timer (Phase 3, Phase 4 partial)
4. Educator alerts (Phase 4)
5. Client confirmation (Phase 3)
6. Educator verification (Phase 3)
7. Verified hours (Phase 3/4)
8. Portfolio from verified work (Phase 5)
9. Consent tracking (Phase 5/6)
10. Basic reports (Phase 1 "Reports & Analytics" module, minimal — counts/aggregates, not full analytics)
11. KAI placeholders (Phase 7)
12. Demo mode (Phase 1) — ✅ done, see `/demo`

**Explicitly post-MVP:** advanced AI (real KAI model integration),
student-client matching (KAI Match), and any deep analytics beyond basic
counts.

---

## Before starting: audit pass recommended

Several server routes already exist that overlap with Phase 3/5/6
(`services.ts`, `confirmations.ts`, `verifications.ts`, `portfolio.ts`,
`client-signup.ts`, `volunteer-requests.ts`) and migration `0010` may already
partially cover service categories and required-hours fields. Before writing
new schema or endpoints for those phases, read the existing code — this
avoids duplicate tables/routes and clarifies exactly how much of Phase 3
"log a practical service" is already built versus net-new.
