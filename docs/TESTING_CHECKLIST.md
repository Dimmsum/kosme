# Browser Testing Checklist — Stakeholder Feedback Round

Covers everything raised in `client-feedback.md`, `student-feedback.md`, `educator-feedback.md`, `employer-feedback.md` and `superadmin-feedback.md`.
Tick `[x]` when it passes. If it fails, leave unticked and add a note under the item with `FAIL:` and what you saw.

## 0. Setup

- [x] Migrations `0031`–`0036` applied to the environment under test
- [x] `npm run seed:test` run (from `server/`); `npm run dev` running (client :3000, server :3001)
- [ ] Use a separate browser profile/window per role (or an incognito window) so sessions don't collide
- [ ] Keep DevTools Console and Network open; note any red errors or 4xx/5xx during each section

Test accounts (password login at `/login`, passwords from your `.env`):

| Role                 | Email                                    |
| -------------------- | ---------------------------------------- |
| Student (Tasha)      | `test-student+clerk_test@kosme.app`      |
| Educator (Evan)      | `test-educator+clerk_test@kosme.app`     |
| Client (Carla)       | `test-client+clerk_test@kosme.app`       |
| Employer (Emma)      | `test-employer+clerk_test@kosme.app`     |
| Super Admin (Adam)   | `test-admin+clerk_test@kosme.app`        |
| School Admin (Sasha) | `test-school-admin+clerk_test@kosme.app` |

---

## 1. Auth & role gating (all roles)

- [ ] **1.1** Each of the 6 accounts logs in and lands on its own dashboard (student, educator, volunteer/client, employer, admin, school-admin)
- [x] **1.2** While logged in as Student, visit `/admin/dashboard`, `/educator/dashboard`, `/employer/dashboard`, `/school-admin/dashboard` → redirected back to the student dashboard each time
- [ ] **1.3** Repeat 1.2 for each other role (no role can open another role's section)
- [ ] **1.4** Logged out, visit `/student/dashboard` → redirected to `/login`

RESULT:

- When logged out and navigate to /student/dashboard, im redirected to https://unique-raccoon-21.accounts.dev/sign-in?redirect_url=https%3A%2F%2Fkosme-frontend-staging.up.railway.app%2Fstudent%2Fdashboard . this shows a clerk page instead of our /login.

- [x] **1.5** Logged out, public pages load: `/`, `/students`, `/educators`, `/clients`, `/employers`

---

## 2. Student (`student-feedback.md`)

### 2.1 Log a new service (bug: "name and category_id are required")

- [x] Go to `/student/services/new`, pick a category and service, fill the form, submit → saves with no `API 400` error

- [x] New service appears in the services list with the correct name and category

- [x] Try submitting with the service name empty → clear validation message (not a raw API error)

### 2.2 Photo upload (bug: "Could not upload your photos")

- [x] Open a service, select 1 photo → appears under "Ready to upload"
- [ ] Click "Upload 1 photo" → succeeds, photo appears in the evidence gallery
- [ ] Select and upload 3+ photos with before/during/after stage tags → all upload, stages shown correctly
- [ ] Upload a wrong file type (e.g. `.pdf`) → friendly error, no crash
- [ ] Upload an oversized image → friendly error or accepted, no crash
- [ ] After the service is verified, uploads are locked (no upload control)

### 2.3 Timer — Start / Stop service

- [ ] Click Start Service → **immediately** button becomes "Stop Service"
- [ ] Toast/status message: "Timer started — <service name> is now being recorded"
- [ ] Live running time shown on the page (e.g. "Service in progress — 00:14:37"), updates every second
- [ ] Navigate to Dashboard, Progress, Portfolio, Profile → a persistent timer bar stays visible on every student page
- [ ] The bar names the service being timed
- [ ] The bar has a working Stop Service action
- [ ] Try to start a second service while one is running → blocked or warned
- [ ] Refresh the browser mid-timer → timer restores with the correct elapsed time (from server start time)
- [ ] Log out, log back in → timer still running with correct elapsed time
- [ ] Stop the timer → bar disappears, duration saved, duration tag (shorter/typical/longer) shown on the service
- [ ] Checkpoint reminders appear during a long active service (if configured)

### 2.4 My Progress — full required practical list (`/student/progress`)

- [ ] Overall total shown (e.g. 4/63) and category cards (Blow-dry 1/8, Braiding 1/5…)
- [ ] Category cards show their configured category colour
- [ ] Clicking a category card (e.g. Braiding) opens/expands that category's full requirement list
- [ ] Each required service listed with its status (Completed / Outstanding / Awaiting client / Awaiting verification)
- [ ] An "all required practicals" view exists showing all 63 across every category
- [ ] Filter tabs: All | Outstanding | In Progress | Awaiting Verification | Completed
- [ ] Each filter shows only the matching services; counts add up to the total
- [ ] Per-category progress (x/y) matches the number of Completed rows in it
- [ ] Services awaiting client confirmation are visibly distinct from those awaiting educator verification

### 2.5 Find a client & book an appointment (`/student/volunteers`)

- [ ] Page lists volunteer clients (not just a flat listing)
- [ ] Open a volunteer's profile → shows bio, services they are willing to receive, location
- [ ] Availability days/times visible
- [ ] Send an in-app message to the volunteer → appears in the thread
- [ ] Request an appointment: pick a required practical/service, date, time, location, estimated duration → submits
- [ ] Appointment shows status **Pending Client Response**
- [ ] Phone numbers / emails are not exposed anywhere in this flow

### 2.6 Student side of appointments

- [ ] Upcoming Appointments/Schedule area lists confirmed appointments
- [ ] Statuses display correctly: Pending Client Response, Pending Student Response, Confirmed, Reschedule Requested, Cancelled, Awaiting Client Confirmation, Service Completed
- [ ] From a confirmed appointment: Message works
- [ ] From a confirmed appointment: Reschedule works
- [ ] On the appointment date, open the booking → "Start Service" starts the timer pre-linked to that booking and service
- [ ] After Stop, booking moves to **Awaiting Client Confirmation**

### 2.7 Add My Client (`/student/clients`)

- [ ] Add a client by name/email → client record created
- [ ] A shareable invite link is generated; copy button works
- [ ] Create an appointment for that client → status **Pending Client Response**
- [ ] (Client side) open the invite link in another browser → `/invite` flow claims the student, client sees the booking
- [ ] Client confirms the booking → becomes Confirmed and appears under the student's schedule

### 2.8 Fix a flagged entry (item 6)

- [ ] A service returned/flagged by educator shows a clear "Needs correction" state with the reason
- [ ] There is an obvious Edit/Fix action; make a change and resubmit → status moves back to awaiting verification
- [ ] Edit doesn't create a duplicate entry

### 2.9 "Awaiting client" navigation (item 7)

- [ ] Click an "Awaiting client" item on the dashboard/progress list → opens **that** service (not "my recent service")
- [ ] Browser Back returns to where you came from

---

## 3. Client / Volunteer (`client-feedback.md`)

### 3.1 Dashboard leads with the journey

- [ ] `/volunteer/dashboard` primary action is **Find a Service / Student** (not services already received)
- [ ] Upcoming Services shown next; History is not the main focus
- [ ] Past services live under History (`/volunteer/history`)

### 3.2 Find a student (`/volunteer/browse`)

- [ ] Search students/services by text
- [ ] Filters work: service, location, availability, institution
- [ ] Combining filters narrows results; clearing resets
- [ ] Empty state is friendly when nothing matches
- [ ] Open a student → profile at `/volunteer/browse/[studentId]`
- [ ] Student's **verified** portfolio visible before requesting (only approved work, no unverified services)
- [ ] Student availability visible

### 3.3 Request an appointment

- [ ] Request a service from a student profile (service, date, time, location, notes)
- [ ] Booking shows **Pending Student Response**
- [ ] Student account sees it and can Accept / Decline / Suggest another time
- [ ] Student accepts → status **Confirmed** on both sides, appears under Upcoming Services for both
- [ ] Student suggests another time → **Reschedule Requested**; client can accept or counter
- [ ] Student declines → **Cancelled** on both sides

### 3.4 Upcoming Services (`/volunteer/appointments`)

- [ ] Requested and confirmed appointments listed
- [ ] View service details
- [ ] Message the student (`/volunteer/messages`) — thread shared with the student view
- [ ] Incoming request from a student: Accept / Decline / Suggest another time all work
- [ ] Reschedule and Cancel available where appropriate (and not on completed ones)

### 3.5 Confirm service completion (`/volunteer/confirmations`)

- [ ] After the student stops the service, the client sees a confirmation request
- [ ] Buttons read **Confirm Service** and **Report an Issue** (no "Dispute" anywhere)
- [ ] Confirm Service → success; the item leaves the pending list
- [ ] Report an Issue → reason picker: Service was cancelled / Service was incomplete / I did not receive this service / Service details are incorrect / Other
- [ ] "Other" allows free text
- [ ] Submitting an issue flags the record for review; it does **not** auto-invalidate the student's submission

### 3.6 Journey end-to-end (the key test)

Run once in two browsers (student + client):

- [ ] Client finds student → views portfolio → requests → student accepts (Confirmed)
- [ ] Student starts service from the booking → adds evidence → stops
- [ ] Booking = Awaiting Client Confirmation
- [ ] Client confirms → booking = Service Completed → moves into client **History**
- [ ] Student sees the service as client-confirmed and can submit it for verification
- [ ] Educator sees it in the Verification Studio only now (see §4)
- [ ] Educator approves → service appears in student's portfolio and counts in Progress

---

## 4. Educator (`educator-feedback.md`)

### 4.1 Verification Studio only shows decision-ready work (`/educator/verify`)

- [ ] A service that is "Awaiting Client" does **not** appear in the queue
- [ ] A service appears only once it is Ready for Educator Verification (client confirmed + submitted)
- [ ] Table columns: Student | Service | Date Completed | Client Confirmed | Evidence | Logged Time | Verification Status | Review
- [ ] Every row in the queue can actually be actioned
- [ ] Earlier-stage work is visible separately (Student Activity / Pending Client Confirmation), not in the queue
- [ ] Only students in the educator's assigned cohorts appear

### 4.2 View button works (bug: unresponsive actions)

- [ ] Click **View/Review** on a ready service → submission details open (photos, reflection, timer/duration, client confirmation)
- [ ] Approve works → status Verified; row leaves the queue
- [ ] Adjust hours works and is reflected in the student's verified hours
- [ ] Request corrections (with reason) works → student sees it (see §2.8)
- [ ] Click every button on the educator dashboard (cards, links, tabs) — none are dead
- [ ] Console shows no errors on these clicks

### 4.3 Student profile → View Portfolio

- [ ] `/educator/students` → click a student → profile with progress info
- [ ] Clear **View Portfolio** button next to progress
- [ ] Button opens `/educator/students/[studentId]/portfolio` with the student's portfolio

### 4.4 Educator bookings (`/educator/bookings`)

- [ ] Shows bookings for students in the educator's cohorts only
- [ ] Booking statuses display correctly
- [ ] Flag a booking with a reason → confirmation shown
- [ ] The flag appears in Super Admin → Flagged Issues as an `appointment`

---

## 5. Employer (`employer-feedback.md`)

### 5.1 Portfolio opens work-first (`/employer/browse/[studentId]`)

- [ ] Browse students at `/employer/browse`, open one
- [ ] Header shows: student name, institution, Verified Services, Verified Hours, Categories
- [ ] Header has **Shortlist** and **Copy/Share Portfolio Link**
- [ ] Copy link works; pasting it in a fresh tab opens the portfolio (for a logged-in employer)
- [ ] Immediately under the header is **VERIFIED PORTFOLIO** — large photos grouped by service ("Cornrows — Braiding · Verified")
- [ ] Skill Summary is **not** in the main portfolio feed
- [ ] Tabs: **Portfolio | Skills & Verification | Experience/Profile**, Portfolio selected by default
- [ ] Skills & Verification tab shows categories, number completed, verified hours, verified techniques
- [ ] Clicking a portfolio item opens the full service record with additional images and verified details
- [ ] The old large green "Every service shown here was verified…" banner is gone; a small Verified Portfolio badge sits near the student name
- [ ] Only approved services appear; photos without consent are hidden

### 5.2 Summary cards

- [ ] Exactly three wide cards: Verified Services | Verified Hours | Skill Categories
- [ ] **No** "Educators" metric anywhere on the employer-facing page
- [ ] Each service still shows its Verified badge

### 5.3 Shortlist & profile

- [ ] Shortlist from the portfolio page → appears on `/employer/shortlist`
- [ ] Remove from the shortlist works
- [ ] `/employer/profile`: fill in Business name, Contact person, Location, Business type → saves and persists on reload
- [ ] Layout is usable on a narrow/mobile viewport

---

## 6. Super Admin (`superadmin-feedback.md`)

### 6.1 School Admin role & Manage User (`/admin/users`)

- [ ] School Admin is available as a role in the filter and in create/edit
- [ ] Open a **Student**: Institution, Programme, Cohort, Student ID, Account status, progress/service record — no unrelated fields
- [ ] Open an **Educator**: Institution, multiple Programmes and Cohorts (multi-select), Staff ID, Account status, assigned students
- [ ] Open a **School Admin**: Institution, programmes they administer, access level, Account status
- [ ] Open a **Client**: contact details, parish/location, services volunteered for, availability, approval status, appointment history
- [ ] Open an **Employer**: employer-appropriate fields (no Institution/Programme/Cohort)
- [ ] Fields not relevant to a role do not appear

### 6.2 Suspend vs delete

- [ ] Suspend a test user → they can't use the app (log in as them → blocked)
- [ ] Reactivate → access restored
- [ ] Delete User → step 1 warning listing the records affected
- [ ] Step 2 requires typing the user's name to confirm; wrong name keeps the button disabled
- [ ] After deletion, user can't log in; their services/verifications/appointments are retained (anonymised)
- [ ] Suspend and delete are both recorded in Audit Log (`/admin/audit`)

### 6.3 Institutions, Programmes & Cohorts (`/admin/institutions`)

- [ ] Add a programme: name, qualification type, level, duration, awarding body, start/end dates, status
- [ ] Set programme capacity and cohort capacity
- [ ] "Subscription & usage" panel shows allocation (max programmes/students, status, period) vs current usage
- [ ] Exceed a limit (add programme / place student beyond capacity) → blocked with a clear 409 message
- [ ] Expired/cancelled subscription blocks new additions
- [ ] Blank limit = unlimited

### 6.4 Educator assignments inside Institutions

- [ ] No separate "Educator Assignments" nav item; `/admin/educators` redirects to Institutions
- [ ] Select a cohort → panel shows assigned educators and its students
- [ ] Assign and remove an educator from the cohort panel
- [ ] Cohort row shows educators, or amber "No educator assigned"
- [ ] Educators from another institution are flagged "(other institution)" in the picker
- [ ] Newly assigned educator sees only that cohort's students (log in as them to verify)

### 6.5 Programme requirements & templates

- [ ] Master Service Catalogue forms no longer have Required Count / Required Hours; Recommended Duration remains
- [ ] **Requirements** button per programme opens the editor (scope: programme / category / service; counts and hours)
- [ ] Set a requirement set with an effective-from date
- [ ] `/admin/programme-templates`: create a reusable template
- [ ] Apply a template to one programme, several selected programmes, and "all using this template"
- [ ] After applying, edit one programme's copy → other programmes unaffected
- [ ] Add a new requirement set effective in the **future** → existing cohort's student progress unchanged; a cohort starting after that date uses the new set
- [ ] Student Progress totals (e.g. x/63) reflect the programme's set

### 6.6 Service Catalogue (`/admin/service-catalog`)

- [ ] Categories grouped in collapsible sections: Hair, Skin, Nails, Makeup, Barbering, Spa / Body
- [ ] Expand all / Collapse all work; single section expands independently
- [ ] Create/rename a section ("New Section")
- [ ] Category form says **Category name** (not "Label")
- [ ] Category has a Description field
- [ ] Colour picker changes the category colour; swatch updates; student Progress cards reflect it
- [ ] New category: no ID field to fill in; ID is generated
- [ ] Edit category: ID shown read-only with explanation
- [ ] Move a category between sections

### 6.7 Employer management (`/admin/employers`)

- [ ] List shows business name, contact person, location, business type, verification status, activity (shortlist count, last shortlisted)
- [ ] Search + filters (access, verification, type) work
- [ ] Edit employer details and set verification status
- [ ] Suspend an employer → they lose access; Reactivate → restored
- [ ] Manage account opens the shared user drawer, including layered delete

### 6.8 Practical Submissions (`/admin/submissions`)

- [ ] Cascading filters: Institution → Programme → Cohort → Student (each narrows the next)
- [ ] Additional filters: service category, status (incl. In progress, Corrections requested), date range
- [ ] Results update correctly when filters change; clear-all resets
- [ ] Truncation notice appears if over 500 rows

### 6.9 Booking oversight

- [ ] Flags raised by educators / school admins appear in `/admin/flags` as `appointment`
- [ ] Client "Report an Issue" flags appear in the same queue
- [ ] Resolve a flag → status changes, audit log entry written

---

## 7. School Admin (new role)

- [ ] `/school-admin/dashboard` loads for the School Admin only
- [ ] Sees only their own institution's data (people, submissions, bookings)
- [ ] `/school-admin/people` lists the institution's students/educators; read-only
- [ ] `/school-admin/submissions` lists the institution's submissions only
- [ ] `/school-admin/bookings` lists the institution's bookings with statuses
- [ ] Flag a booking → reaches the Super Admin flags queue
- [ ] With access level **view**: cannot cancel bookings
- [ ] With access level **manage** (set via Super Admin): Cancel booking becomes available and works
- [ ] A suspended School Admin cannot log in

---

## 8. Cross-role booking workflow matrix

For each row run it end-to-end across the two browsers and confirm who sees the Accept action and the status after each step.

| #       | Flow                     | Who requests | Who accepts         | Initial status           | After accept |
| ------- | ------------------------ | ------------ | ------------------- | ------------------------ | ------------ |
| [ ] 8.1 | Student → volunteer pool | Student      | Client              | Pending Client Response  | Confirmed    |
| [ ] 8.2 | Client → student         | Client       | Student             | Pending Student Response | Confirmed    |
| [ ] 8.3 | Student's own client     | Student      | Client (via invite) | Pending Client Response  | Confirmed    |

- [ ] **8.4** The requester never sees Accept/Decline on their own request (only Cancel/Message)
- [ ] **8.5** Reschedule from either side → **Reschedule Requested**; the other party can accept the new time
- [ ] **8.6** Cancel from either side → **Cancelled** on both sides; start-service is no longer offered
- [ ] **8.7** Stop timer → **Awaiting Client Confirmation**; client confirm → **Service Completed**
- [ ] **8.8** Client reports an issue instead → record flagged, student's service not auto-rejected
- [ ] **8.9** Educator and School Admin see the booking at every status but cannot accept/decline it themselves

---

## 9. Regression & sanity

- [ ] Student dashboard numbers match Progress page numbers
- [ ] Verified hours on student, educator view and employer view all agree for the same student
- [ ] Demo accounts (`/demo`) still work and only see demo data
- [ ] Hard refresh on every major page keeps you logged in (no spurious sign-out)
- [ ] No unhandled console errors during the full pass
- [ ] Spot-check at mobile width (≈390px): student services, client browse, employer portfolio, admin users
- [ ] Spot-check light/dark and keyboard tab order on the forms touched above

---

## Known limitations (do not log as bugs)

- Invite emails/SMS are not sent — the student copies the invite link
- A client invite link can be claimed by one client only
- No in-app notification of new booking requests yet
- After client confirmation, the student still submits the service to the educator manually (photos + reflection checklist)
- Employer verification status does not gate portfolio access
- School admins are view-only for people and submissions
- Billing is not implemented — subscription limits are enforced, but no payments
- KAI features are stubs behind the `kai_enabled` flag

FIXES TO BE MADE:

- there is a category "?"
- start service and log without timer button, the icons are disproportionate on smaller screens. need to inspect general design responsiveness.

- API 400: {"error":"name and category_id are required"} when trying to upload a photo and start a service.
