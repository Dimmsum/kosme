import "dotenv/config";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

// Password-login test accounts, one per role (super_admin included), with
// enough seeded data that every dashboard has something on it.
// Run with: npm run seed:test   (from server/)
//
// These are NOT the public demo accounts (seed-demo-accounts.ts): they log in
// through /login with an email + password and are is_demo = false, so they
// sit on the real side of the demo boundary. Their data is scoped to a
// dedicated "Kosmè Test Academy" institution/programme/cohort.
//
// The passwords are deliberately simple, so the script refuses to run
// against a live Clerk instance (sk_live_ key) unless ALLOW_LIVE_SEED=true.
//
// Idempotent: re-running resets each account's password to the one below
// and deletes and re-creates the test student's services (plus their
// confirmations, verifications, events, consent records and flags), so the
// data always returns to the same known state.

const TEST_INSTITUTION_ID = "00000000-0000-0000-0000-0000000075e1";
const TEST_PROGRAMME_ID = "00000000-0000-0000-0000-0000000075e2";
const TEST_COHORT_ID = "00000000-0000-0000-0000-0000000075e3";

type Role = "student" | "educator" | "client" | "employer" | "super_admin";

const TEST_ACCOUNTS: {
  role: Role;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}[] = [
  { role: "student", email: "test-student@kosme.app", password: "kosme-student", firstName: "Tasha", lastName: "Student" },
  { role: "educator", email: "test-educator@kosme.app", password: "kosme-educator", firstName: "Evan", lastName: "Educator" },
  { role: "client", email: "test-client@kosme.app", password: "kosme-client", firstName: "Carla", lastName: "Client" },
  { role: "employer", email: "test-employer@kosme.app", password: "kosme-employer", firstName: "Emma", lastName: "Employer" },
  { role: "super_admin", email: "test-admin@kosme.app", password: "kosme-admin", firstName: "Adam", lastName: "Admin" },
];

type ClientSource =
  | "friend_family"
  | "school_assigned"
  | "walk_in_client_day"
  | "salon_placement"
  | "kosme_volunteer"
  | "other";

// The test student's service history. `withTestClient` services name the test
// client account as their client (so they appear in the client's queues);
// the rest have an off-platform client. Service type names must match rows
// seeded by migration 0018_seed_service_types.sql.
const TEST_SERVICES: {
  category: string;
  type: string;
  status: "awaiting_client" | "awaiting_educator" | "corrections_requested" | "verified";
  daysAgo: number;
  durationMin: number;
  adjustedDurationMin?: number;
  withTestClient: boolean;
  clientSource: ClientSource;
  notes: string;
  reflection?: string;
  educatorNotes?: string;
}[] = [
  {
    category: "Haircuts", type: "Cut & Blow-dry", status: "verified", daysAgo: 21, durationMin: 65,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Shoulder-length one-length cut with a smooth blow-dry finish.",
    reflection: "Kept my sections tidy this time. Need to speed up the blow-dry.",
    educatorNotes: "Clean baseline and even tension. Well done.",
  },
  {
    category: "Colour", type: "Root Touch-up", status: "verified", daysAgo: 14, durationMin: 80, adjustedDurationMin: 70,
    withTestClient: false, clientSource: "friend_family",
    notes: "Permanent root touch-up, 6N with 20 vol, 3cm regrowth.",
    reflection: "Application was neat but I lost time mixing a second bowl.",
    educatorNotes: "Good coverage. Adjusted time to exclude the re-mix.",
  },
  {
    category: "Blow-dry", type: "Round-brush Blow-dry", status: "verified", daysAgo: 9, durationMin: 50,
    withTestClient: false, clientSource: "school_assigned",
    notes: "Voluminous round-brush blow-dry on medium-length hair.",
    reflection: "Volume at the crown held well. Ends could be smoother.",
    educatorNotes: "Nice lift at the root.",
  },
  {
    category: "Braiding", type: "Cornrows", status: "verified", daysAgo: 4, durationMin: 120,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Six straight-back cornrows, natural hair.",
    reflection: "Partings were straight. My hands got tired near the end.",
    educatorNotes: "Consistent tension and clean parts.",
  },
  {
    category: "Styling", type: "Curls / Waves", status: "awaiting_educator", daysAgo: 2, durationMin: 55,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Loose beach waves with a 32mm wand.",
    reflection: "Alternated wave direction around the face. Happy with the result.",
  },
  {
    category: "Colour", type: "Toner / Gloss", status: "awaiting_educator", daysAgo: 1, durationMin: 55,
    withTestClient: false, clientSource: "salon_placement",
    notes: "Violet toner on pre-lightened ends.",
    reflection: "Went over time because I waited too long to rinse. Will set a timer next time.",
  },
  {
    category: "Scalp Treatments", type: "Scalp Massage & Treatment", status: "corrections_requested", daysAgo: 6, durationMin: 25,
    withTestClient: false, clientSource: "friend_family",
    notes: "Exfoliating scalp treatment with a massage.",
    reflection: "Client said it was relaxing.",
    educatorNotes: "Please say which product you used and why, and add an after photo.",
  },
  {
    category: "Haircuts", type: "Fringe Trim", status: "awaiting_client", daysAgo: 0, durationMin: 18,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Blunt fringe trim, eyebrow length.",
  },
];

async function findExistingClerkUser(email: string) {
  const { data } = await clerkClient.users.getUserList({ emailAddress: [email] });
  return data[0] ?? null;
}

async function seedAccount(entry: (typeof TEST_ACCOUNTS)[number]): Promise<string> {
  const { role, email, password, firstName, lastName } = entry;

  let clerkUser = await findExistingClerkUser(email);
  if (!clerkUser) {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      skipPasswordChecks: true,
      publicMetadata: { role },
    });
    console.log(`Created Clerk user for ${role}: ${clerkUser.id}`);
  } else {
    await clerkClient.users.updateUserMetadata(clerkUser.id, { publicMetadata: { role } });
    // Reset the password so it always matches the one documented above.
    await clerkClient.users.updateUser(clerkUser.id, { password, skipPasswordChecks: true });
    console.log(`Reusing existing Clerk user for ${role}: ${clerkUser.id}`);
  }

  const inSchool = role === "student" || role === "educator";
  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        clerk_id: clerkUser.id,
        full_name: `${firstName} ${lastName}`,
        role,
        is_demo: false,
        status: "active",
        institution_id: inSchool ? TEST_INSTITUTION_ID : null,
        programme_id: role === "student" ? TEST_PROGRAMME_ID : null,
        cohort_id: role === "student" ? TEST_COHORT_ID : null,
      },
      { onConflict: "clerk_id" },
    )
    .select("id")
    .single();

  if (error || !profile) {
    throw new Error(`Failed to upsert user_profiles for ${role}: ${error?.message}`);
  }
  return profile.id as string;
}

async function must<T>(label: string, query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function seedStructure() {
  await must(
    "institutions",
    supabaseAdmin.from("institutions").upsert({
      id: TEST_INSTITUTION_ID,
      name: "Kosmè Test Academy",
      contact_email: "test-admin@kosme.app",
      is_active: true,
    }),
  );
  await must(
    "programmes",
    supabaseAdmin.from("programmes").upsert({
      id: TEST_PROGRAMME_ID,
      institution_id: TEST_INSTITUTION_ID,
      name: "Test Cosmetology Programme",
      description: "Seeded by seed-test-accounts.ts for manual testing.",
      required_services_count: 10,
    }),
  );
  await must(
    "cohorts",
    supabaseAdmin.from("cohorts").upsert({
      id: TEST_COHORT_ID,
      programme_id: TEST_PROGRAMME_ID,
      name: "Test Cohort 2026",
      start_date: "2026-01-12",
      end_date: "2026-12-18",
    }),
  );
}

async function resetStudentServices(studentId: string) {
  const existing = await must(
    "load existing services",
    supabaseAdmin.from("services").select("id").eq("student_id", studentId),
  );
  const ids = (existing ?? []).map((s) => s.id as string);
  if (ids.length === 0) return;

  // consent_records and flags reference services without a FK, so they don't
  // cascade. Photos, confirmations, verifications and events do.
  await must(
    "delete consent_records",
    supabaseAdmin.from("consent_records").delete().eq("subject_type", "service").in("subject_id", ids),
  );
  await must(
    "delete flags",
    supabaseAdmin.from("flags").delete().eq("entity_type", "service").in("entity_id", ids),
  );
  await must("delete services", supabaseAdmin.from("services").delete().in("id", ids));
  console.log(`Removed ${ids.length} previous test services.`);
}

function durationTag(minutes: number, min: number | null, max: number | null): "under" | "within" | "over" | null {
  if (min == null || max == null) return null;
  if (minutes < min) return "under";
  if (minutes > max) return "over";
  return "within";
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function seedServices(ids: Record<Role, string>) {
  const studentId = ids.student;
  const educatorId = ids.educator;
  const clientId = ids.client;
  const now = new Date();

  const types = await must(
    "load service_types",
    supabaseAdmin.from("service_types").select("id, category_id, name, recommended_duration_min, recommended_duration_max"),
  );

  for (const svc of TEST_SERVICES) {
    const type = (types ?? []).find((t) => t.category_id === svc.category && t.name === svc.type);
    if (!type) {
      throw new Error(`Service type "${svc.category} / ${svc.type}" not found — has migration 0018 been applied?`);
    }

    // Started mid-morning `daysAgo` days back (a couple of hours ago for today).
    const startedAt = new Date(now);
    startedAt.setDate(startedAt.getDate() - svc.daysAgo);
    if (svc.daysAgo === 0) startedAt.setTime(now.getTime() - 2 * 60 * 60_000);
    else startedAt.setHours(10, 0, 0, 0);
    const endedAt = addMinutes(startedAt, svc.durationMin);
    const decidedAt = svc.daysAgo === 0 ? endedAt : addMinutes(endedAt, 60 * 20);

    const service = await must(
      `insert service ${svc.type}`,
      supabaseAdmin
        .from("services")
        .insert({
          student_id: studentId,
          client_id: svc.withTestClient ? clientId : null,
          client_source: svc.clientSource,
          category_id: svc.category,
          service_type_id: type.id,
          name: svc.type,
          notes: svc.notes,
          reflection_notes: svc.reflection ?? null,
          status: svc.status,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          actual_duration_min: svc.durationMin,
          adjusted_duration_min: svc.adjustedDurationMin ?? null,
          duration_tag: durationTag(svc.durationMin, type.recommended_duration_min, type.recommended_duration_max),
          created_at: startedAt.toISOString(),
          updated_at: (svc.status === "awaiting_client" ? endedAt : decidedAt).toISOString(),
        })
        .select("id")
        .single(),
    );
    const serviceId = service!.id as string;

    await must(
      "insert consent_record",
      supabaseAdmin.from("consent_records").insert({
        subject_type: "service",
        subject_id: serviceId,
        photo_consent: true,
        captured_at: startedAt.toISOString(),
      }),
    );

    // The test client has confirmed everything past awaiting_client.
    if (svc.withTestClient && svc.status !== "awaiting_client") {
      await must(
        "insert confirmation",
        supabaseAdmin.from("confirmations").insert({
          service_id: serviceId,
          volunteer_id: clientId,
          status: "confirmed",
          created_at: addMinutes(endedAt, 30).toISOString(),
        }),
      );
      await must(
        "insert confirmation event",
        supabaseAdmin.from("events").insert({
          tier: "priority",
          event_type: "confirmation_completed",
          student_id: studentId,
          service_id: serviceId,
          message: `Client confirmed "${svc.type}".`,
          created_at: addMinutes(endedAt, 30).toISOString(),
        }),
      );
    }

    if (svc.status === "verified" || svc.status === "corrections_requested") {
      await must(
        "insert verification",
        supabaseAdmin.from("verifications").insert({
          service_id: serviceId,
          educator_id: educatorId,
          status: svc.status,
          notes: svc.educatorNotes ?? null,
          created_at: decidedAt.toISOString(),
        }),
      );
    }

    if (svc.status === "awaiting_educator") {
      await must(
        "insert ready event",
        supabaseAdmin.from("events").insert({
          tier: "priority",
          event_type: "ready_for_verification",
          student_id: studentId,
          service_id: serviceId,
          message: `"${svc.type}" is ready for verification.`,
          created_at: addMinutes(endedAt, 60).toISOString(),
        }),
      );
      if (svc.durationMin > (type.recommended_duration_max ?? Infinity)) {
        // Something open in the admin Flagged Issues module.
        await must(
          "insert flag",
          supabaseAdmin.from("flags").insert({
            entity_type: "service",
            entity_id: serviceId,
            reason: "Logged time is well over the recommended range. Please check the timer wasn't left running.",
            created_by: educatorId,
          }),
        );
      }
    }
  }
  console.log(`Seeded ${TEST_SERVICES.length} services for the test student.`);
}

async function seedRelationships(ids: Record<Role, string>) {
  await must(
    "educator_assignments",
    supabaseAdmin
      .from("educator_assignments")
      .upsert({ educator_id: ids.educator, cohort_id: TEST_COHORT_ID }, { onConflict: "educator_id,cohort_id" }),
  );
  await must(
    "shortlist",
    supabaseAdmin
      .from("shortlist")
      .upsert({ employer_id: ids.employer, student_id: ids.student }, { onConflict: "employer_id,student_id" }),
  );
  await must(
    "volunteer_requests",
    supabaseAdmin.from("volunteer_requests").upsert(
      {
        student_id: ids.student,
        volunteer_id: ids.client,
        status: "pending",
        message: "Happy to be a model for colour or braiding. Free most weekday afternoons.",
      },
      { onConflict: "student_id,volunteer_id" },
    ),
  );
}

async function main() {
  if (process.env.CLERK_SECRET_KEY?.startsWith("sk_live_") && process.env.ALLOW_LIVE_SEED !== "true") {
    console.error(
      "Refusing to seed simple-password test accounts into a live Clerk instance.\n" +
        "Set ALLOW_LIVE_SEED=true if you really mean to.",
    );
    process.exit(1);
  }

  await seedStructure();

  const ids = {} as Record<Role, string>;
  for (const entry of TEST_ACCOUNTS) {
    ids[entry.role] = await seedAccount(entry);
  }

  await seedRelationships(ids);
  await resetStudentServices(ids.student);
  await seedServices(ids);

  console.log("\nTest accounts ready (log in at /login):");
  console.table(TEST_ACCOUNTS.map(({ role, email, password }) => ({ role, email, password })));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
