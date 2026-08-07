import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/portfolios (super_admin only). Read-only oversight of
// student portfolios built from verified services.
const router = Router();

// GET /?include_demo= — students with counts of total vs. verified services.
router.get("/", async (req: AuthRequest, res: Response) => {
  const includeDemo = req.query.include_demo === "true";

  let studentQuery = supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, is_demo, institution_id, institution:institution_id ( name )")
    .eq("role", "student")
    .order("full_name");
  if (!includeDemo) studentQuery = studentQuery.eq("is_demo", false);

  const { data: students, error } = await studentQuery;
  if (error) {
    console.error("admin portfolios GET / error:", error);
    return res.status(500).json({ error: "Failed to load portfolios" });
  }

  // Tally total + verified services per student in-route.
  let svcQuery = supabaseAdmin.from("services").select("student_id, status");
  if (!includeDemo) svcQuery = svcQuery.eq("is_demo", false);
  const { data: services } = await svcQuery;

  const totals = new Map<string, number>();
  const verified = new Map<string, number>();
  for (const s of services ?? []) {
    totals.set(s.student_id, (totals.get(s.student_id) ?? 0) + 1);
    if (s.status === "verified") verified.set(s.student_id, (verified.get(s.student_id) ?? 0) + 1);
  }

  const result = (students ?? []).map((s) => ({
    ...s,
    total_services: totals.get(s.id) ?? 0,
    verified_services: verified.get(s.id) ?? 0,
  }));

  return res.json({ students: result });
});

// GET /:studentId — a student's verified services with photos.
router.get("/:studentId", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.studentId)) {
    return res.status(400).json({ error: "Invalid student id" });
  }

  const { data: student, error: sErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, role, institution:institution_id ( name )")
    .eq("id", req.params.studentId)
    .single();
  if (sErr || !student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const { data: services, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, name, category_id, status, notes, created_at, service_photos ( id, type, url )")
    .eq("student_id", req.params.studentId)
    .eq("status", "verified")
    .order("created_at", { ascending: false });
  if (svcErr) {
    console.error("admin portfolios GET /:studentId error:", svcErr);
    return res.status(500).json({ error: "Failed to load student portfolio" });
  }

  return res.json({ student, services: services ?? [] });
});

export default router;
