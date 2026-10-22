import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/submissions (super_admin only). Read-only, platform-wide
// view of student service submissions with their verification/confirmation state,
// filterable Institution → Programme → Cohort → Student, plus category, status
// and date range (SFB-6).
const router = Router();

const STATUSES = ["in_progress", "awaiting_client", "awaiting_educator", "corrections_requested", "verified", "rejected"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIMIT = 500;

// GET /?institution_id=&programme_id=&cohort_id=&student_id=&category_id=&status=&from=&to=&include_demo=
router.get("/", async (req: AuthRequest, res: Response) => {
  const { institution_id, programme_id, cohort_id, student_id, category_id, status, from, to, include_demo } = req.query;

  for (const [field, value] of [
    ["institution_id", institution_id],
    ["programme_id", programme_id],
    ["cohort_id", cohort_id],
    ["student_id", student_id],
  ] as const) {
    if (value !== undefined && value !== "" && !isUuid(value)) return res.status(400).json({ error: `Invalid ${field} filter` });
  }
  if (typeof status === "string" && status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
  }
  for (const [field, value] of [["from", from], ["to", to]] as const) {
    if (typeof value === "string" && value && (!DATE_RE.test(value) || Number.isNaN(Date.parse(value)))) {
      return res.status(400).json({ error: `${field} must be a YYYY-MM-DD date` });
    }
  }

  // Placement filters live on the student's profile, so resolve them to student ids first.
  let studentIds: string[] | null = null;
  if (institution_id || programme_id || cohort_id) {
    let sq = supabaseAdmin.from("user_profiles").select("id").eq("role", "student");
    if (institution_id) sq = sq.eq("institution_id", institution_id as string);
    if (programme_id) sq = sq.eq("programme_id", programme_id as string);
    if (cohort_id) sq = sq.eq("cohort_id", cohort_id as string);
    const { data, error } = await sq;
    if (error) {
      console.error("admin submissions GET / students error:", error);
      return res.status(500).json({ error: "Failed to load submissions" });
    }
    studentIds = (data ?? []).map((s) => s.id as string);
  }
  if (student_id) {
    studentIds = studentIds === null || studentIds.includes(student_id as string) ? [student_id as string] : [];
  }
  if (studentIds !== null && studentIds.length === 0) return res.json({ submissions: [], truncated: false });

  let query = supabaseAdmin
    .from("services")
    .select(
      "id, name, category_id, status, notes, is_demo, created_at, " +
        "student:student_id ( id, full_name, institution:institution_id ( name ), programme:programme_id ( name ), cohort:cohort_id ( name ) ), " +
        "client:client_id ( id, full_name ), verification:verifications ( status ), confirmation:confirmations ( status )",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT + 1);

  if (include_demo !== "true") query = query.eq("is_demo", false);
  if (studentIds) query = query.in("student_id", studentIds);
  if (typeof category_id === "string" && category_id) query = query.eq("category_id", category_id);
  if (typeof status === "string" && status) query = query.eq("status", status);
  if (typeof from === "string" && from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (typeof to === "string" && to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    console.error("admin submissions GET / error:", error);
    return res.status(500).json({ error: "Failed to load submissions" });
  }
  const rows = data ?? [];
  return res.json({ submissions: rows.slice(0, LIMIT), truncated: rows.length > LIMIT });
});

export default router;
