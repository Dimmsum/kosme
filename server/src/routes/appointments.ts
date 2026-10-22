import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";

const router = Router();

const SELECT = `
  id, student_id, client_id, category_id, service_type_id, service_name,
  starts_at, est_duration_min, location, notes, status,
  proposed_starts_at, proposed_by, confirmed_at, cancelled_by, service_id, requested_by,
  created_at, updated_at,
  student:student_id ( id, full_name ),
  client:client_id ( id, full_name )
`;

interface Appointment {
  id: string;
  student_id: string;
  client_id: string;
  status: string;
  proposed_by: string | null;
  proposed_starts_at: string | null;
  confirmed_at: string | null;
  service_id: string | null;
  requested_by: string | null;
}

/** Parse a future ISO timestamp, or return an error message. */
function parseFuture(value: unknown, label: string): Date | string {
  if (typeof value !== "string") return `${label} is required`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${label} must be a valid date and time`;
  const now = Date.now();
  if (date.getTime() <= now) return `${label} must be in the future`;
  if (date.getTime() > now + 365 * 24 * 60 * 60 * 1000) return `${label} is too far ahead`;
  return date;
}

/** Load an appointment the caller is a party to, or send the error response. */
async function loadOwn(req: AuthRequest, res: Response): Promise<Appointment | null> {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ error: "Invalid appointment id" });
    return null;
  }
  const { data } = await supabaseAdmin
    .from("appointments")
    .select("id, student_id, client_id, status, proposed_by, proposed_starts_at, confirmed_at, service_id, requested_by")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!data || (data.student_id !== req.userId && data.client_id !== req.userId)) {
    res.status(404).json({ error: "Appointment not found" });
    return null;
  }
  return data as Appointment;
}

/**
 * Apply a transition guarded on the status we read, so two taps (or two tabs)
 * can't both succeed. Returns the refreshed row.
 */
async function transition(
  req: AuthRequest,
  res: Response,
  appt: Appointment,
  update: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update(update)
    .eq("id", appt.id)
    .eq("status", appt.status)
    .select(SELECT)
    .maybeSingle();
  if (error) {
    console.error("appointments transition error:", error);
    return res.status(500).json({ error: "Failed to update appointment" });
  }
  if (!data) {
    return res.status(409).json({ error: "This appointment just changed. Refresh and try again." });
  }
  return res.json({ appointment: data });
}

// GET /api/appointments — the caller's appointments (student or client), soonest first
router.get("/", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const column = req.userRole === "student" ? "student_id" : "client_id";
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(SELECT)
    .eq(column, req.userId!)
    .order("starts_at", { ascending: true });
  if (error) {
    console.error("appointments GET error:", error);
    return res.status(500).json({ error: "Failed to fetch appointments" });
  }
  return res.json({ appointments: data ?? [] });
});

// POST /api/appointments — either side opens a request: a student books a
// volunteer (body: client_id), or a client books a student from the student's
// profile (body: student_id). The other party then accepts or declines.
router.post("/", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const {
    client_id: bodyClientId,
    student_id: bodyStudentId,
    category_id,
    service_type_id,
    service_name,
    starts_at,
    est_duration_min,
    location,
    notes,
  } = req.body as Record<string, unknown>;

  const asClient = req.userRole === "client";
  const client_id = asClient ? req.userId! : bodyClientId;
  const student_id = asClient ? bodyStudentId : req.userId!;
  if (!isUuid(asClient ? student_id : client_id)) {
    return res.status(400).json({ error: asClient ? "student_id is required" : "client_id is required" });
  }
  if (typeof category_id !== "string" || !category_id) {
    return res.status(400).json({ error: "category_id is required" });
  }
  if (typeof service_name !== "string" || !service_name.trim() || service_name.length > 255) {
    return res.status(400).json({ error: "service_name must be between 1 and 255 characters" });
  }
  if (service_type_id != null && !isUuid(service_type_id)) {
    return res.status(400).json({ error: "Invalid service_type_id format" });
  }
  if (
    typeof est_duration_min !== "number" ||
    !Number.isInteger(est_duration_min) ||
    est_duration_min < 15 ||
    est_duration_min > 480
  ) {
    return res.status(400).json({ error: "est_duration_min must be between 15 and 480" });
  }
  if (typeof location !== "string" || !location.trim() || location.length > 200) {
    return res.status(400).json({ error: "location must be between 1 and 200 characters" });
  }
  if (notes != null && (typeof notes !== "string" || notes.length > 1000)) {
    return res.status(400).json({ error: "notes must be at most 1000 characters" });
  }
  const when = parseFuture(starts_at, "starts_at");
  if (typeof when === "string") {
    return res.status(400).json({ error: when });
  }

  // The other party must hold the opposite role on the same side of the demo
  // boundary (and, for a student, still be an active account).
  const otherId = (asClient ? student_id : client_id) as string;
  const { data: other } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", otherId)
    .eq("role", asClient ? "student" : "client")
    .eq("is_demo", req.isDemo ?? false)
    .maybeSingle();
  if (!other) {
    return res.status(400).json({ error: asClient ? "Invalid student_id" : "Invalid client_id" });
  }

  const { data: category } = await supabaseAdmin
    .from("service_categories")
    .select("id")
    .eq("id", category_id)
    .maybeSingle();
  if (!category) {
    return res.status(400).json({ error: "Unknown category" });
  }
  if (service_type_id) {
    const { data: type } = await supabaseAdmin
      .from("service_types")
      .select("category_id")
      .eq("id", service_type_id)
      .maybeSingle();
    if (!type || type.category_id !== category_id) {
      return res.status(400).json({ error: "service_type_id does not belong to that category" });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      student_id,
      client_id,
      requested_by: req.userId!,
      category_id,
      service_type_id: service_type_id ?? null,
      service_name: service_name.trim(),
      starts_at: when.toISOString(),
      est_duration_min,
      location: location.trim(),
      notes: typeof notes === "string" ? notes.trim() || null : null,
    })
    .select(SELECT)
    .single();
  if (error) {
    console.error("appointments POST error:", error);
    return res.status(500).json({ error: "Failed to request appointment" });
  }
  return res.status(201).json({ appointment: data });
});

// POST /api/appointments/:id/accept — the party who didn't open a request
// accepts it, or either party accepts the other's proposed new time.
router.post("/:id/accept", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const appt = await loadOwn(req, res);
  if (!appt) return;
  const now = new Date().toISOString();

  if (appt.status === "pending") {
    if (req.userId === appt.requested_by) {
      return res.status(403).json({ error: "The other person needs to accept your request" });
    }
    return transition(req, res, appt, { status: "confirmed", confirmed_at: now });
  }
  if (appt.status === "reschedule_requested" && appt.proposed_starts_at) {
    if (req.userId === appt.proposed_by) {
      return res.status(403).json({ error: "The other person needs to accept your proposed time" });
    }
    return transition(req, res, appt, {
      status: "confirmed",
      starts_at: appt.proposed_starts_at,
      proposed_starts_at: null,
      proposed_by: null,
      confirmed_at: appt.confirmed_at ?? now,
    });
  }
  return res.status(400).json({ error: "Nothing to accept on this appointment" });
});

// POST /api/appointments/:id/decline — the party who didn't open a request
// declines it, or either party declines the other's proposed new time.
router.post("/:id/decline", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const appt = await loadOwn(req, res);
  if (!appt) return;

  if (appt.status === "pending") {
    if (req.userId === appt.requested_by) {
      return res.status(403).json({ error: "You opened this request; cancel it instead" });
    }
    return transition(req, res, appt, { status: "cancelled", cancelled_by: req.userId });
  }
  if (appt.status === "reschedule_requested") {
    if (req.userId === appt.proposed_by) {
      return res.status(403).json({ error: "You proposed this time; cancel or wait for a reply" });
    }
    // A confirmed booking keeps its original time; a never-confirmed one ends.
    return transition(
      req,
      res,
      appt,
      appt.confirmed_at
        ? { status: "confirmed", proposed_starts_at: null, proposed_by: null }
        : { status: "cancelled", cancelled_by: req.userId, proposed_starts_at: null, proposed_by: null },
    );
  }
  return res.status(400).json({ error: "Nothing to decline on this appointment" });
});

// POST /api/appointments/:id/suggest — propose a different time
router.post("/:id/suggest", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const appt = await loadOwn(req, res);
  if (!appt) return;
  const when = parseFuture((req.body as { starts_at?: unknown }).starts_at, "starts_at");
  if (typeof when === "string") {
    return res.status(400).json({ error: when });
  }

  const allowed =
    (appt.status === "pending" && req.userId !== appt.requested_by) ||
    appt.status === "confirmed" ||
    (appt.status === "reschedule_requested" && req.userId !== appt.proposed_by);
  if (!allowed) {
    return res.status(400).json({ error: "A new time can't be suggested right now" });
  }
  if (appt.status === "confirmed" && appt.service_id) {
    return res.status(400).json({ error: "This appointment has already started" });
  }

  return transition(req, res, appt, {
    status: "reschedule_requested",
    proposed_starts_at: when.toISOString(),
    proposed_by: req.userId,
  });
});

// POST /api/appointments/:id/cancel — either party cancels before it starts
router.post("/:id/cancel", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const appt = await loadOwn(req, res);
  if (!appt) return;
  if (!["pending", "confirmed", "reschedule_requested"].includes(appt.status)) {
    return res.status(400).json({ error: "This appointment can no longer be cancelled" });
  }
  if (appt.service_id) {
    return res.status(400).json({ error: "This appointment has already started" });
  }
  return transition(req, res, appt, {
    status: "cancelled",
    cancelled_by: req.userId,
    proposed_starts_at: null,
    proposed_by: null,
  });
});

export default router;
