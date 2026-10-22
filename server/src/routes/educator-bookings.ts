import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";
import { educatorStudentScope, inEducatorScope } from "../lib/educator-scope";

// Educators can see bookings for students in their cohorts (same scoping as
// verifications, EDU-1) and flag an issue for the admins. Routine acceptance
// stays between the student and the client — educators don't accept or cancel.
const router = Router();

const SELECT = `
  id, student_id, client_id, category_id, service_name, starts_at, location, status, own_client, service_id,
  student:student_id ( id, full_name ),
  client:client_id ( id, full_name ),
  student_client:student_client_id ( id, full_name )
`;

// GET /api/educator-bookings?status=
router.get("/", requireRole("educator"), async (req: AuthRequest, res: Response) => {
  try {
    const scope = await educatorStudentScope(req.userId!);
    if (scope && scope.length === 0) return res.json({ bookings: [] });

    let q = supabaseAdmin.from("appointments").select(SELECT).order("starts_at", { ascending: false }).limit(200);
    if (scope) q = q.in("student_id", scope);
    else {
      // Unassigned educators see everyone on their side of the demo boundary.
      const { data: students } = await supabaseAdmin.from("user_profiles").select("id").eq("role", "student").eq("is_demo", req.isDemo ?? false);
      const ids = (students ?? []).map((s) => s.id as string);
      if (ids.length === 0) return res.json({ bookings: [] });
      q = q.in("student_id", ids);
    }
    if (typeof req.query.status === "string" && req.query.status) q = q.eq("status", req.query.status);

    const { data, error } = await q;
    if (error) throw error;
    const ids = (data ?? []).map((b) => b.id as string);
    const flagged = new Set<string>();
    if (ids.length) {
      const { data: flags } = await supabaseAdmin
        .from("flags")
        .select("entity_id")
        .eq("entity_type", "appointment")
        .eq("status", "open")
        .in("entity_id", ids);
      for (const f of flags ?? []) flagged.add(f.entity_id as string);
    }
    return res.json({ bookings: (data ?? []).map((b) => ({ ...b, flagged: flagged.has(b.id as string) })) });
  } catch (err) {
    console.error("educator-bookings GET error:", err);
    return res.status(500).json({ error: "Failed to load bookings" });
  }
});

// POST /api/educator-bookings/:id/flag — raise a flag for the Super Admin queue.
router.post("/:id/flag", requireRole("educator"), async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid booking id" });
  const reason = (req.body as { reason?: unknown }).reason;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) {
    return res.status(400).json({ error: "reason must be between 1 and 1000 characters" });
  }
  try {
    const { data: appt } = await supabaseAdmin.from("appointments").select("id, student_id, service_name").eq("id", req.params.id).maybeSingle();
    if (!appt) return res.status(404).json({ error: "Booking not found" });
    const scope = await educatorStudentScope(req.userId!);
    if (!inEducatorScope(scope, appt.student_id)) return res.status(404).json({ error: "Booking not found" });

    const { error } = await supabaseAdmin.from("flags").insert({
      entity_type: "appointment",
      entity_id: appt.id,
      reason: `Educator flagged booking "${appt.service_name}": ${reason.trim()}`,
      created_by: req.userId!,
    });
    if (error) throw error;
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("educator-bookings flag error:", err);
    return res.status(500).json({ error: "Failed to flag booking" });
  }
});

export default router;
