import "dotenv/config";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

// Provisions a School Admin account scoped to one institution. Like super_admin,
// this is the ONLY way to get role = school_admin — it is excluded from the
// public /signup form (server/src/routes/auth.ts). Run once per admin.
//
// Also requires SCHOOL_ADMIN_INSTITUTION_ID (uuid) — the institution they administer.
//
// Usage:
//   SCHOOL_ADMIN_INSTITUTION_ID=<uuid> SCHOOL_ADMIN_EMAIL=you@kosme.app SCHOOL_ADMIN_PASSWORD='...' \
//   SCHOOL_ADMIN_NAME="Your Name" npm run seed:super-admin
//
// Idempotent: re-running with the same email updates the role/name rather
// than creating a duplicate. The password is only used the first time the
// Clerk user is created; re-running does not change an existing password
// unless SCHOOL_ADMIN_RESET_PASSWORD=true is also set.

async function main() {
  const email = process.env.SCHOOL_ADMIN_EMAIL;
  const password = process.env.SCHOOL_ADMIN_PASSWORD;
  const fullName = process.env.SCHOOL_ADMIN_NAME ?? "School Admin";
  const institutionId = process.env.SCHOOL_ADMIN_INSTITUTION_ID;
  const resetPassword = process.env.SCHOOL_ADMIN_RESET_PASSWORD === "true";

  if (!institutionId) {
    console.error("Set SCHOOL_ADMIN_INSTITUTION_ID to the institution this admin administers.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("Set SCHOOL_ADMIN_EMAIL and SCHOOL_ADMIN_PASSWORD env vars before running this script.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("SCHOOL_ADMIN_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }

  const { data: existing } = await clerkClient.users.getUserList({ emailAddress: [email] });
  let clerkUser = existing[0] ?? null;

  if (!clerkUser) {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: fullName,
      skipPasswordChecks: true,
      publicMetadata: { role: "school_admin" },
    });
    console.log(`Created Clerk user: ${clerkUser.id}`);
  } else {
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { role: "school_admin" },
    });
    console.log(`Reusing existing Clerk user: ${clerkUser.id}`);

    if (resetPassword) {
      await clerkClient.users.updateUser(clerkUser.id, {
        password,
        skipPasswordChecks: true,
        signOutOfOtherSessions: true,
      });
      console.log("Password reset; other sessions signed out.");
    }
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { clerk_id: clerkUser.id, full_name: fullName, role: "school_admin", institution_id: institutionId, access_level: "manage", is_demo: false },
      { onConflict: "clerk_id" },
    );

  if (error) {
    throw new Error(`Failed to upsert user_profiles: ${error.message}`);
  }

  console.log(`School Admin ready — log in at /login with ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
