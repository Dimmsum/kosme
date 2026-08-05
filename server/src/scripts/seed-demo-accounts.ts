import "dotenv/config";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

// One-time (idempotent) setup for the public demo login.
// Run with: npm run seed:demo --workspace=server   (or `npx tsx src/scripts/seed-demo-accounts.ts` from server/)
//
// Creates one real Clerk user per demo-enabled role, marks the matching
// user_profiles row is_demo = true, and records the mapping in
// public.demo_accounts so server/src/routes/demo.ts can issue sign-in
// tokens for them. Deliberately excludes super_admin — see 0013_demo_accounts.sql.

const DEMO_INSTITUTION_ID = "00000000-0000-0000-0000-00000000d1de";

const DEMO_ROLES: {
  role: "student" | "educator" | "client" | "employer";
  email: string;
  firstName: string;
  lastName: string;
}[] = [
  { role: "student", email: "demo-student@kosme.app", firstName: "Demo", lastName: "Student" },
  { role: "educator", email: "demo-educator@kosme.app", firstName: "Demo", lastName: "Educator" },
  { role: "client", email: "demo-client@kosme.app", firstName: "Demo", lastName: "Volunteer Client" },
  { role: "employer", email: "demo-employer@kosme.app", firstName: "Demo", lastName: "Employer" },
];

function randomPassword(): string {
  // Never used to log in — demo login exchanges a server-issued sign-in
  // ticket, not a password. Long random value just to satisfy Clerk's
  // "an account needs a credential" requirement.
  return crypto.randomUUID() + crypto.randomUUID();
}

async function findExistingClerkUser(email: string) {
  const { data } = await clerkClient.users.getUserList({ emailAddress: [email] });
  return data[0] ?? null;
}

async function seedRole(entry: (typeof DEMO_ROLES)[number]) {
  const { role, email, firstName, lastName } = entry;

  let clerkUser = await findExistingClerkUser(email);
  if (!clerkUser) {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password: randomPassword(),
      firstName,
      lastName,
      skipPasswordChecks: true,
      publicMetadata: { role, demo: true },
    });
    console.log(`Created Clerk user for ${role}: ${clerkUser.id}`);
  } else {
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { role, demo: true },
    });
    console.log(`Reusing existing Clerk user for ${role}: ${clerkUser.id}`);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        clerk_id: clerkUser.id,
        full_name: `${firstName} ${lastName}`,
        role,
        is_demo: true,
        institution_id: role === "student" || role === "educator" ? DEMO_INSTITUTION_ID : null,
      },
      { onConflict: "clerk_id" },
    )
    .select("id")
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to upsert user_profiles for ${role}: ${profileError?.message}`);
  }

  const { error: mappingError } = await supabaseAdmin
    .from("demo_accounts")
    .upsert(
      { role, clerk_user_id: clerkUser.id, user_id: profile.id },
      { onConflict: "role" },
    );

  if (mappingError) {
    throw new Error(`Failed to upsert demo_accounts for ${role}: ${mappingError.message}`);
  }

  console.log(`  -> demo_accounts.${role} = user_profiles.${profile.id}`);
}

async function main() {
  for (const entry of DEMO_ROLES) {
    await seedRole(entry);
  }
  console.log("Demo accounts seeded.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
