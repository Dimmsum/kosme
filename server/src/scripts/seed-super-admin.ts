import "dotenv/config";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

// Provisions the one real Super Admin account. This is the ONLY way an
// account can get role = super_admin — it is deliberately excluded from the
// public /signup form's role list (server/src/routes/auth.ts) and from the
// demo login (public.demo_accounts has a CHECK against it). Run once per
// admin you need to create.
//
// Usage:
//   SUPER_ADMIN_EMAIL=you@kosme.app SUPER_ADMIN_PASSWORD='...' \
//   SUPER_ADMIN_NAME="Your Name" npm run seed:super-admin
//
// Idempotent: re-running with the same email updates the role/name rather
// than creating a duplicate. The password is only used the first time the
// Clerk user is created; re-running does not change an existing password.

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    console.error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars before running this script.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("SUPER_ADMIN_PASSWORD must be at least 12 characters.");
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
      publicMetadata: { role: "super_admin" },
    });
    console.log(`Created Clerk user: ${clerkUser.id}`);
  } else {
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { role: "super_admin" },
    });
    console.log(`Reusing existing Clerk user: ${clerkUser.id}`);
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { clerk_id: clerkUser.id, full_name: fullName, role: "super_admin", is_demo: false },
      { onConflict: "clerk_id" },
    );

  if (error) {
    throw new Error(`Failed to upsert user_profiles: ${error.message}`);
  }

  console.log(`Super Admin ready — log in at /login with ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
