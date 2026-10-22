import { Router, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/school-admin behind requireAuth + requireRole("school_admin").
// Every query is scoped to the caller's own institution (user_profiles.institution_id,
// loaded fresh by requireAuth) — a school admin never sees another school's data.
// Read-only for now; "manage" access level gates future write actions.
const router = Router();

router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.institutionId) {
    return res.status(403).json({ error: "No institution assigned to this account" });
  }
  next();
});

// Student ids of the caller's institution (optionally limited to the programmes
// this admin administers).
async function scopedProgrammeIds(req: AuthRequest): Promise<string[] | null> {
  const { data } = await supabaseAdmin.from("school_admin_programmes").select("programme_id").eq("admin_id", req.userId!);
  const ids = (data ?? []).map((r) => r.programme_id as string);
  return ids.length ? ids : null; // null = whole institution
}

async function institutionStudentIds(req: AuthRequest): Promise<string[]> {
  let q = supabaseAdmin.from("user_profiles").select("id").eq("role", "student").eq("institution_id", req.institutionId!);
  const progs = await scopedProgrammeIds(req);
  if (progs) q = q.in("programme_id", progs);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((s) => s.id as string);
}

function fail(res: Response, label: string, err: unknown) {
  console.error(`school-admin ${label} error:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

// GET /overview — headline counts.
router.get("/overview", async (req: AuthRequest, res: Response) => {
  try {
    const studentIds = await institutionStudentIds(req);
    const { data: inst } = await supabaseAdmin.from("institutions").select("id, name").eq("id", req.institutionId!).single();
    const { count: educators } = await supabaseAdmin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "educator")
      .eq("institution_id", req.institutionId!);
    const { data: services } = studentIds.length
      ? await supabaseAdmin.from("services").select("status").in("student_id", studentIds)
      : { data: [] as { status: string }[] };
    const byStatus: Record<string, number> = {};
    for (const s of services ?? []) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    return res.json({ institution: inst, students: studentIds.length, educators: educators ?? 0, submissions_by_status: byStatus });
  } catch (err) {
    return fail(res, "overview", err);
  }
});

// GET /people?role=student|educator — users in the institution.
router.get("/people", async (req: AuthRequest, res: Response) => {
  const role = req.query.role === "educator" ? "educator" : "student";
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, status, student_id, staff_id, programme:programme_id ( name ), cohort:cohort_id ( name )")
    .eq("role", role)
    .eq("institution_id", req.institutionId!)
    .eq("is_demo", false)
    .order("full_name");
  if (error) return fail(res, "people", error);
  return res.json({ people: data ?? [] });
});

// GET /submissions?status=&cohort_id= — practical submissions for institution students.
router.get("/submissions", async (req: AuthRequest, res: Response) => {
  try {
    let ids = await institutionStudentIds(req);
    const { cohort_id, status } = req.query;
    if (cohort_id !== undefined) {
      if (!isUuid(cohort_id)) return res.status(400).json({ error: "Invalid cohort_id" });
      const { data } = await supabaseAdmin.from("user_profiles").select("id").eq("cohort_id", cohort_id).in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      ids = (data ?? []).map((s) => s.id as string);
    }
    if (ids.length === 0) return res.json({ submissions: [] });
    let q = supabaseAdmin
      .from("services")
      .select("id, name, category_id, status, created_at, student:student_id ( id, full_name ), verification:verifications ( status )")
      .in("student_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    if (typeof status === "string" && status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return fail(res, "submissions", error);
    return res.json({ submissions: data ?? [] });
  } catch (err) {
    return fail(res, "submissions", err);
  }
});

// GET /bookings?status= — appointments involving institution students.
router.get("/bookings", async (req: AuthRequest, res: Response) => {
  try {
    const ids = await institutionStudentIds(req);
    if (ids.length === 0) return res.json({ bookings: [] });
    let q = supabaseAdmin
      .from("appointments")
      .select("id, category_id, status, starts_at, student:student_id ( id, full_name ), client:client_id ( id, full_name )")
      .in("student_id", ids)
      .order("starts_at", { ascending: false })
      .limit(200);
    if (typeof req.query.status === "string" && req.query.status) q = q.eq("status", req.query.status);
    const { data, error } = await q;
    if (error) return fail(res, "bookings", error);
    return res.json({ bookings: data ?? [] });
  } catch (err) {
    return fail(res, "bookings", err);
  }
});

export default router;
