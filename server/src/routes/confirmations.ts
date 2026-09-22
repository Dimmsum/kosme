import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { logEvent } from "../lib/events";

const router = Router();

// GET /api/confirmations/pending — services where the volunteer is the client and status = awaiting_client
router.get("/pending", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, notes, status, created_at,
      student:student_id ( id, full_name ),
      confirmations ( status )
    `)
    .eq("client_id", req.userId!)
    .eq("status", "awaiting_client")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  // confirm() no longer flips status away from awaiting_client (VER-5 — the
  // student's explicit submit action does that instead), so a service the
  // volunteer already confirmed can still be sitting in awaiting_client
  // waiting on the student to submit it. Filter those out here rather than
  // showing them as pending again.
  const stillPending = (data ?? []).filter((s) => {
    const confirmation = Array.isArray(s.confirmations)
      ? s.confirmations[0]
      : s.confirmations;
    return !confirmation || confirmation.status !== "confirmed";
  });

  return res.json({ confirmations: stillPending });
});

// GET /api/confirmations/history — all confirmed/disputed services for this volunteer
router.get("/history", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("confirmations")
    .select(`
      id, status, created_at,
      service:service_id (
        id, name, category_id, created_at,
        student:student_id ( id, full_name )
      )
    `)
    .eq("volunteer_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({ history: data });
});

// POST /api/confirmations/:serviceId/confirm — volunteer confirms the service
router.post("/:serviceId/confirm", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;

  // Verify the volunteer is the assigned client and service is awaiting_client
  const { data: service, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, name, student_id, client_id, status")
    .eq("id", serviceId)
    .single();

  if (svcErr || !service) {
    return res.status(404).json({ error: "Service not found" });
  }
  if (service.client_id !== req.userId) {
    return res.status(403).json({ error: "You are not the assigned client for this service" });
  }
  if (service.status !== "awaiting_client") {
    return res.status(400).json({ error: "Service is not awaiting client confirmation" });
  }

  // Record the confirmation, but deliberately leave the service's status at
  // awaiting_client — forwarding it on to the educator is the student's
  // explicit "submit for verification" action (POST /api/services/:id/submit,
  // VER-5), gated on the pre-submit checklist (evidence photos + reflection
  // notes), not an automatic side effect of the client confirming.
  const { data: confirmation, error: confErr } = await supabaseAdmin
    .from("confirmations")
    .upsert(
      { service_id: serviceId, volunteer_id: req.userId!, status: "confirmed" },
      { onConflict: "service_id" }
    )
    .select("id, status, created_at")
    .single();

  if (confErr) {
    return res.status(500).json({ error: confErr.message });
  }

  // Priority alert for educators (ALT-4): the client has signed off, so the
  // student's submit-for-verification step is now unblocked on that front.
  await logEvent(
    "priority",
    "confirmation_completed",
    service.student_id,
    service.id,
    `Client confirmed "${service.name}".`,
  );

  return res.json({ confirmation });
});

// POST /api/confirmations/:serviceId/send — student (re)sends a service to its
// assigned client for confirmation. A service with a client picked at log time
// already routes itself to awaiting_client automatically (see services.ts
// POST / and POST /:id/stop) — this endpoint only covers the one case that
// automatic routing doesn't: a client dispute leaves the service "rejected"
// with no other way back into the pipeline, so the student can send it again
// once the issue is addressed.
router.post("/:serviceId/send", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;

  const { data: service, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, student_id, client_id, status")
    .eq("id", serviceId)
    .single();

  if (svcErr || !service) {
    return res.status(404).json({ error: "Service not found" });
  }
  if (service.student_id !== req.userId) {
    return res.status(403).json({ error: "You do not own this service" });
  }
  if (!service.client_id) {
    return res.status(400).json({ error: "This service has no assigned client to confirm it" });
  }
  if (service.status !== "rejected") {
    return res.status(400).json({ error: "Service is not awaiting resend to the client" });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .update({ status: "awaiting_client" })
    .eq("id", serviceId)
    .select("id, status")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ service: data });
});

// POST /api/confirmations/:serviceId/dispute — volunteer disputes the service
router.post("/:serviceId/dispute", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;

  const { data: service, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, client_id, status")
    .eq("id", serviceId)
    .single();

  if (svcErr || !service) {
    return res.status(404).json({ error: "Service not found" });
  }
  if (service.client_id !== req.userId) {
    return res.status(403).json({ error: "You are not the assigned client for this service" });
  }
  if (service.status !== "awaiting_client") {
    return res.status(400).json({ error: "Service is not awaiting client confirmation" });
  }

  // Mark service as rejected
  const { error: updateErr } = await supabaseAdmin
    .from("services")
    .update({ status: "rejected" })
    .eq("id", serviceId);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  // Upsert confirmation record as disputed
  const { data: confirmation, error: confErr } = await supabaseAdmin
    .from("confirmations")
    .upsert(
      { service_id: serviceId, volunteer_id: req.userId!, status: "disputed" },
      { onConflict: "service_id" }
    )
    .select("id, status, created_at")
    .single();

  if (confErr) {
    return res.status(500).json({ error: confErr.message });
  }

  return res.json({ confirmation });
});

export default router;
