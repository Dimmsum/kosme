import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/admin/employers (super_admin only). Read-only list of employer
// accounts with how many students each has shortlisted.
const router = Router();

// GET /?include_demo= — employers with their shortlist counts.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, phone, status, is_demo, created_at")
    .eq("role", "employer")
    .order("created_at", { ascending: false });

  if (req.query.include_demo !== "true") {
    query = query.eq("is_demo", false);
  }

  const { data: employers, error } = await query;
  if (error) {
    console.error("admin employers GET / error:", error);
    return res.status(500).json({ error: "Failed to load employers" });
  }

  // Shortlist counts per employer (single fetch, tallied in-route — admin scale).
  const { data: shortlistRows } = await supabaseAdmin.from("shortlist").select("employer_id");
  const counts = new Map<string, number>();
  for (const row of shortlistRows ?? []) {
    counts.set(row.employer_id, (counts.get(row.employer_id) ?? 0) + 1);
  }

  const result = (employers ?? []).map((e) => ({ ...e, shortlist_count: counts.get(e.id) ?? 0 }));
  return res.json({ employers: result });
});

export default router;
