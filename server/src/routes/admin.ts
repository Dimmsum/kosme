import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

// Mounted at /api/admin in index.ts, behind requireAuth + requireRole("super_admin")
// — every route here already assumes the caller is a verified super admin.
const router = Router();

// GET /api/admin/overview — headline counts for the Dashboard Overview module.
// Real platform data only: demo-flagged rows are excluded so the admin sees
// actual usage, not the seeded demo dataset (see 0013_demo_accounts.sql).
router.get("/overview", async (_req: AuthRequest, res: Response) => {
  try {
    const [
      { count: students },
      { count: educators },
      { count: clients },
      { count: employers },
      { count: institutions },
      { count: pendingVerifications },
      { count: verifiedServices },
    ] = await Promise.all([
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "student").eq("is_demo", false),
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "educator").eq("is_demo", false),
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "client").eq("is_demo", false),
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "employer").eq("is_demo", false),
      supabaseAdmin.from("institutions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("services").select("*", { count: "exact", head: true }).eq("status", "awaiting_educator").eq("is_demo", false),
      supabaseAdmin.from("services").select("*", { count: "exact", head: true }).eq("status", "verified").eq("is_demo", false),
    ]);

    return res.json({
      stats: {
        students: students ?? 0,
        educators: educators ?? 0,
        clients: clients ?? 0,
        employers: employers ?? 0,
        institutions: institutions ?? 0,
        pending_verifications: pendingVerifications ?? 0,
        verified_services: verifiedServices ?? 0,
      },
    });
  } catch (err) {
    console.error("admin GET /overview error:", err);
    return res.status(500).json({ error: "Failed to load admin overview" });
  }
});

export default router;
