import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/confirmations/pending — services where the volunteer is the client and status = awaiting_client
router.get("/pending", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, notes, status, created_at,
      student:student_id ( id, full_name )
    `)
    .eq("client_id", req.userId!)
    .eq("status", "awaiting_client")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ confirmations: data });
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
    return res.status(500).json({ error: error.message });
  }

  return res.json({ history: data });
});

// POST /api/confirmations/:serviceId/confirm — volunteer confirms the service
router.post("/:serviceId/confirm", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;

  // Verify the volunteer is the assigned client and service is awaiting_client
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

  // Advance service status to awaiting_educator
  const { error: updateErr } = await supabaseAdmin
    .from("services")
    .update({ status: "awaiting_educator" })
    .eq("id", serviceId);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  // Upsert confirmation record
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

  return res.json({ confirmation });
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
