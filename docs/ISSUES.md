# Kosmè Issue Tracker

Granular, implementation-ready backlog for the remaining Kosmè feature work identified
from the stakeholder phase conversation and a full audit of the codebase against
`docs/ROADMAP.md`.

**Relationship to `docs/ROADMAP.md`:** ROADMAP.md is the phase-level narrative — what
each of the 7 phases means and its overall status. This file breaks the *remaining*
work in those phases into small, independently workable tickets with explicit
dependencies, so a single issue can be picked up without pulling in a whole phase.
**When you close an issue here, also update its phase's status in ROADMAP.md** (same
convention: don't wait to be asked, treat "done" as including the roadmap edit).

Phases 1 (Super Admin login/dashboard) and 2 (Admin Control Centre) are **already
complete** and are not repeated here — see ROADMAP.md for that history. Everything
below is `todo`.

**Legend:** Status is always `todo` unless noted otherwise inline. IDs are stable —
don't renumber when issues close, just mark them done in place or strike them through.

---

## Kosmè Verify (VER)

Extends `server/src/routes/services.ts`, `server/src/routes/confirmations.ts`,
`client/app/student/services/page.tsx`, `client/app/student/services/[id]/page.tsx`,
`client/app/educator/verify/page.tsx`.

### VER-1 — Add `client_source` field to service logging
- **Category:** Verify · Backend + Frontend
- **Depends on:** none
- **Description:** Add a `client_source` enum column to `services`
  (`friend_family | school_assigned | walk_in_client_day | salon_placement |
  kosme_volunteer | other`) via a new migration, and a required field on the student
  log-service form. This was explicitly deferred out of the original timer slice
  (see ROADMAP.md Phase 3) and is now needed.
- **Files:** new `supabase/migrations/0019_client_source.sql`,
  `server/src/routes/services.ts` (create/update handlers),
  `client/app/student/services/page.tsx` (log form).

### VER-2 — Evidence upload stage tagging (before/during/after)
- **Category:** Verify · Backend + Frontend
- **Depends on:** none
- **Description:** Add a `stage` enum (`before | during | after`) column to
  `service_photos` and extend the existing upload endpoint
  (`POST /:id/photos` in `services.ts`) and the upload UI to tag which stage each
  photo belongs to, instead of the current generic before/after-only handling.
- **Files:** migration extending `service_photos`, `server/src/routes/services.ts`
  (`POST /:id/photos`), `client/app/student/services/page.tsx` (photo upload widget).

### VER-3 — Reflection notes field
- **Category:** Verify · Backend + Frontend
- **Depends on:** none
- **Description:** Add a `reflection_notes` text column to `services` and a
  corresponding textarea on the student log/detail form, saved alongside the existing
  `notes` field (check whether `notes` should just be renamed/reused before adding a
  new column — audit first).
- **Files:** `server/src/routes/services.ts`,
  `client/app/student/services/[id]/page.tsx`.

### VER-4 — Wire client-confirmation send into the service flow
- **Category:** Verify · Backend + Frontend
- **Depends on:** none
- **Description:** `server/src/routes/confirmations.ts` already exists (144 lines) —
  audit exactly what it does before adding anything. Wire a "Send for client
  confirmation" action into the student service detail page that calls it, and surface
  confirmation status on that page (the read-only stepper on
  `client/app/student/services/[id]/page.tsx` already displays confirmation state —
  confirm the write path exists and is reachable from the UI).
- **Files:** `server/src/routes/confirmations.ts`,
  `client/app/student/services/[id]/page.tsx`.

### VER-5 — Submit-for-verification status transition
- **Category:** Verify · Backend
- **Depends on:** VER-2, VER-3, VER-4
- **Description:** Add an explicit submit action/endpoint that transitions a service
  from `awaiting_client`/draft state to `awaiting_educator`, gated on evidence photos
  and reflection notes being present. Today the status model already has
  `awaiting_educator` (migration `0017`) but nothing enforces the pre-submit
  checklist.
- **Files:** `server/src/routes/services.ts`.

### VER-6 — Checkpoint reminders during an active service
- **Category:** Verify · Frontend
- **Depends on:** none
- **Description:** Client-side interval reminders (toast/banner) while a service is
  `in_progress`, using the existing live elapsed-time timer UI on
  `client/app/student/services/page.tsx` as the base. No server changes required —
  this is a UI-only enhancement on top of the existing `started_at`-driven timer.
- **Files:** `client/app/student/services/page.tsx`.

### VER-7 — Wire timer/duration fields into the educator review queue
- **Category:** Verify · Frontend
- **Depends on:** none (data already exists; UI is stale)
- **Description:** `client/app/educator/verify/page.tsx` (439 lines) predates
  migrations `0017`/`0018` and has zero references to `duration_tag`, `started_at`,
  `ended_at`, or `actual_duration_min`. Add these to the review list/detail view so
  educators can see scheduled vs. actual duration and the under/within/over tag.
- **Files:** `client/app/educator/verify/page.tsx`.

### VER-8 — Educator actions: approve / adjust hours / request corrections / reject / flag
- **Category:** Verify · Backend + Frontend
- **Depends on:** VER-7
- **Description:** Add the actual decision actions to the educator review queue:
  approve (with optional hour adjustment), request corrections (sends back to
  student), reject, and flag (reuse the existing `flags` table/`admin/flags.ts`
  pattern rather than inventing a new one). Needs corresponding endpoints — audit
  `verifications.ts` first, since it may already cover part of this.
- **Files:** `server/src/routes/verifications.ts`, `server/src/routes/services.ts`,
  `client/app/educator/verify/page.tsx`, `server/src/routes/admin/flags.ts` (pattern
  reference).

### VER-9 — Enforce `approved` as the single source of truth for verified hours
- **Category:** Verify · Backend
- **Depends on:** VER-8
- **Description:** Audit every place that counts/displays "verified hours" (student
  dashboard, portfolio, future reports) and confirm they all filter on the same
  `status = 'approved'` (or equivalent) condition from `services`, with no
  parallel/duplicate "verified" flag anywhere. This is a consistency pass, not new
  functionality — blocks Portfolio (POR-1) and Reports (RPT-1).
- **Files:** `server/src/routes/services.ts`, `server/src/routes/portfolio.ts`,
  `server/src/routes/dashboard.ts`.

---

## Timing & Educator Alerts (ALT)

Extends `server/src/routes/admin/alerts.ts` / the `alerts` table (migration `0016`).

### ALT-1 — Decide the alert event model
- **Category:** Alerts · Design
- **Depends on:** none
- **Description:** Define the concrete list of events and which tier each belongs to:
  **activity feed** (non-urgent: service started, service stopped, client confirmation
  completed) vs. **priority alerts** (bell/alert area: exceeded/under recommended
  time, ready for educator verification). Decide whether these reuse the existing
  `alerts` table (audience/severity columns already exist per ROADMAP.md) or need a
  new lighter-weight `events` table for the non-urgent feed. Write the decision inline
  in the migration this unblocks.
- **Files:** `supabase/migrations/0016_admin_subsystems.sql` (reference),
  new migration if a separate events table is chosen.

### ALT-2 — Emit alerts on service start/stop/over-time/under-time
- **Category:** Alerts · Backend
- **Depends on:** ALT-1
- **Description:** Hook `POST /:id/start` and `POST /:id/stop` in `services.ts` to
  write the corresponding event/alert row(s), including the priority alert when
  `duration_tag` computed on stop is `over` or `under`.
- **Files:** `server/src/routes/services.ts`, `server/src/routes/admin/alerts.ts`
  (pattern reference), whichever table ALT-1 settles on.

### ALT-3 — Educator dashboard activity feed UI
- **Category:** Alerts · Frontend
- **Depends on:** ALT-2
- **Description:** Non-urgent event feed rendered on the educator dashboard (no
  existing educator dashboard alerts UI was found — this is net-new).
- **Files:** educator dashboard page (locate/create under `client/app/educator/`).

### ALT-4 — Priority alert / notification-bell UI for educators
- **Category:** Alerts · Frontend
- **Depends on:** ALT-2
- **Description:** Bell/alert-area UI for the priority tier (over/under time, ready
  for verification), separate from the activity feed. Can mirror the existing admin
  `/admin/alerts` page's active-toggle pattern for consistency.
- **Files:** educator layout/dashboard under `client/app/educator/`,
  `client/app/admin/alerts/page.tsx` (pattern reference).

### ALT-5 — Alert triggers for confirmation-completed / ready-for-verification
- **Category:** Alerts · Backend
- **Depends on:** VER-4, VER-5, ALT-1
- **Description:** Fire the remaining two event types once client confirmation lands
  (VER-4) and the submit-for-verification transition exists (VER-5).
- **Files:** `server/src/routes/confirmations.ts`, `server/src/routes/services.ts`.

---

## Kosmè Portfolio (POR)

Extends `server/src/routes/portfolio.ts`, `client/app/student/portfolio/page.tsx`,
`client/app/admin/portfolios/page.tsx`.

### POR-1 — Restrict portfolio query to approved-only services
- **Category:** Portfolio · Backend
- **Depends on:** VER-9
- **Description:** Audit `portfolio.ts`'s current `GET /api/portfolio` query and
  confirm/fix it to only include services where the verified-hours source of truth
  (VER-9) is `approved`.
- **Files:** `server/src/routes/portfolio.ts`.

### POR-2 — Photo/client consent gating in portfolio display
- **Category:** Portfolio · Backend + Frontend
- **Depends on:** CON-1
- **Description:** Only surface photos/client details in the portfolio where consent
  was captured, using the general consent-record model built in CON-1 (the current
  `client_signups.photo_consent` boolean is too narrow — it doesn't cover
  non-volunteer clients like friend/family or walk-ins).
- **Files:** `server/src/routes/portfolio.ts`,
  `client/app/student/portfolio/page.tsx`.

### POR-3 — Skill summary rollup
- **Category:** Portfolio · Backend
- **Depends on:** POR-1
- **Description:** Simple aggregate of approved service categories/types per student
  (count-based to start; KAI-3 can later generate prose from this data — don't build
  that now).
- **Files:** `server/src/routes/portfolio.ts`.

### POR-4 — Verification badge
- **Category:** Portfolio · Frontend
- **Depends on:** POR-1
- **Description:** Visual badge tied directly to `approved` status (no new field —
  reuse the same source of truth as VER-9, don't introduce a parallel "verified"
  flag).
- **Files:** `client/app/student/portfolio/page.tsx`.

### POR-5 — Employer-facing portfolio view
- **Category:** Portfolio · Frontend
- **Depends on:** POR-1, POR-4
- **Description:** A route under the existing employer route group
  (`client/app/employer/` — confirm correct one vs. `employers/`, see CLN-1) that
  reuses `GET /api/portfolio` to show a read-only, employer-shareable student
  portfolio.
- **Files:** new page under `client/app/employer/`, `server/src/routes/portfolio.ts`.

---

## Kosmè Connect (CON)

Extends `server/src/routes/client-signup.ts`, `server/src/routes/volunteer-requests.ts`.

### CON-1 — General reusable consent-record model
- **Category:** Connect · Backend
- **Depends on:** none
- **Description:** Replace/extend the current single `photo_consent` boolean on
  `client_signups` with a proper consent-record model that covers all client sources
  from VER-1 (not just volunteer sign-ups), so Portfolio (POR-2) has one place to
  check consent regardless of whether the client was a volunteer, friend/family, or
  walk-in.
- **Files:** new migration extending/replacing consent storage,
  `server/src/routes/client-signup.ts`.

### CON-2 — Manual admin-assisted student↔client matching
- **Category:** Connect · Backend + Frontend
- **Depends on:** none
- **Description:** Low priority — explicitly scoped as post-MVP manual-first in
  ROADMAP.md. Basic UI/endpoint letting an admin pair a volunteer client
  (`client_signups`) with a student. Automated matching is out of scope (that's
  KAI-5).
- **Files:** `server/src/routes/admin/clients.ts`,
  `client/app/admin/clients/page.tsx`.

---

## KAI Placeholders (KAI)

New `server/src/routes/kai/*`, dashboard cards. Hard constraint carried over from
ROADMAP.md: **KAI never verifies, grades, approves, rejects, or replaces educator
judgement** — every touchpoint below is assistive-only UI, not a decision-making path.

### KAI-1 — Stub API routes
- **Category:** KAI · Backend
- **Depends on:** none
- **Description:** `routes/kai/*` returning a fixed "not yet available" response,
  gated on the existing `app_settings.kai_enabled` flag, so frontend affordances
  aren't blocked on model selection.
- **Files:** new `server/src/routes/kai/index.ts`, `server/src/routes/admin/settings.ts`
  (flag reference).

### KAI-2 — KAI Log Assist affordance (Kosmè Verify)
- **Category:** KAI · Frontend
- **Depends on:** KAI-1, VER-3
- **Description:** "Ask KAI to help" button on the reflection notes field and a
  missing-evidence prompt; button present, disabled or returns the stubbed response.
- **Files:** `client/app/student/services/[id]/page.tsx`.

### KAI-3 — KAI Portfolio Assist affordance
- **Category:** KAI · Frontend
- **Depends on:** KAI-1, POR-1
- **Description:** "Generate caption/bio" button on the portfolio editor; stubbed
  response only.
- **Files:** `client/app/student/portfolio/page.tsx`.

### KAI-4 — KAI Insights card on the educator dashboard
- **Category:** KAI · Frontend
- **Depends on:** KAI-1
- **Description:** Mirror the existing admin-dashboard KAI Insights placeholder card
  (`client/app/admin/dashboard/page.tsx`, gated on `kai_enabled`) on the educator
  dashboard — currently only the admin side has this.
- **Files:** educator dashboard page under `client/app/educator/`,
  `client/app/admin/dashboard/page.tsx` (pattern reference).

### KAI-5 — KAI Match placeholder (Kosmè Connect)
- **Category:** KAI · Frontend
- **Depends on:** KAI-1, CON-2
- **Description:** Lowest priority — explicitly deferred past MVP per the original
  stakeholder conversation. Placeholder only, once manual matching (CON-2) exists to
  attach it to.
- **Files:** `client/app/admin/clients/page.tsx`.

---

## Reports & Analytics (RPT)

Replaces the stub at `client/app/admin/reports/page.tsx`.

### RPT-1 — Basic reports backend
- **Category:** Reports · Backend
- **Depends on:** VER-9
- **Description:** New endpoint(s) for basic counts/aggregates: verified hours per
  cohort, pending-verification counts, basic timing-trend aggregates (over/under/
  within counts). Explicitly *not* full analytics — MVP scope per ROADMAP.md.
- **Files:** new `server/src/routes/admin/reports.ts`,
  `server/src/routes/admin/index.ts` (mount).

### RPT-2 — Reports & Analytics admin UI
- **Category:** Reports · Frontend
- **Depends on:** RPT-1
- **Description:** Replace `ModuleStub` on `client/app/admin/reports/page.tsx` with
  real charts/tables backed by RPT-1.
- **Files:** `client/app/admin/reports/page.tsx`,
  `client/components/admin/ModuleStub.tsx` (being replaced here).

---

## Cleanup (CLN)

### CLN-1 — Audit duplicate role folders under `client/app`
- **Category:** Cleanup
- **Depends on:** none
- **Description:** `client/app` has both singular and plural folders for three roles
  (`student`/`students`, `educator`/`educators`, `employer`/`employers`). Confirm which
  of each pair is the authenticated dashboard vs. a public marketing page, document
  the split (or consolidate naming) so future issues in this file reference the
  correct one unambiguously — several issues above (POR-5, ALT-3/4, KAI-4) add pages
  under these folders.
- **Files:** `client/app/student*`, `client/app/educator*`, `client/app/employer*`.

---

## Ops / Deployment (OPS)

### OPS-1 — Apply pending migrations to the live Supabase project
- **Category:** Ops
- **Depends on:** none
- **Description:** Migrations `0014`–`0018` (and every new migration added by the
  issues above) still need to be applied to the live environment — ROADMAP.md notes
  this hasn't been done from any prior session. Blocks real usability of everything
  already built, not just new work.
- **Files:** `supabase/migrations/*`.

### OPS-2 — Run seed scripts against the live environment
- **Category:** Ops
- **Depends on:** OPS-1
- **Description:** Run `npm run seed:super-admin` and `npm run seed:demo` against the
  real Clerk/Supabase project once migrations are applied.
- **Files:** `server/src/scripts/seed-super-admin.ts`,
  `server/src/scripts/seed-demo-accounts.ts`.
