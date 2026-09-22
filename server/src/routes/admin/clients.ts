import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";

// Mounted at /api/admin/clients (super_admin only). Views over the
// volunteer-client side: public sign-up form submissions (client_signups),
// volunteer↔student requests (volunteer_requests), and manual admin pairing
// of a signed-up client with a student (client_matches, CON-2).
const router = Router();

const MATCH_SELECT = "id, signup_id, status, notes, created_at, student:student_id ( id, full_name )";

// GET /signups — public volunteer-client sign-up submissions, newest first,
// each with its active student matches embedded as `matches`.
router.get("/signups", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("client_signups")
    .select(
      "id, full_name, gender, whatsapp, email, parish, service_preferences, availability, preferred_time, willing_to_travel, photo_consent, trainee_acknowledgement, created_at, " +
        `client_matches ( ${MATCH_SELECT} )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin clients GET /signups error:", error);
    return res.status(500).json({ error: "Failed to load client sign-ups" });
  }

  // Ended matches stay in the table as history; only active ones are shown.
  const signups = (data ?? []).map(({ client_matches, ...signup }: any) => ({
    ...signup,
    matches: (client_matches ?? []).filter((m: any) => m.status === "active"),
  }));
  return res.json({ signups });
});

// GET /students — students a client can be matched with: real (non-demo),
// active student accounts. Sign-ups are always real submissions, so demo
// students are never offered (demo data stays partitioned from real data).
router.get("/students", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, institution:institution_id ( id, name ), cohort:cohort_id ( id, name )")
    .eq("role", "student")
    .eq("status", "active")
    .eq("is_demo", false)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("admin clients GET /students error:", error);
    return res.status(500).json({ error: "Failed to load students" });
  }
  return res.json({ students: data ?? [] });
});

// POST /matches — pair a client sign-up with a student.
router.post("/matches", async (req: AuthRequest, res: Response) => {
  const { signup_id, student_id, notes } = req.body;

  if (!isUuid(signup_id)) {
    return res.status(400).json({ error: "signup_id must be a valid UUID" });
  }
  if (!isUuid(student_id)) {
    return res.status(400).json({ error: "student_id must be a valid UUID" });
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({ error: "notes must be a string" });
  }

  const { data: signup } = await supabaseAdmin.from("client_signups").select("id").eq("id", signup_id).single();
  if (!signup) {
    return res.status(400).json({ error: "signup_id does not reference an existing client sign-up" });
  }

  // Same eligibility rule as GET /students.
  const { data: student } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, status, is_demo")
    .eq("id", student_id)
    .single();
  if (!student || student.role !== "student" || student.status !== "active" || student.is_demo) {
    return res.status(400).json({ error: "student_id must reference an active, non-demo student" });
  }

  const trimmedNotes = typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null;

  const { data, error } = await supabaseAdmin
    .from("client_matches")
    .insert({ signup_id, student_id, notes: trimmedNotes, matched_by: req.userId ?? null })
    .select(MATCH_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "This client is already matched with that student" });
    }
    console.error("admin clients POST /matches error:", error);
    return res.status(500).json({ error: "Failed to create match" });
  }

  await logAudit(req.userId, "create", "client_match", data.id, { signup_id, student_id });
  return res.status(201).json({ match: data });
});

// PATCH /matches/:id — end an active match. The row is kept as history.
router.patch("/matches/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid match id" });
  }
  if (req.body.status !== "ended") {
    return res.status(400).json({ error: "status must be 'ended'" });
  }

  const { data, error } = await supabaseAdmin
    .from("client_matches")
    .update({ status: "ended", ended_by: req.userId ?? null, ended_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("status", "active")
    .select(MATCH_SELECT)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("admin clients PATCH /matches/:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to end match" : "Active match not found" });
  }

  await logAudit(req.userId, "end", "client_match", data.id, null);
  return res.json({ match: data });
});

// GET /volunteer-requests?status= — volunteer→student interest requests.
router.get("/volunteer-requests", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin
    .from("volunteer_requests")
    .select(
      "id, student_id, volunteer_id, message, status, created_at, student:student_id ( id, full_name ), volunteer:volunteer_id ( id, full_name )",
    )
    .order("created_at", { ascending: false });

  const { status } = req.query;
  if (typeof status === "string" && ["pending", "accepted", "declined"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin clients GET /volunteer-requests error:", error);
    return res.status(500).json({ error: "Failed to load volunteer requests" });
  }
  return res.json({ requests: data ?? [] });
});

export default router;
