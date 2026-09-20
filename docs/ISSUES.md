# Kosmè Issue Tracker

This is the **single working tracker** for Kosmè feature work — the base document
going forward. `docs/ROADMAP.md` is kept only as historical narrative (the original
phase-level breakdown of the stakeholder email); it is no longer updated. When in
doubt, this file wins.

**Conventions:**
- `- [x]` = done and shipped in the codebase. `- [ ]` = outstanding (`todo`).
- IDs are stable — don't renumber when issues close, just check them off in place.
- When you close an issue, check it off **in the same turn** you finish the work and
  add a one-line note on *what* was built and *where* (file paths/routes), same as
  the maintenance convention ROADMAP.md used.
- If a work item turns out to already exist or not be needed, say so inline rather
  than deleting the line, so the decision history isn't lost.
- New issues should scope a thin *tracer-bullet* slice — touching schema,
  backend, and frontend together where the feature spans those layers —
  rather than a full backend pass followed by a separate full frontend pass.
  Split by feature/behavior, not by layer.

---

## Done — Foundation (Super Admin + Admin Control Centre)

Shipped 2026-08-05–2026-08-07. Kept here as a checklist for completeness, not as
open work.

- [x] **FND-1** — Super Admin role & auth. `public.roles`/`user_profiles.role`
  (migrations `0002`, `0005`, `0014`), Clerk auth with server-fetched role
  (`GET /api/auth/me`), `requireRole("super_admin")` guard on every admin route,
  `seed-super-admin.ts` as the only provisioning path (blocked from self-service
  `/signup`).
- [x] **FND-2** — Admin dashboard shell. `client/app/admin/layout.tsx` (14-module
  nav), `/admin/dashboard` wired to `GET /api/admin/overview` (headline counts,
  demo data excluded).
- [x] **FND-3** — Demo mode. `is_demo` flag + `demo_accounts` table (migration
  `0013`, `super_admin` excluded via CHECK constraint), `seed-demo-accounts.ts`,
  public `GET /api/demo/roles` / `POST /api/demo/login` (Clerk sign-in ticket,
  rate-limited), `/demo` role picker, `DemoBanner.tsx`, data isolation enforced
  in-route (`dashboard.ts`, `verifications.ts`, `portfolio.ts`, `services.ts`
  filter on `is_demo`).
- [x] **FND-4** — Admin Control Centre CRUD. Schema in migration `0015`
  (`cohorts`, `service_types`, `educator_assignments`, extended
  `institutions`/`programmes`/`user_profiles`). Routes under
  `server/src/routes/admin/{institutions,programmes,cohorts,service-catalog,
  educator-assignments,users}.ts`. UI: `/admin/institutions` (3-level
  master/detail), `/admin/service-catalog`, `/admin/educators`, `/admin/users`
  (filter + edit drawer). Role changes to/from `super_admin` rejected by design.
- [x] **FND-5** — Admin subsystems. Schema in migration `0016` (`audit_log`,
  `flags`, `alerts`, `app_settings`, seeds `kai_enabled=false`). Every admin
  mutation writes an `audit_log` row (`server/src/lib/audit.ts`). Routes/UI:
  `/admin/audit` (read-only feed), `/admin/flags` (raise/resolve/dismiss),
  `/admin/alerts` (CRUD + active toggle), `/admin/settings` (key/value +
  `kai_enabled` toggle), KAI Insights placeholder card on `/admin/dashboard`.
- [x] **FND-6** — Admin read-only oversight views. `/admin/clients`
  (client_signups + volunteer_requests), `/admin/employers` (profiles +
  shortlist counts), `/admin/submissions` (all services + verification/
  confirmation state), `/admin/portfolios` (students + verified-work detail).

**Still outstanding from this slice:** none functionally — see **OPS-1/OPS-2**
below for the live-environment deploy/seed step that was never confirmed run.

---

## Done — Kosmè Verify: logging + timer slice

Shipped 2026-08-07 as MVP item #3.

- [x] **VER-0a** — Service Type selector. `client/app/student/services/page.tsx`
  has a category-filtered Service Type dropdown (`GET /api/services/service-types`)
  showing the selected type's recommended duration; `service_type_id` stored on
  `services` (migration `0017`). Client-source field intentionally deferred — see
  **VER-1**.
- [x] **VER-0b** — Start/Stop service timer, server-authoritative.
  `POST /api/services/:id/start` sets `started_at` + `in_progress`;
  `POST /api/services/:id/stop` sets `ended_at`, computes `actual_duration_min`,
  routes to `awaiting_client`/`awaiting_educator`. Survives refresh (DB-backed).
  `start_now` on `POST /api/services` opens straight into the timer. Schema in
  migration `0017`.
- [x] **VER-0c** — Duration tagging. On stop, `actual_duration_min` compared
  against the service type's recommended range, writes `duration_tag`
  (`under | within | over`, null if no range) — shown on the student service
  detail page.
- [x] **VER-0d** — Seeded real durations. Migration `0018` seeds 24
  `service_types` with real `recommended_duration_min/max` across the 8 hair
  categories (idempotent upsert on `(category_id, name)`).

---

## Kosmè Verify (VER) — outstanding

Extends `server/src/routes/services.ts`, `server/src/routes/confirmations.ts`,
`client/app/student/services/page.tsx`, `client/app/student/services/[id]/page.tsx`,
`client/app/educator/verify/page.tsx`.

- [ ] **VER-1** — Add `client_source` field to service logging
  - **Depends on:** none
  - Add a `client_source` enum column to `services` (`friend_family |
    school_assigned | walk_in_client_day | salon_placement | kosme_volunteer |
    other`) via a new migration, and a required field on the student log-service
    form. Explicitly deferred out of the original timer slice; needed now.
  - **Files:** new `supabase/migrations/0019_client_source.sql`,
    `server/src/routes/services.ts` (create/update handlers),
    `client/app/student/services/page.tsx` (log form).

- [x] **VER-2** — Evidence upload stage tagging (before/during/after)
  - **Depends on:** none
  - Add a `stage` enum (`before | during | after`) column to `service_photos`
    and extend the upload endpoint (`POST /:id/photos` in `services.ts`) and
    upload UI to tag which stage each photo belongs to.
  - **Files:** migration extending `service_photos`,
    `server/src/routes/services.ts` (`POST /:id/photos`),
    `client/app/student/services/page.tsx` (photo upload widget).
  - **Done:** `stage` column (nullable TEXT + CHECK `before|during|after`,
    existing rows left `null`) added in migration
    `supabase/migrations/0020_service_photo_stage.sql`.
    `POST /:id/photos` in `server/src/routes/services.ts` now parses an
    optional `stages` JSON array (parallel to the `photos` files, validated
    against the 3 allowed values) and persists it per row; `GET /:id` also
    now selects `stage`. Upload widget on
    `client/app/student/services/page.tsx` (the student log-service form —
    this is where photo upload actually lives, not the `[id]` detail page)
    gets a 3-way Before/During/After segmented control under each thumbnail,
    defaulting new photos to "before" and sent as the `stages` array
    alongside the files.

- [ ] **VER-3** — Reflection notes field
  - **Depends on:** none
  - Add a `reflection_notes` text column to `services` and a corresponding
    textarea on the student log/detail form (audit whether the existing `notes`
    field should just be renamed/reused before adding a new column).
  - **Files:** `server/src/routes/services.ts`,
    `client/app/student/services/[id]/page.tsx`.

- [ ] **VER-4** — Wire client-confirmation send into the service flow
  - **Depends on:** none
  - `confirmations.ts` already exists (144 lines) — audit before adding
    anything. Wire a "Send for client confirmation" action into the student
    service detail page, and surface confirmation status (the read-only
    stepper already displays it — confirm the write path is reachable).
  - **Files:** `server/src/routes/confirmations.ts`,
    `client/app/student/services/[id]/page.tsx`.

- [ ] **VER-5** — Submit-for-verification status transition
  - **Depends on:** VER-2, VER-3, VER-4
  - Add an explicit submit action/endpoint transitioning a service from
    `awaiting_client`/draft to `awaiting_educator`, gated on evidence photos +
    reflection notes being present. Status model already has
    `awaiting_educator` (migration `0017`) but nothing enforces the pre-submit
    checklist. Ship the endpoint together with its trigger UI (submit
    button + gating state) on the student service detail page — not as a
    backend-only endpoint.
  - **Files:** `server/src/routes/services.ts`,
    `client/app/student/services/[id]/page.tsx`.

- [ ] **VER-6** — Checkpoint reminders during an active service
  - **Depends on:** none
  - Client-side interval reminders (toast/banner) while `in_progress`, on top
    of the existing live elapsed-time timer. No server changes required.
  - **Files:** `client/app/student/services/page.tsx`.

- [ ] **VER-7** — Wire timer/duration fields into the educator review queue
  - **Depends on:** none (data already exists; UI is stale)
  - `client/app/educator/verify/page.tsx` (439 lines) predates migrations
    `0017`/`0018` — zero references to `duration_tag`, `started_at`, `ended_at`,
    `actual_duration_min`. Add these to the review list/detail view.
  - **Files:** `client/app/educator/verify/page.tsx`.

- [ ] **VER-8** — Educator actions: approve / adjust hours / request
      corrections / reject / flag
  - **Depends on:** VER-7
  - Add decision actions to the educator review queue: approve (optional hour
    adjustment), request corrections (back to student), reject, flag (reuse
    the existing `flags` table/`admin/flags.ts` pattern). Audit
    `verifications.ts` first — it may already cover part of this.
  - **Files:** `server/src/routes/verifications.ts`,
    `server/src/routes/services.ts`, `client/app/educator/verify/page.tsx`,
    `server/src/routes/admin/flags.ts` (pattern reference).

- [ ] **VER-9** — Enforce `approved` as the single source of truth for
      verified hours
  - **Depends on:** VER-8
  - Audit every place that counts/displays "verified hours" (student
    dashboard, portfolio, future reports) and confirm they all filter on
    `status = 'approved'` with no parallel "verified" flag. Consistency pass,
    not new functionality — blocks **POR-1** and **RPT-1**.
  - **Files:** `server/src/routes/services.ts`, `server/src/routes/portfolio.ts`,
    `server/src/routes/dashboard.ts`.

---

## Timing & Educator Alerts (ALT) — outstanding

Extends `server/src/routes/admin/alerts.ts` / the `alerts` table (migration `0016`).

- [ ] **ALT-1** — Decide the alert event model
  - **Depends on:** none
  - Define the concrete event list and tier: **activity feed** (non-urgent:
    service started/stopped, client confirmation completed) vs. **priority
    alerts** (bell/alert area: exceeded/under recommended time, ready for
    verification). Decide whether to reuse the existing `alerts` table
    (audience/severity already present) or add a lighter-weight `events` table
    for the non-urgent feed. Record the decision inline in the migration this
    unblocks.
  - **Files:** `supabase/migrations/0016_admin_subsystems.sql` (reference),
    new migration if a separate events table is chosen.

- [ ] **ALT-2** — Activity feed: emit + display
  - **Depends on:** ALT-1
  - Tracer-bullet slice: hook `POST /:id/start` and `POST /:id/stop` in
    `services.ts` to write the non-urgent event row(s) (service
    started/stopped) on whichever table ALT-1 settles on, *and* build the
    non-urgent event feed on the educator dashboard (net-new — no existing
    educator dashboard alerts UI) in the same issue, rather than shipping the
    backend emit and the feed UI as separate tickets.
  - **Files:** `server/src/routes/services.ts`,
    `server/src/routes/admin/alerts.ts` (pattern reference), whichever table
    ALT-1 settles on, educator dashboard page (locate/create under
    `client/app/educator/`).

- [ ] **ALT-3** — Priority alerts: emit + display
  - **Depends on:** ALT-1
  - Tracer-bullet slice: hook `POST /:id/stop` in `services.ts` to write the
    priority alert when `duration_tag` is `over` or `under`, *and* build the
    bell/alert-area UI for the priority tier (separate from the activity
    feed; can mirror `/admin/alerts`'s active-toggle pattern) in the same
    issue.
  - **Files:** `server/src/routes/services.ts`,
    `server/src/routes/admin/alerts.ts` (pattern reference), educator
    layout/dashboard under `client/app/educator/`,
    `client/app/admin/alerts/page.tsx` (pattern reference).

- [ ] **ALT-4** — Alert triggers for confirmation-completed /
      ready-for-verification
  - **Depends on:** VER-4, VER-5, ALT-1, ALT-2, ALT-3
  - Fire the remaining two event types once client confirmation (**VER-4**)
    and the submit-for-verification transition (**VER-5**) exist, and surface
    them through the activity feed (**ALT-2**) / priority bell (**ALT-3**)
    UI already built — mostly a backend emit plus wiring into existing UI,
    not new UI. **Note:** this is the one place Alerts work is gated behind
    Verify work — see "Suggested build order" below.
  - **Files:** `server/src/routes/confirmations.ts`,
    `server/src/routes/services.ts`.

---

## Kosmè Portfolio (POR) — outstanding

Extends `server/src/routes/portfolio.ts`, `client/app/student/portfolio/page.tsx`,
`client/app/admin/portfolios/page.tsx`.

- [ ] **POR-1** — Restrict portfolio query to approved-only services
  - **Depends on:** VER-9
  - Audit `portfolio.ts`'s `GET /api/portfolio` query and confirm/fix it to
    only include services where the verified-hours source of truth (VER-9) is
    `approved`.
  - **Files:** `server/src/routes/portfolio.ts`.

- [ ] **POR-2** — Photo/client consent gating in portfolio display
  - **Depends on:** CON-1
  - Only surface photos/client details where consent was captured, using the
    general consent-record model from **CON-1** (current
    `client_signups.photo_consent` boolean is too narrow — doesn't cover
    non-volunteer clients like friend/family or walk-ins).
  - **Files:** `server/src/routes/portfolio.ts`,
    `client/app/student/portfolio/page.tsx`.

- [ ] **POR-3** — Skill summary rollup
  - **Depends on:** POR-1
  - Simple aggregate of approved service categories/types per student
    (count-based to start; **KAI-3** can later generate prose from this — don't
    build that now). Ship the aggregate and its display on the student
    portfolio page together, not as a backend-only endpoint.
  - **Files:** `server/src/routes/portfolio.ts`,
    `client/app/student/portfolio/page.tsx`.

- [ ] **POR-4** — Verification badge
  - **Depends on:** POR-1
  - Visual badge tied directly to `approved` status — no new field, reuse the
    VER-9 source of truth.
  - **Files:** `client/app/student/portfolio/page.tsx`.

- [ ] **POR-5** — Employer-facing portfolio view
  - **Depends on:** POR-1, POR-4
  - A route under the employer route group (`client/app/employer/` — confirm
    vs. `employers/`, see **CLN-1**) reusing `GET /api/portfolio` for a
    read-only, employer-shareable student portfolio.
  - **Files:** new page under `client/app/employer/`,
    `server/src/routes/portfolio.ts`.

---

## Kosmè Connect (CON) — outstanding

Extends `server/src/routes/client-signup.ts`, `server/src/routes/volunteer-requests.ts`.

- [ ] **CON-1** — General reusable consent-record model
  - **Depends on:** none
  - Replace/extend the single `photo_consent` boolean on `client_signups` with
    a proper consent-record model covering all client sources from **VER-1**
    (not just volunteer sign-ups), so **POR-2** has one place to check consent
    regardless of client source.
  - **Files:** new migration extending/replacing consent storage,
    `server/src/routes/client-signup.ts`.

- [ ] **CON-2** — Manual admin-assisted student↔client matching
  - **Depends on:** none
  - Low priority — post-MVP, manual-first. Basic UI/endpoint letting an admin
    pair a volunteer client (`client_signups`) with a student. Automated
    matching is out of scope (**KAI-5**).
  - **Files:** `server/src/routes/admin/clients.ts`,
    `client/app/admin/clients/page.tsx`.

---

## KAI Placeholders (KAI)

New `server/src/routes/kai/*`, dashboard cards. **Hard constraint:** KAI never
verifies, grades, approves, rejects, or replaces educator judgement — every
touchpoint below is assistive-only UI, not a decision-making path.

- [x] **KAI-0** — `kai_enabled` feature flag. Stored in `public.app_settings`
  (seeded `false` in migration `0016`), toggled from `/admin/settings`, read by
  the KAI Insights placeholder card on `/admin/dashboard`. No redeploy needed
  to flip it.

- [ ] **KAI-1** — Stub API routes
  - **Depends on:** none
  - `routes/kai/*` returning a fixed "not yet available" response, gated on
    `app_settings.kai_enabled`, so frontend affordances aren't blocked on
    model selection.
  - **Files:** new `server/src/routes/kai/index.ts`,
    `server/src/routes/admin/settings.ts` (flag reference).

- [ ] **KAI-2** — KAI Log Assist affordance (Kosmè Verify)
  - **Depends on:** KAI-1, VER-3
  - "Ask KAI to help" button on the reflection notes field + missing-evidence
    prompt; stubbed response.
  - **Files:** `client/app/student/services/[id]/page.tsx`.

- [ ] **KAI-3** — KAI Portfolio Assist affordance
  - **Depends on:** KAI-1, POR-1
  - "Generate caption/bio" button on the portfolio editor; stubbed response.
  - **Files:** `client/app/student/portfolio/page.tsx`.

- [ ] **KAI-4** — KAI Insights card on the educator dashboard
  - **Depends on:** KAI-1
  - Mirror the existing admin-dashboard KAI Insights placeholder card on the
    educator dashboard (currently admin-only).
  - **Files:** educator dashboard page under `client/app/educator/`,
    `client/app/admin/dashboard/page.tsx` (pattern reference).

- [ ] **KAI-5** — KAI Match placeholder (Kosmè Connect)
  - **Depends on:** KAI-1, CON-2
  - Lowest priority — deferred past MVP. Placeholder only, once manual
    matching (**CON-2**) exists to attach it to.
  - **Files:** `client/app/admin/clients/page.tsx`.

---

## Reports & Analytics (RPT)

Replaces the stub at `client/app/admin/reports/page.tsx`.

- [ ] **RPT-1** — Reports & Analytics tracer slice
  - **Depends on:** VER-9
  - Tracer-bullet slice: new endpoint(s) for basic counts/aggregates
    (verified hours per cohort, pending-verification counts, timing-trend
    aggregates — over/under/within counts; explicitly not full analytics —
    MVP scope), *and* replace `ModuleStub` on
    `client/app/admin/reports/page.tsx` with real charts/tables backed by
    those endpoints, in the same issue.
  - **Files:** new `server/src/routes/admin/reports.ts`,
    `server/src/routes/admin/index.ts` (mount),
    `client/app/admin/reports/page.tsx`,
    `client/components/admin/ModuleStub.tsx` (being replaced here).

---

## Cleanup (CLN)

- [ ] **CLN-1** — Audit duplicate role folders under `client/app`
  - **Depends on:** none
  - `client/app` has both singular and plural folders for three roles
    (`student`/`students`, `educator`/`educators`, `employer`/`employers`).
    Confirm which of each pair is the authenticated dashboard vs. a public
    marketing page, document the split (or consolidate naming) so other
    issues (POR-5, ALT-3/4, KAI-4) reference the correct one unambiguously.
  - **Files:** `client/app/student*`, `client/app/educator*`,
    `client/app/employer*`.

---

## Ops / Deployment (OPS)

- [ ] **OPS-1** — Apply pending migrations to the live Supabase project
  - **Depends on:** none
  - Migrations `0014`–`0018` (and every new migration added by issues above)
    still need to be applied to the live environment. Blocks real usability of
    everything already built, not just new work.
  - **Files:** `supabase/migrations/*`.

- [ ] **OPS-2** — Run seed scripts against the live environment
  - **Depends on:** OPS-1
  - Run `npm run seed:super-admin` and `npm run seed:demo` against the real
    Clerk/Supabase project once migrations are applied.
  - **Files:** `server/src/scripts/seed-super-admin.ts`,
    `server/src/scripts/seed-demo-accounts.ts`.

---

## Suggested build order

Derived from the dependency graph above (replaces ROADMAP.md's old MVP Priority
list, which put Alerts ahead of Confirmation/Verification even though **ALT-4**
depends on both). Each item below is scoped as a tracer-bullet slice — schema,
backend, and frontend built together where the feature spans those layers —
rather than a separate backend pass and frontend pass.

1. **VER-1, VER-2, VER-3, VER-4** (parallel, no dependencies)
2. **VER-5** (needs VER-2/3/4) → **VER-6, VER-7** (parallel, no hard deps)
3. **VER-8** (needs VER-7) → **VER-9** (needs VER-8)
4. **ALT-1** (design, no deps) → **ALT-2, ALT-3** (parallel, each needs only
   ALT-1) → **ALT-4** (needs VER-4, VER-5, ALT-1, ALT-2, ALT-3)
5. **CON-1** (no deps, unblocks POR-2) — can start any time, in parallel with
   the VER/ALT chain
6. **POR-1, RPT-1** (need VER-9) → **POR-3, POR-4** (need POR-1) →
   **POR-2** (needs CON-1) → **POR-5** (needs POR-1, POR-4)
7. **KAI-1** (no deps) → **KAI-2** (needs VER-3), **KAI-3** (needs POR-1),
   **KAI-4** (no extra deps)
8. **CON-2** (no deps, low priority) → **KAI-5** (needs CON-2, lowest priority)
9. **CLN-1** and **OPS-1/OPS-2** — no code dependencies, but OPS-1/OPS-2 block
   *any* of the above from being usable in the live environment, so do them
   early rather than last.

**Explicitly post-MVP:** real KAI model integration, automated student-client
matching (KAI-5's eventual "KAI Match"), deep analytics beyond RPT-1's basic
counts.
