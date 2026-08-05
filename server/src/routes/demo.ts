import { Router, Request, Response } from "express";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// Roles a visitor is allowed to demo. Deliberately excludes super_admin —
// the demo login must never grant admin access (see docs/ROADMAP.md Phase 1).
const DEMO_ROLE_INFO: Record<string, { label: string; description: string }> = {
  student: {
    label: "Student",
    description: "Log a practical service, upload evidence, and track verified hours.",
  },
  educator: {
    label: "Educator",
    description: "Review student submissions and approve or reject verified hours.",
  },
  client: {
    label: "Volunteer Client",
    description: "See what a client confirms when a student logs a service on them.",
  },
  employer: {
    label: "Employer",
    description: "Browse verified student portfolios and shortlist graduates.",
  },
};

// GET /api/demo/roles — public, lists the roles a visitor can try
router.get("/roles", async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin.from("demo_accounts").select("role");

  if (error) {
    console.error("demo GET /roles error:", error);
    return res.status(500).json({ error: "Failed to load demo roles" });
  }

  const roles = (data ?? [])
    .map((row) => row.role)
    .filter((role) => role in DEMO_ROLE_INFO)
    .map((role) => ({ role, ...DEMO_ROLE_INFO[role] }));

  return res.json({ roles });
});

// POST /api/demo/login — public, body: { role }
// Issues a short-lived Clerk sign-in token for the seeded demo account of
// that role. The client exchanges it for a session via
// signIn.create({ strategy: "ticket", ticket }) — no password ever changes hands.
router.post("/login", async (req: Request, res: Response) => {
  const { role } = req.body as { role?: string };

  if (!role || typeof role !== "string" || !(role in DEMO_ROLE_INFO)) {
    return res.status(400).json({ error: "Invalid or unsupported demo role" });
  }

  const { data: mapping, error } = await supabaseAdmin
    .from("demo_accounts")
    .select("clerk_user_id")
    .eq("role", role)
    .single();

  if (error || !mapping) {
    return res.status(404).json({
      error: "Demo account not set up for this role yet. Run the seed:demo script.",
    });
  }

  try {
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId: mapping.clerk_user_id,
      expiresInSeconds: 60,
    });
    return res.json({ ticket: signInToken.token });
  } catch (err) {
    console.error("demo POST /login error:", err);
    return res.status(500).json({ error: "Failed to start demo session" });
  }
});

export default router;
