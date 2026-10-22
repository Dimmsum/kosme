import "dotenv/config";
import { randomUUID } from "crypto";
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
// Dev-only. The emails use Clerk's `+clerk_test` subaddress: Clerk never
// sends mail to them and accepts 424242 as every verification code, which is
// how you get past Client Trust's emailed code on a new device. That needs
// test mode, which is on by default for development instances, so the
// script refuses to run against a live Clerk instance (sk_live_ key).
//
// Passwords come from TEST_PASSWORD_<ROLE> env vars (see .env.example), never
// from the repo: staging shares the real database, and the repo is public.
//
// Idempotent: re-running resets each account's password to the env value
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
  firstName: string;
  lastName: string;
}[] = [
  { role: "student", email: "test-student+clerk_test@kosme.app", firstName: "Tasha", lastName: "Student" },
  { role: "educator", email: "test-educator+clerk_test@kosme.app", firstName: "Evan", lastName: "Educator" },
  { role: "client", email: "test-client+clerk_test@kosme.app", firstName: "Carla", lastName: "Client" },
  { role: "employer", email: "test-employer+clerk_test@kosme.app", firstName: "Emma", lastName: "Employer" },
  { role: "super_admin", email: "test-admin+clerk_test@kosme.app", firstName: "Adam", lastName: "Admin" },
];

type ClientSource =
  | "friend_family"
  | "school_assigned"
  | "walk_in_client_day"
  | "salon_placement"
  | "kosme_volunteer"
  | "other";

type PhotoStage = "before" | "during" | "after";

// Evidence photos, fetched at seed time and uploaded to the service-photos
// bucket like a real upload. Pexels photos are free to use under the Pexels
// licence (no attribution required); the Wikimedia Commons ones are CC0.
const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
const CORNROWS_SIDE =
  "https://upload.wikimedia.org/wikipedia/commons/c/c4/Cornrow_Braid_Local_Hairstyle_in_NIGERIA.jpg";
const CORNROWS_FRONT =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Cornrows.jpg/1280px-Cornrows.jpg";

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
  photos: { stage: PhotoStage; url: string }[];
}[] = [
  {
    category: "Haircuts", type: "Cut & Blow-dry", status: "verified", daysAgo: 21, durationMin: 65,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Shoulder-length one-length cut with a smooth blow-dry finish.",
    reflection: "Kept my sections tidy this time. Need to speed up the blow-dry.",
    educatorNotes: "Clean baseline and even tension. Well done.",
    photos: [{ stage: "during", url: pexels(3993453) }, { stage: "after", url: pexels(3992875) }],
  },
  {
    category: "Colour", type: "Root Touch-up", status: "verified", daysAgo: 14, durationMin: 80, adjustedDurationMin: 70,
    withTestClient: false, clientSource: "friend_family",
    notes: "Permanent root touch-up, 6N with 20 vol, 3cm regrowth.",
    reflection: "Application was neat but I lost time mixing a second bowl.",
    educatorNotes: "Good coverage. Adjusted time to exclude the re-mix.",
    photos: [{ stage: "before", url: pexels(3993314) }, { stage: "during", url: pexels(3993312) }],
  },
  {
    category: "Blow-dry", type: "Round-brush Blow-dry", status: "verified", daysAgo: 9, durationMin: 50,
    withTestClient: false, clientSource: "school_assigned",
    notes: "Voluminous round-brush blow-dry on medium-length hair.",
    reflection: "Volume at the crown held well. Ends could be smoother.",
    educatorNotes: "Nice lift at the root.",
    photos: [{ stage: "during", url: pexels(7440133) }, { stage: "after", url: pexels(7440131) }],
  },
  {
    category: "Braiding", type: "Cornrows", status: "verified", daysAgo: 4, durationMin: 120,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Six straight-back cornrows, natural hair.",
    reflection: "Partings were straight. My hands got tired near the end.",
    educatorNotes: "Consistent tension and clean parts.",
    photos: [{ stage: "during", url: pexels(28383173) }, { stage: "after", url: CORNROWS_SIDE }, { stage: "after", url: CORNROWS_FRONT }],
  },
  {
    category: "Styling", type: "Curls / Waves", status: "awaiting_educator", daysAgo: 2, durationMin: 55,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Loose beach waves with a 32mm wand.",
    reflection: "Alternated wave direction around the face. Happy with the result.",
    photos: [{ stage: "during", url: pexels(3065171) }],
  },
  {
    category: "Colour", type: "Toner / Gloss", status: "awaiting_educator", daysAgo: 1, durationMin: 55,
    withTestClient: false, clientSource: "salon_placement",
    notes: "Violet toner on pre-lightened ends.",
    reflection: "Went over time because I waited too long to rinse. Will set a timer next time.",
    photos: [{ stage: "before", url: pexels(2799605) }, { stage: "during", url: pexels(4981476) }],
  },
  {
    category: "Scalp Treatments", type: "Scalp Massage & Treatment", status: "corrections_requested", daysAgo: 6, durationMin: 25,
    withTestClient: false, clientSource: "friend_family",
    notes: "Exfoliating scalp treatment with a massage.",
    reflection: "Client said it was relaxing.",
    educatorNotes: "Please say which product you used and why, and add an after photo.",
    photos: [{ stage: "during", url: pexels(3993449) }],
  },
  {
    category: "Haircuts", type: "Fringe Trim", status: "awaiting_client", daysAgo: 0, durationMin: 18,
    withTestClient: true, clientSource: "kosme_volunteer",
    notes: "Blunt fringe trim, eyebrow length.",
    photos: [{ stage: "after", url: pexels(9849228) }],
  },
];

async function findExistingClerkUser(email: string) {
  const { data } = await clerkClient.users.getUserList({ emailAddress: [email] });
  return data[0] ?? null;
}

// Accounts seeded before the switch to +clerk_test addresses used the same
// email without the subaddress. Move those users onto the new address instead
// of creating new ones, so their clerk_id (and user_profiles row) is kept.
async function migrateLegacyEmail(email: string) {
  const legacyEmail = email.replace("+clerk_test", "");
  const legacyUser = await findExistingClerkUser(legacyEmail);
  if (!legacyUser) return null;

  await clerkClient.emailAddresses.createEmailAddress({
    userId: legacyUser.id,
    emailAddress: email,
    verified: true,
    primary: true,
  });
  const old = legacyUser.emailAddresses.find((e) => e.emailAddress === legacyEmail);
  if (old) await clerkClient.emailAddresses.deleteEmailAddress(old.id);
  console.log(`Moved ${legacyEmail} to ${email}`);
  return clerkClient.users.getUser(legacyUser.id);
}

function passwordFor(role: Role): string {
  const name = `TEST_PASSWORD_${role.toUpperCase()}`;
  const password = process.env[name];
  if (!password) throw new Error(`${name} is not set.`);
  return password;
}

async function seedAccount(entry: (typeof TEST_ACCOUNTS)[number]): Promise<string> {
  const { role, email, firstName, lastName } = entry;
  const password = passwordFor(role);

  let clerkUser = (await findExistingClerkUser(email)) ?? (await migrateLegacyEmail(email));
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
    // Reset the password so it always matches the env value.
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
      contact_email: "test-admin+clerk_test@kosme.app",
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

  // Photo rows cascade with their service, but the storage objects don't.
  const photos = await must(
    "load previous photos",
    supabaseAdmin.from("service_photos").select("url").in("service_id", ids),
  );
  const paths = (photos ?? [])
    .map((p) => (p.url as string).split(`/object/public/${PHOTO_BUCKET}/`)[1])
    .filter((path): path is string => !!path);
  if (paths.length > 0) {
    const { error } = await supabaseAdmin.storage.from(PHOTO_BUCKET).remove(paths);
    if (error) console.warn(`Could not remove old photo files: ${error.message}`);
  }

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

const PHOTO_BUCKET = "service-photos";

// Same path scheme and row shape as POST /api/services/:id/photos. A photo
// that fails to download is skipped with a warning rather than failing the
// seed, since the rest of the data doesn't depend on it.
async function seedPhotos(studentId: string, serviceId: string, photos: { stage: PhotoStage; url: string }[]) {
  const rows: { service_id: string; url: string; type: "before" | "after"; stage: PhotoStage }[] = [];
  for (const { stage, url } of photos) {
    const res = await fetch(url, { headers: { "User-Agent": "KosmeSeed/1.0 (test data seeding)" } });
    if (!res.ok) {
      console.warn(`Skipping photo ${url}: HTTP ${res.status}`);
      continue;
    }
    const type = stage === "before" ? "before" : "after";
    const path = `${studentId}/${serviceId}/${type}-${randomUUID()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, Buffer.from(await res.arrayBuffer()), { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`upload photo: ${error.message}`);
    const { data } = supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    rows.push({ service_id: serviceId, url: data.publicUrl, type, stage });
  }
  if (rows.length > 0) await must("insert service_photos", supabaseAdmin.from("service_photos").insert(rows));
  return rows.length;
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
  let photoCount = 0;

  // Idempotent: the photo upload route creates the bucket the same way.
  await supabaseAdmin.storage.createBucket(PHOTO_BUCKET, { public: true });

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

    photoCount += await seedPhotos(studentId, serviceId, svc.photos);

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
  console.log(`Seeded ${TEST_SERVICES.length} services and ${photoCount} photos for the test student.`);
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
  // CLI-1: a listing for the test student, so the client's Find a Service page
  // has a location, services and weekly times to filter on.
  await must(
    "student_profiles",
    supabaseAdmin.from("student_profiles").upsert(
      {
        user_id: ids.student,
        bio: "Second-year student working towards my practical hours. Happy to talk through what I'll do first.",
        location: "Kingston",
        willing_to_travel: false,
        services_offered: ["Haircuts", "Colour"],
        availability: [
          { day: "tue", from: "13:00", to: "17:00" },
          { day: "thu", from: "13:00", to: "17:00" },
          { day: "sat", from: "09:00", to: "13:00" },
        ],
        is_listed: true,
      },
      { onConflict: "user_id" },
    ),
  );
}

async function main() {
  if (process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    console.error(
      "Refusing to seed test accounts into a live Clerk instance.\n" +
        "These are dev-only. On production, use the demo login or seed:super-admin instead.",
    );
    process.exit(1);
  }

  // Fail before writing anything if a password is missing.
  TEST_ACCOUNTS.forEach(({ role }) => passwordFor(role));

  await seedStructure();

  const ids = {} as Record<Role, string>;
  for (const entry of TEST_ACCOUNTS) {
    ids[entry.role] = await seedAccount(entry);
  }

  await seedRelationships(ids);
  await resetStudentServices(ids.student);
  await seedServices(ids);

  console.log("\nTest accounts ready (log in at /login; verification code is always 424242):");
  console.table(TEST_ACCOUNTS.map(({ role, email }) => ({ role, email, password: `$TEST_PASSWORD_${role.toUpperCase()}` })));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
