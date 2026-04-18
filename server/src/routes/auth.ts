import { Router, Request, Response } from "express";
import { verifyToken } from "@clerk/backend";
import { clerkClient } from "../lib/clerk";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// POST /api/auth/sync
// Called by the client after Clerk signup/login to create the user_profiles row.
// Does NOT use requireAuth middleware because the profile may not exist yet.
router.post("/sync", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);

  let clerkId: string;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    clerkId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { role, full_name } = req.body;
  if (!role || !full_name) {
    return res.status(400).json({ error: "role and full_name are required" });
  }

  const validRoles = ["student", "educator", "client", "employer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
  }

  // Upsert profile (handles both first-time signup and re-syncs)
  const { error: upsertError } = await supabaseAdmin
    .from("user_profiles")
    .upsert({ clerk_id: clerkId, full_name, role }, { onConflict: "clerk_id" });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  // Set role in Clerk publicMetadata so the frontend can read it
  await clerkClient.users.updateUserMetadata(clerkId, {
    publicMetadata: { role },
  });

  return res.status(200).json({ ok: true });
});

export default router;
