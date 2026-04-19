import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/volunteer-requests — volunteer expresses interest in a student
router.post("/", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { student_id, message } = req.body as { student_id?: string; message?: string };

  if (!student_id || !UUID_RE.test(student_id)) {
    return res.status(400).json({ error: "Valid student_id is required" });
  }
  if (message !== undefined && (typeof message !== "string" || message.length > 500)) {
    return res.status(400).json({ error: "message must be at most 500 characters" });
  }

  // Confirm target is actually a student
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role")
    .eq("id", student_id)
    .eq("role", "student")
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: "Student not found" });
  }

  const { data, error } = await supabaseAdmin
    .from("volunteer_requests")
    .upsert(
      {
        student_id,
        volunteer_id: req.userId!,
        message: message?.trim() || null,
        status: "pending",
      },
      { onConflict: "student_id,volunteer_id", ignoreDuplicates: false }
    )
    .select("id, student_id, volunteer_id, message, status, created_at")
    .single();

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.status(201).json({ request: data });
});

// DELETE /api/volunteer-requests/:id — volunteer withdraws their request
router.delete("/:id", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from("volunteer_requests")
    .delete()
    .eq("id", req.params.id)
    .eq("volunteer_id", req.userId!);

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.status(204).send();
});

// GET /api/volunteer-requests/my — volunteer sees their own outgoing requests
router.get("/my", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("volunteer_requests")
    .select(`
      id, message, status, created_at,
      student:student_id ( id, full_name )
    `)
    .eq("volunteer_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({ requests: data ?? [] });
});

// GET /api/volunteer-requests/incoming — student sees incoming volunteer requests
router.get("/incoming", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("volunteer_requests")
    .select(`
      id, message, status, created_at,
      volunteer:volunteer_id ( id, full_name, phone )
    `)
    .eq("student_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({ requests: data ?? [] });
});

// PATCH /api/volunteer-requests/:id — student accepts or declines a request
router.patch("/:id", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status?: string };

  if (!status || !["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
  }

  const { data, error } = await supabaseAdmin
    .from("volunteer_requests")
    .update({ status })
    .eq("id", req.params.id)
    .eq("student_id", req.userId!)
    .select("id, status")
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Request not found" });
  }

  return res.json({ request: data });
});

export default router;
