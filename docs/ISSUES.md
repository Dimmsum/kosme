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

**Still outstanding from this slice:** none. The live-environment
migration and seed steps (**OPS-1/OPS-2**, below) were confirmed done
2026-09-22.

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

- [x] **VER-1** — Add `client_source` field to service logging. Migration
  `0019_client_source.sql` adds `services.client_source` (TEXT + CHECK, backfilled
  `'other'` then locked NOT NULL, matching the `duration_tag`/`status` convention).
  `server/src/routes/services.ts`'s `POST /` validates it against the 6 allowed
  values (400 if missing/invalid) and returns it on the create/list/detail
  selects; no update handler exists on this route to extend. `client/app/student/
  services/page.tsx`'s log form has a required "Client Source" select
  (`CLIENT_SOURCE_OPTIONS`) wired into form state and the POST payload,
  validated client-side alongside name/category.

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

- [x] **VER-3** — Reflection notes field. Added a new `reflection_notes` TEXT
  column on `services` (migration `0021_reflection_notes.sql`) rather than
  renaming/reusing `notes` — `notes` is populated at log time and is already
  read as the service description by the educator verify queue, volunteer
  confirmation views, and admin portfolio/submissions views, so repurposing it
  would misrepresent that data and break those consumers. New
  `PATCH /api/services/:id` handler in `server/src/routes/services.ts` lets the
  owning student set `reflection_notes` any time before the service is
  verified; textarea added to the detail page
  (`client/app/student/services/[id]/page.tsx`), not the initial log form,
  since reflection is written after the service has already happened.

- [x] **VER-4** — Wire client-confirmation send into the service flow.
  Audited `confirmations.ts` + `services.ts` first: a service that has a
  volunteer client picked at log time *already* auto-routes itself to
  `awaiting_client` (on `POST /` when logged instantly, or on `POST /:id/stop`
  when timed) and the client-side write path was already fully reachable at
  `/volunteer/confirmations` (confirm/dispute buttons wired to
  `POST /api/confirmations/:id/{confirm,dispute}`) — so no new "first send" UI
  was needed there. The one real gap: a client dispute leaves the service
  `rejected` with no way back into the pipeline. Added
  `POST /api/confirmations/:serviceId/send` (student-only, requires
  `client_id` set and `status === "rejected"`, moves it back to
  `awaiting_client`) in `server/src/routes/confirmations.ts`, and a "Send for
  client confirmation" button on the rejected-state block of
  `client/app/student/services/[id]/page.tsx`. Confirmation status display
  (pipeline stepper + confirmation record card) already existed and needed no
  changes.

- [x] **VER-5** — Submit-for-verification status transition. Prior to this,
  `awaiting_client` → `awaiting_educator` fired automatically and ungated
  inside `confirmations.ts`'s `POST /:serviceId/confirm` the moment the
  volunteer confirmed. Changed `/confirm` to just record the confirmation
  (status stays `awaiting_client`) and added
  `POST /api/services/:id/submit` (student-only, owner-only) in
  `server/src/routes/services.ts`: requires status `awaiting_client`, a
  `confirmations` row with `status = 'confirmed'`, at least one
  `service_photos` row, and non-empty `reflection_notes`; 400s naming what's
  missing otherwise, else flips status to `awaiting_educator`. Also fixed
  `confirmations.ts`'s `GET /pending` to filter out services already
  confirmed-but-not-yet-submitted (it used to rely on `/confirm` moving the
  status off `awaiting_client` to drop them from the list). UI: a "Submit for
  Verification" checklist card on
  `client/app/student/services/[id]/page.tsx`, shown once the client has
  confirmed, with a submit button disabled until evidence + reflection are
  present. **Scope note:** the no-client path (`POST /` / `POST /:id/stop`
  routing straight to `awaiting_educator` when there's no assigned client,
  shipped in VER-0b) is intentionally left ungated — there's no confirmation
  pause point to attach a checklist to without adding a new status value,
  which was out of scope for this slice (no migration in the Files list).
  - **Files:** `server/src/routes/services.ts`,
    `server/src/routes/confirmations.ts`,
    `client/app/student/services/[id]/page.tsx`.

- [x] **VER-6** — Checkpoint reminders during an active service. Added a
  `CHECKPOINT_INTERVAL_MIN` (15 min) client-side check in
  `client/app/student/services/page.tsx`: an effect derives elapsed minutes
  from the existing 1s timer tick and `activeService.started_at`, and fires
  a dismissible toast (bottom-right, auto-dismisses after 12s) each time
  elapsed time crosses a new 15-minute multiple, tracked per-service in a
  `shownCheckpoints` ref that resets when the running service changes.
  Purely client-side, no server/schema changes.

- [x] **VER-7** — Wire timer/duration fields into the educator review queue.
  `server/src/routes/verifications.ts`'s `GET /pending` and `GET /history`
  selects now include `started_at, ended_at, actual_duration_min,
  duration_tag`. `client/app/educator/verify/page.tsx` carries these through
  the `VerificationItem` type/mapping and adds a "Timing" card (start–end
  time, computed duration, `duration_tag` badge colored
  red/amber/emerald for over/under/within) rendered above the photos block
  on each queue item, for both pending and history entries.
  - **Files:** `server/src/routes/verifications.ts`,
    `client/app/educator/verify/page.tsx`.

- [x] **VER-8** — Educator actions: approve / adjust hours / request
      corrections / reject / flag. Audited `verifications.ts` first — verify/
      reject already existed, so this extended verify and added two new
      actions rather than rebuilding the queue. Migration
      `0024_educator_decisions.sql` adds `corrections_requested` to the
      `services.status`/`verifications.status` CHECK constraints and a new
      `services.adjusted_duration_min` column (kept separate from
      `actual_duration_min`, same convention as `duration_tag`/
      `reflection_notes`). `server/src/routes/verifications.ts`: `POST
      /:serviceId/verify` now accepts optional `adjusted_duration_min`;
      new `POST /:serviceId/request-corrections` (requires `notes`, moves
      `awaiting_educator` → `corrections_requested`, upserts a
      `verifications` row) and `POST /:serviceId/flag` (inserts into the
      existing `flags` table with `entity_type: "service"`, reusing
      `admin/flags.ts`'s pattern rather than a parallel mechanism).
      `server/src/routes/services.ts` adds `POST /:id/resubmit`
      (student-only, `corrections_requested` → `awaiting_educator`, no
      checklist re-check since it was already satisfied to reach
      `awaiting_educator` the first time). UI:
      `client/app/educator/verify/page.tsx` gets an "Adjust hours" input next
      to Approve, and Request Corrections / Flag buttons that open an inline
      notes/reason textarea; `client/app/student/services/[id]/page.tsx` and
      `client/app/student/services/page.tsx` show the new
      `corrections_requested` status, the corrections feedback + "Resubmit
      for review" action, and the adjusted-vs-logged duration when present.
  - **Files:** `supabase/migrations/0024_educator_decisions.sql`,
    `server/src/routes/verifications.ts`, `server/src/routes/services.ts`,
    `client/app/educator/verify/page.tsx`,
    `client/app/student/services/[id]/page.tsx`,
    `client/app/student/services/page.tsx`.

- [x] **VER-9** — Enforce `approved` as the single source of truth for
      verified hours
  - **Depends on:** VER-8
  - Audited every place that counts/displays "verified hours": student +
    educator + client + employer dashboards (`server/src/routes/
    dashboard.ts`), student/employer/volunteer portfolio reads
    (`server/src/routes/portfolio.ts`), admin portfolio oversight
    (`server/src/routes/admin/portfolios.ts`, `admin/index.ts`), the
    shortlist route (`shortlist.ts`), the educator queue's own verified
    count (`verifications.ts`), and their client-side consumers
    (`client/app/student/{dashboard,portfolio,services}/page.tsx`,
    `client/app/educator/{students,verify}/page.tsx`). Note: there is no
    `'approved'` value anywhere in this schema — the CHECK constraints
    (`0003_core_tables.sql`, tightened in `0017_service_timer.sql`,
    `0024_educator_decisions.sql`) define the terminal state as `'verified'`,
    which is what every one of the above already filters on
    (`.eq("status", "verified")` / `s.status === "verified"`), consistently.
    No parallel "verified" boolean or flag exists anywhere — the separate
    `verifications.status` column is an audit-trail record of the educator's
    decision, not used as an alternate source of truth for counting a
    student's verified hours/services. No code changes needed; this was a
    consistency pass that confirmed no divergence. Unblocks **POR-1** and
    **RPT-1**.
  - **Files:** `server/src/routes/services.ts`, `server/src/routes/portfolio.ts`,
    `server/src/routes/dashboard.ts`.

---

## Timing & Educator Alerts (ALT) — outstanding

Extends `server/src/routes/admin/alerts.ts` / the `alerts` table (migration `0016`).

- [x] **ALT-1** — Decide the alert event model. New `public.events` table
  (migration `0022_events.sql`), not a reuse of `alerts` — `alerts` is
  admin-authored broadcast messages (manual, role-wide, manual active
  toggle); these are system-generated, per-student/service, auto-fired. One
  table, not two, gated by a `tier` column (`activity` | `priority`) since
  both share the same shape and only differ in urgency:
  - **activity** (log only, no dismiss): `service_started`, `service_stopped`
  - **priority** (dismissible via `acknowledged_at`/`acknowledged_by`, drives
    the bell badge): `duration_over`, `duration_under`,
    `confirmation_completed`, `ready_for_verification` — the last two land
    with **ALT-4**, listed now so **ALT-2**/**ALT-3**'s UI can be built
    against the full `event_type` enum up front.
  - `student_id`/`service_id` FKs identify the actor; which educator(s) see a
    row is resolved at query time via the student's `cohort_id` →
    `educator_assignments` (no per-recipient fan-out row) — **note (ALT-2):**
    not actually wired up this way in the end. No existing educator route
    (`verifications.ts`'s `/students`, `/pending`, etc.) restricts by cohort
    assignment either — every educator sees every non-demo student, filtered
    only by `is_demo`. `events.ts` matches that established convention rather
    than introducing cohort-scoping in one place only; revisit as its own
    issue if cohort-restricted visibility is wanted app-wide. `is_demo`
    denormalized + trigger-synced from `student_id`, same pattern as
    `services.is_demo` (migration `0013`).
  - **Files:** `supabase/migrations/0023_events.sql` (filename corrected —
    `0022` was taken by **CON-1** by the time this shipped).

- [x] **ALT-2** — Activity feed: emit + display. `POST /:id/start` and
      `POST /:id/stop` in `server/src/routes/services.ts` now write
      `activity`-tier `service_started`/`service_stopped` rows through a new
      shared `logEvent()` helper (`server/src/lib/events.ts`) — also used by
      **ALT-3**'s `duration_over`/`duration_under` priority rows in the same
      `/stop` handler, so both tiers go through one insert path. New
      `GET /api/events/activity` in `server/src/routes/events.ts` (mounted at
      `/api/events` in `index.ts`, `requireRole("educator")`) returns the 50
      most recent activity rows, not dismissible (it's a log, not an inbox —
      matches the `acknowledged_at`/`_by` split in migration
      `0023_events.sql`). UI: new "Activity Feed" card on
      `client/app/educator/dashboard/page.tsx` (renamed the pre-existing
      pending-verifications card from "Recent Activity" to "Pending Reviews"
      to disambiguate from this net-new feed), start/stop icon per row,
      student name + message + relative time. **Scope note:** query is
      filtered only by `is_demo`, not cohort/`educator_assignments` — no
      existing educator route (`verifications.ts`'s `/students`, `/pending`)
      restricts by cohort assignment either, so this matches that established
      convention rather than introducing cohort-scoping in one place only;
      ALT-1's note about resolving visibility via `cohort_id` →
      `educator_assignments` wasn't carried through for this reason.
  - **Files:** `server/src/routes/services.ts`, `server/src/lib/events.ts`,
    `server/src/routes/events.ts`, `server/src/index.ts`,
    `client/app/educator/dashboard/page.tsx`.

- [x] **ALT-3** — Priority alerts: emit + display. `POST /:id/stop` in
      `server/src/routes/services.ts` writes a `priority`-tier event
      (`duration_over`/`duration_under`) whenever `duration_tag` lands
      outside the recommended range, alongside the `activity`-tier
      `service_stopped` row **ALT-2** added — both go through the shared
      `logEvent()` helper in `server/src/lib/events.ts`. New
      `server/src/routes/events.ts` (mounted at `/api/events`,
      `requireRole("educator")`) adds `GET /priority`
      (`?unacknowledged=true` filters to undismissed rows, driving the badge
      count) and `POST /:id/acknowledge` (sets `acknowledged_at`/`_by`) —
      shares the file with **ALT-2**'s `GET /activity` since both read the
      same `events` table. UI: new `client/components/educator/AlertsBell.tsx`
      (bell icon, unread-count badge, dropdown list with per-alert Dismiss,
      polls every 60s) wired into `client/app/educator/layout.tsx`'s desktop
      sidebar header and a new mobile-only top bar (the sidebar is
      `hidden md:flex`, so mobile had no header to put it in before this).
  - **Files:** `server/src/routes/services.ts`, `server/src/routes/events.ts`,
    `server/src/lib/events.ts`, `server/src/index.ts`,
    `client/components/educator/AlertsBell.tsx`,
    `client/app/educator/layout.tsx`.

- [x] **ALT-4** — Alert triggers for confirmation-completed /
      ready-for-verification. Backend-only: both event types were already in
      migration `0023_events.sql`'s CHECK, `logEvent()`'s type union, and
      `AlertsBell.tsx`'s `AlertEvent` type, and ALT-1 put both in the
      `priority` tier, so they show up in the existing bell (not the
      activity feed, which is `activity`-tier only) with no UI changes.
      `server/src/routes/confirmations.ts`'s `POST /:serviceId/confirm`
      now emits `confirmation_completed` after recording the confirmation.
      `ready_for_verification` fires on **every** transition into
      `awaiting_educator` in `server/src/routes/services.ts`, not just
      `POST /:id/submit`: the no-client instant log (`POST /`), the no-client
      timer stop (`POST /:id/stop`), and `POST /:id/resubmit` (after
      corrections, with its own message) all land in the queue too, and
      skipping them would leave the alert missing for those services.
  - **Files:** `server/src/routes/confirmations.ts`,
    `server/src/routes/services.ts`.

---

## Kosmè Portfolio (POR) — outstanding

Extends `server/src/routes/portfolio.ts`, `client/app/student/portfolio/page.tsx`,
`client/app/admin/portfolios/page.tsx`.

- [x] **POR-1** — Restrict portfolio query to approved-only services
  - **Depends on:** VER-9
  - Audit `portfolio.ts`'s `GET /api/portfolio` query and confirm/fix it to
    only include services where the verified-hours source of truth (VER-9) is
    `approved`.
  - **Files:** `server/src/routes/portfolio.ts`.
  - **Done:** Audit confirmed every read in `server/src/routes/portfolio.ts`
    already filters on the VER-9 source of truth (`'verified'` — there is
    no `'approved'` value in the schema): `GET /` and `GET /:studentId`
    use `.eq("status", "verified")`, `GET /feed` does the same, and
    `GET /browse` counts only `status === "verified"` services. `verified`
    is terminal: `verifications.ts`'s verify/reject/request-corrections all
    require `awaiting_educator`, and `services.ts` blocks edits once
    verified. The embedded `verifications` row is unique per `service_id`
    (upserted), so it is always the approving decision. The one gap was
    `PATCH /:serviceId/photos`, which accepted any service the student
    owned and so could overwrite evidence on a service still awaiting
    review. Its ownership lookup now also requires `status = 'verified'`
    (404 otherwise). No client code calls it today. No schema or client
    changes.

- [x] **POR-2** — Photo/client consent gating in portfolio display
  - **Depends on:** CON-1
  - Only surface photos/client details where consent was captured, using the
    general consent-record model from **CON-1** (current
    `client_signups.photo_consent` boolean is too narrow — doesn't cover
    non-volunteer clients like friend/family or walk-ins).
  - **Files:** `server/src/routes/portfolio.ts`,
    `client/app/student/portfolio/page.tsx`.
  - **Done:** Consent is captured per service at log time for **every**
    client source, as a `consent_records` row with `subject_type = 'service'`.
    It is never derived from `client_signups`, because nothing links a
    service to a signup: `services.client_id` points at `user_profiles`,
    which has no email or other key to match a `client_signups` row. No
    migration, since CON-1's table already allows `'service'`.
    `server/src/routes/services.ts`'s `POST /` now requires a boolean
    `photo_consent` (400 otherwise) and writes the row after the insert.
    Like `client-signup.ts`, a failed consent write doesn't fail the
    request. `client/app/student/services/page.tsx`'s log form has a consent
    checkbox under Photos. `server/src/routes/portfolio.ts` gates `GET /`,
    `GET /feed` and `GET /:studentId` through a shared `withConsentGating()`
    helper: `service_photos` is emptied unless a consented row exists, and
    each row gets a `photo_consent` flag. This fails closed, so services
    logged before POR-2 have no row and their photos are hidden.
    `client/app/student/portfolio/page.tsx` says "Photos hidden · no client
    consent" instead of "No photos yet" for those services.
    **Scope notes:** there were no client details to gate, because none of
    the portfolio reads select `client_id` or any client join. Photos stay
    ungated where they serve as verification evidence rather than portfolio
    display: the educator verify queue, the student's own service detail
    page, and super-admin oversight in `admin/portfolios.ts`. Consent can be
    recorded or changed after the fact, at any status: `PUT
    /api/services/:id/consent` in `server/src/routes/services.ts` upserts the
    row (student-owned services only), `GET /api/services/:id` returns
    `photo_consent` (`null` = no record), and
    `client/app/student/services/[id]/page.tsx` has a consent checkbox card
    that the portfolio modal's hidden-photos note links to.

- [x] **POR-3** — Skill summary rollup
  - **Depends on:** POR-1
  - Simple aggregate of approved service categories/types per student
    (count-based to start; **KAI-3** can later generate prose from this — don't
    build that now). Ship the aggregate and its display on the student
    portfolio page together, not as a backend-only endpoint.
  - **Files:** `server/src/routes/portfolio.ts`,
    `client/app/student/portfolio/page.tsx`.
  - **Done:** No new endpoint or query. `server/src/routes/portfolio.ts`
    has a pure `summariseSkills()` helper that groups the verified rows the
    reads already fetch. It returns `{ category, count, types: [{ name,
    count }] }[]`, sorted by count. `GET /` and `GET /:studentId` now also
    embed `service_type:service_type_id ( name )` and return the rollup as
    `skills`. It is built on `/:studentId` too so **POR-5** gets it for free.
    Counts are taken before consent gating, because consent hides photos,
    not the service. Services with no `service_type_id` (logged before
    `0017`, or no type picked) count toward their category but no type.
    `client/app/student/portfolio/page.tsx` has a "Skill Summary" card
    between the stats row and the category filters: one row per category
    with a count and a bar scaled to the top category, and a chip per type
    (`Name ×n`). The card is hidden when there are no verified services. It
    doesn't show progress against `service_categories.max_required`, because
    the student dashboard's progress rings already do that.

- [x] **POR-4** — Verification badge
  - **Depends on:** POR-1
  - Visual badge tied directly to `approved` status — no new field, reuse the
    VER-9 source of truth.
  - **Files:** `client/app/student/portfolio/page.tsx`.
  - **Done:** Already existed, so no code changes were needed.
    `client/app/student/portfolio/page.tsx` renders an emerald
    `CheckCircle2` "Verified" badge on grid tiles, list rows and the detail
    modal. Every item comes from `GET /api/portfolio`, which POR-1 confirmed
    returns only `status = 'verified'` services. So the badge already
    reflects the VER-9 source of truth, with no new field.

- [x] **POR-5** — Employer-facing portfolio view
  - **Depends on:** POR-1, POR-4
  - A route under the employer route group (`client/app/employer/` — confirm
    vs. `employers/`, see **CLN-1**) reusing `GET /api/portfolio` for a
    read-only, employer-shareable student portfolio.
  - **Files:** new page under `client/app/employer/`,
    `server/src/routes/portfolio.ts`.
  - **Done:** Confirmed `client/app/employer/` is the authenticated
    dashboard, behind `employer/layout.tsx`'s role gate. `employers/` is the
    public marketing page. New page `client/app/employer/browse/
    [studentId]/page.tsx`, at the same path shape as the volunteer
    `/volunteer/browse/[studentId]`. It reads the existing `GET
    /api/portfolio/:studentId`, which was already open to employers, so
    no new endpoint. The page is read-only and shows:
    - a header with name and institution
    - stats for verified count, categories and educators
    - the POR-3 skill summary (`skills` from the same response)
    - a category filter
    - one card per verified service, with the POR-4 emerald "Verified"
      badge, before/after photos and the verifying educator. Where
      consent is missing, the card says "Photos withheld · no client
      consent" (POR-2 gating is already applied server-side).

    "Shareable" means a stable URL. "Copy link" copies it for another
    employer account, and an "Add to shortlist" toggle reuses
    `/api/shortlist`. There is no public or unauthenticated share link; that
    would need its own token model. Linked from Browse cards (name +
    "Portfolio →"), Shortlist cards ("Portfolio" replaces the duplicate
    Remove button; the header X still removes) and dashboard Featured
    Graduates rows. Server change in `server/src/routes/portfolio.ts`: the
    `/:studentId` profile lookup now also requires `role = 'student'`.
    Before, a shared link pointed at any user id returned that user's name
    and institution, even for an educator or employer.

---

## Kosmè Connect (CON) — outstanding

Extends `server/src/routes/client-signup.ts`, `server/src/routes/volunteer-requests.ts`.

- [x] **CON-1** — General reusable consent-record model. New
  `public.consent_records` table (migration `0022_consent_records.sql`):
  polymorphic `subject_type` (`client_signup | service`) + `subject_id`
  rather than a single FK, since 5 of `client_source`'s 6 values (all but
  `kosme_volunteer`) have no `client_signups` row to attach consent to at
  all — those will attach directly to a `services` row once POR-2 wires
  consent capture into the log-service form for non-signup sources (out of
  scope here; this issue is the schema + the one existing write path).
  Backfilled one row per existing `client_signups` submission.
  `client_signups.photo_consent` is kept (not dropped) for backward
  compatibility with existing reads; `server/src/routes/client-signup.ts`'s
  `POST /` now also mirrors the captured consent into `consent_records`
  (non-fatal on failure — the signup write is still the source of truth if
  the mirror insert fails). `consent_records` is service-role-only, same RLS
  pattern as `client_signups`.

- [x] **CON-2** — Manual admin-assisted student↔client matching
  - **Depends on:** none
  - Low priority — post-MVP, manual-first. Basic UI/endpoint letting an admin
    pair a volunteer client (`client_signups`) with a student. Automated
    matching is out of scope (**KAI-5**).
  - **Files:** `supabase/migrations/0025_client_matches.sql`,
    `server/src/routes/admin/clients.ts`,
    `client/app/admin/clients/page.tsx`.
  - **Done:** New `public.client_matches` table (migration
    `0025_client_matches.sql`) with `signup_id`, `student_id`, `notes`,
    `status` (`active | ended`), `matched_by`/`ended_by`, `created_at`/`ended_at`.
    It's a table, not a column on `client_signups`, so one client can be
    matched with several students and ended matches stay as history.
    A partial unique index allows only one *active* match per
    (signup, student) pair. `volunteer_requests` wasn't reused because it
    is keyed on a client *user account* and records the client asking, not
    an admin pairing. `server/src/routes/admin/clients.ts`:
    - `GET /signups` now embeds each signup's active matches as `matches`.
    - New `GET /students` lists who can be matched: active, non-demo
      students, with institution and cohort names. Sign-ups are always
      real, so demo students are never offered.
    - New `POST /matches` checks that the signup and student exist and
      applies the same eligibility rule (409 on a duplicate active pair).
    - New `PATCH /matches/:id` (`status: "ended"`) ends an active match.

    Both writes go through `logAudit` (`client_match` create/end).
    `client/app/admin/clients/page.tsx`: the Sign-ups tab gets an
    All/Unmatched/Matched filter. Each card gets a "Matched students"
    section with notes, match date and an end-match (X) button, which uses
    `ConfirmDialog`. A "Match with a student" `Modal` shows the client's
    parish, service preferences and availability for context, with a
    student search, a student select that leaves out students already
    matched with this client, and optional notes. **Scope notes:**
    admin-only. Students and clients don't see matches in their own apps,
    and the admin contacts both parties outside the platform. There's no
    notification, and no link from a match to the `services` it produces
    (`services.client_id` points at a client user account, which a
    signup doesn't have). Migration `0025` must be applied live before
    deploying (see **OPS-1**). Until then, `GET /signups` fails because
    it embeds the new table.

---

## KAI Placeholders (KAI)

New `server/src/routes/kai/*`, dashboard cards. **Hard constraint:** KAI never
verifies, grades, approves, rejects, or replaces educator judgement — every
touchpoint below is assistive-only UI, not a decision-making path.

- [x] **KAI-0** — `kai_enabled` feature flag. Stored in `public.app_settings`
  (seeded `false` in migration `0016`), toggled from `/admin/settings`, read by
  the KAI Insights placeholder card on `/admin/dashboard`. No redeploy needed
  to flip it.

- [x] **KAI-1** — Stub API routes. New `server/src/routes/kai/index.ts`,
  mounted at `/api/kai` behind `requireAuth` (any authenticated role) in
  `server/src/index.ts`. A shared `kaiEnabled()` helper reads
  `app_settings.kai_enabled` (same key/table `admin/settings.ts` writes) on
  each call — no caching, matches the no-session-cached-role convention
  elsewhere. `POST /log-assist` and `POST /portfolio-assist` (stubs for the
  **KAI-2**/**KAI-3** affordances) 503 with `{ error: "KAI is not enabled" }`
  when the flag is off, else `200` with a fixed
  `{ available: false, message: "... is not yet available." }` body — no
  model call, so frontend affordances can be built against a stable contract
  now.

- [x] **KAI-2** — KAI Log Assist affordance (Kosmè Verify). "Ask KAI to
  help" button added next to the Reflection heading on
  `client/app/student/services/[id]/page.tsx` (hidden once `verified`),
  calling `POST /api/kai/log-assist` and rendering the stub message inline.
  A second missing-evidence prompt (its own "Ask KAI" button, same handler)
  appears inside the Submit-for-Verification checklist card when no photos
  have been uploaded yet.

- [x] **KAI-3** — KAI Portfolio Assist affordance
  - **Depends on:** KAI-1, POR-1
  - "Generate caption/bio" button on the portfolio editor; stubbed response.
  - **Files:** `client/app/student/portfolio/page.tsx`.
  - **Done:** There is no separate portfolio editor. `client/app/student/
    portfolio/page.tsx` is the only portfolio page, and it is read-only, so
    both buttons are on it. It has no server or schema changes. Both
    buttons call the existing `POST /api/kai/portfolio-assist` stub from
    KAI-1 and show its message inline, styled like KAI-2's buttons:
    - **"Generate bio"** is in the header of the POR-3 Skill Summary card,
      since that rollup is what a bio would be written from. It is hidden
      with the card when there are no verified services. It sends
      `{ kind: "bio" }`.
    - **"Generate caption"** is in the service detail modal. It sends
      `{ kind: "caption", service_id }`. Each reply is stored against its
      service, so it doesn't carry over to the next service opened.

    The stub ignores the body for now. `kind`/`service_id` are there so a
    real model integration gets a request it can act on. When KAI is off
    (503), both buttons fall back to "not yet available", the same as KAI-2.
    Nothing KAI returns is written to the portfolio.

- [x] **KAI-4** — KAI Insights card on the educator dashboard
  - **Depends on:** KAI-1
  - Mirror the existing admin-dashboard KAI Insights placeholder card on the
    educator dashboard (currently admin-only).
  - **Files:** `client/app/educator/dashboard/page.tsx`,
    `client/app/admin/dashboard/page.tsx` (pattern reference),
    `server/src/routes/kai/index.ts`.
  - **Done:** The admin card reads the flag from `GET /api/admin/settings`,
    which is `super_admin`-only, so educators can't use it. Added `GET
    /api/kai/status` → `{ enabled }` to `server/src/routes/kai/index.ts`,
    open to any authenticated role (the router's existing `requireAuth`
    mount). It reuses the router's `kaiEnabled()` helper and is read-only, so
    it exposes only that one flag, not the other settings.
    `client/app/educator/dashboard/page.tsx` has a dashed "KAI Insights" card
    (`Sparkles` icon) between the quick actions and Pending Reviews. It uses
    `rounded-3xl` to match that page's other top-level cards. The flag is
    fetched separately from the dashboard's `Promise.all`, and a failure
    falls back to the "off" copy, so a KAI error never blanks the dashboard.
    The copy differs from the admin card: educators can't reach Settings, so
    the "off" state says their administrator can switch KAI on, and the "on"
    state says verification decisions stay with the educator (the KAI hard
    constraint). No insights are generated; it is a placeholder only.

- [ ] **KAI-5** — KAI Match placeholder (Kosmè Connect)
  - **Depends on:** KAI-1, CON-2
  - Lowest priority — deferred past MVP. Placeholder only, once manual
    matching (**CON-2**) exists to attach it to.
  - **Files:** `client/app/admin/clients/page.tsx`.

---

## Reports & Analytics (RPT)

Replaces the stub at `client/app/admin/reports/page.tsx`.

- [x] **RPT-1** — Reports & Analytics tracer slice
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
  - **Done:** One read-only endpoint, `GET /api/admin/reports?include_demo=`
    in new `server/src/routes/admin/reports.ts` (mounted in
    `admin/index.ts`, so it is behind the existing `super_admin` gate). It
    returns four things. First, service counts per pipeline status. Second,
    verified totals. Third, per-cohort rows (students, verified services,
    verified minutes, `awaiting_educator` count), plus a "No cohort" row for
    unplaced students. Fourth, timing counts: all-time
    `under`/`within`/`over`, the number of timed services with no
    recommended range, and an 8-week trend bucketed by the Monday of
    `ended_at`. Verified means `status = 'verified'` (VER-9). A verified
    service's minutes are `adjusted_duration_min ?? actual_duration_min`.
    Verified services logged without the timer have neither value, so they
    are counted as "untimed" and not as 0 hours. Services are read in
    1000-row pages, because Supabase's default row cap would otherwise
    undercount the totals. No migration.
    `client/app/admin/reports/page.tsx` replaces the stub. It has headline
    tiles, a pipeline card with a bar per status, a timing card, and a
    per-cohort table with an inline hours bar. The timing card has a legend
    with counts and percentages, a 100% stacked bar, and weekly stacked
    columns with a hover/focus tooltip. The page also has an "Include demo"
    toggle. Charts are plain Tailwind divs, with no new chart dependency.
    Timing tags use the educator verify page's amber/emerald/red colors, and
    each color also has a text label. `ModuleStub.tsx` is deleted because
    nothing else used it.

---

## Cleanup (CLN)

- [x] **CLN-1** — Audit duplicate role folders under `client/app`
  - **Depends on:** none
  - `client/app` has both singular and plural folders for three roles
    (`student`/`students`, `educator`/`educators`, `employer`/`employers`).
    Confirm which of each pair is the authenticated dashboard vs. a public
    marketing page, document the split (or consolidate naming) so other
    issues (POR-5, ALT-3/4, KAI-4) reference the correct one unambiguously.
  - **Files:** `client/app/student*`, `client/app/educator*`,
    `client/app/employer*`.
  - **Done:** The audit found four pairs, not three. The `client` role also
    has one, and it doesn't follow the singular/plural pattern: its dashboard
    is `volunteer/` and its marketing page is `clients/`. In every pair the
    singular folder is the authenticated dashboard, with a role-gated
    `layout.tsx` and an index that redirects to `/<role>/dashboard`. The
    plural folder is a public marketing page (`Nav`/`Footer` shell, listed
    in `middleware.ts`'s public routes). `/clients` also hosts the
    volunteer-client signup form. Consolidated by moving the home page and
    the four marketing pages into a `client/app/(marketing)/` route group.
    Route groups don't change URLs, so `/`, `/students`, `/educators`,
    `/clients` and `/employers` still resolve as before, and no links or
    middleware entries changed. `middleware.ts` has a comment to keep its
    public-route list in sync with `(marketing)/`. The dashboards stay at
    the top level of `client/app`. `login/`, `signup/` and `demo/` also stay
    top-level as public entry flows, not marketing pages. The split is
    documented in `CLAUDE.md` (Client structure) and
    `docs/DESIGN_RULES.md` §8. Existing references checked: POR-5
    (`client/app/employer/browse/[studentId]/`) and ALT-3/4
    (`client/app/educator/layout.tsx`) already pointed at the dashboards.
    KAI-4's Files now names `client/app/educator/dashboard/page.tsx`
    explicitly.

---

## Ops / Deployment (OPS)

- [x] **OPS-1** — Apply pending migrations to the live Supabase project
  - **Depends on:** none
  - Migrations `0014`–`0018` (and every new migration added by issues above)
    still need to be applied to the live environment. Blocks real usability of
    everything already built, not just new work.
  - **Files:** `supabase/migrations/*`.
  - **Done:** Confirmed 2026-09-22 that every migration through
    `0024_educator_decisions.sql` is applied to the live project. Any
    migration added after `0024` still has to be applied live as part of the
    issue that adds it.

- [x] **OPS-2** — Run seed scripts against the live environment
  - **Depends on:** OPS-1
  - Run `npm run seed:super-admin` and `npm run seed:demo` against the real
    Clerk/Supabase project once migrations are applied.
  - **Files:** `server/src/scripts/seed-super-admin.ts`,
    `server/src/scripts/seed-demo-accounts.ts`.
  - **Done:** Both run 2026-09-22 against the project in `server/.env`, which
    is a Clerk **development** instance (`sk_test_`). The first
    `seed:super-admin` run used a placeholder `@example.com` account. It was
    re-run the same day with the real admin email. If the app moves to a
    production Clerk instance, both scripts need running again there.

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
