import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/admin/submissions (super_admin only). Read-only, platform-wide
// view of student service submissions with their verification/confirmation state.
const router = Router();

const STATUSES = ["awaiting_client", "awaiting_educator", "verified", "rejected"];

// GET /?status=&include_demo= — services across the platform, newest first.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin
    .from("services")
    .select(
      "id, name, category_id, status, notes, is_demo, created_at, student:student_id ( id, full_name ), client:client_id ( id, full_name ), verification:verifications ( status ), confirmation:confirmations ( status )",
    )
    .order("created_at", { ascending: false });

  if (req.query.include_demo !== "true") {
    query = query.eq("is_demo", false);
  }

  const { status } = req.query;
  if (typeof status === "string" && status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin submissions GET / error:", error);
    return res.status(500).json({ error: "Failed to load submissions" });
  }
  return res.json({ submissions: data ?? [] });
});

export default router;
