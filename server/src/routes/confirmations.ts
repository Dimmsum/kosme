import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { logEvent } from "../lib/events";

const router = Router();

// Reasons a client can give when reporting an issue (CLI-4). Keys are stored in
// confirmations.issue_reason (CHECK in migration 0030); labels go into the flag
// an admin reviews.
const ISSUE_REASONS: Record<string, string> = {
  service_cancelled: "Service was cancelled",
  service_incomplete: "Service was incomplete",
  not_received: "I did not receive this service",
  details_incorrect: "Service details are incorrect",
  other: "Other",
};

// GET /api/confirmations/pending — services where the volunteer is the client and status = awaiting_client
router.get("/pending", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, notes, status, created_at,
      student:student_id ( id, full_name ),
      confirmations ( status, issue_reason )
    `)
    .eq("client_id", req.userId!)
    .eq("status", "awaiting_client")
    .eq("is_demo", req.isDemo ?? false)
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
  const statusOf = (s: { confirmations: unknown }) => {
    const confirmation = (Array.isArray(s.confirmations)
      ? s.confirmations[0]
      : s.confirmations) as { status: string } | null | undefined;
    return confirmation?.status ?? null;
  };

  // A reported issue (CLI-4) leaves the service at awaiting_client, flagged for
  // review. It is listed separately so it neither keeps nagging as "pending"
  // nor disappears: the client can still confirm once it is sorted out.
  const rows = data ?? [];
  return res.json({
    confirmations: rows.filter((s) => {
      const status = statusOf(s);
      return status !== "confirmed" && status !== "disputed";
    }),
    reported: rows.filter((s) => statusOf(s) === "disputed"),
  });
});

// GET /api/confirmations/history — all confirmed/disputed services for this volunteer
router.get("/history", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("confirmations")
    .select(`
      id, status, created_at, issue_reason, issue_note,
      service:service_id (
        id, name, category_id, created_at, status,
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
    .eq("is_demo", req.isDemo ?? false)
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
      { service_id: serviceId, volunteer_id: req.userId!, status: "confirmed", issue_reason: null, issue_note: null },
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

  // The client has now signed off, so any issue they reported earlier on this
  // service is resolved (CLI-4). Best-effort: the confirmation is the source of
  // truth, a stale flag is only noise for the admin.
  await supabaseAdmin
    .from("flags")
    .update({ status: "resolved", resolved_by: req.userId!, resolved_at: new Date().toISOString() })
    .eq("entity_type", "service")
    .eq("entity_id", serviceId)
    .eq("status", "open");

  return res.json({ confirmation });
});

// POST /api/confirmations/:serviceId/send — student (re)sends a service to its
// assigned client for confirmation. A service with a client picked at log time
// already routes itself to awaiting_client automatically (see services.ts
// POST / and POST /:id/stop) — this endpoint only covers the one case that
// automatic routing doesn't: a pre-CLI-4 client dispute left the service "rejected"
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

// POST /api/confirmations/:serviceId/report-issue — the client says something
// is wrong with the service (CLI-4). This flags the record for admin review
// and does NOT touch the service's status: the student's submission isn't
// treated as invalid, it just can't go to the educator until the client
// confirms. The client can still confirm later if the issue is resolved.
router.post("/:serviceId/report-issue", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;
  const { reason, note } = req.body as { reason?: unknown; note?: unknown };

  if (typeof reason !== "string" || !(reason in ISSUE_REASONS)) {
    return res.status(400).json({ error: `reason must be one of: ${Object.keys(ISSUE_REASONS).join(", ")}` });
  }
  if (note != null && (typeof note !== "string" || note.length > 1000)) {
    return res.status(400).json({ error: "note must be at most 1000 characters" });
  }
  const trimmedNote = typeof note === "string" ? note.trim() : "";
  if (reason === "other" && !trimmedNote) {
    return res.status(400).json({ error: "Please tell us what went wrong" });
  }

  const { data: service, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, name, client_id, status")
    .eq("id", serviceId)
    .eq("is_demo", req.isDemo ?? false)
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

  const { data: confirmation, error: confErr } = await supabaseAdmin
    .from("confirmations")
    .upsert(
      {
        service_id: serviceId,
        volunteer_id: req.userId!,
        status: "disputed",
        issue_reason: reason,
        issue_note: trimmedNote || null,
      },
      { onConflict: "service_id" }
    )
    .select("id, status, issue_reason, issue_note, created_at")
    .single();

  if (confErr) {
    return res.status(500).json({ error: confErr.message });
  }

  // One open flag per service: reporting again updates the reason rather than
  // stacking duplicates in the admin queue.
  const flagReason = `Client reported an issue with "${service.name}": ${ISSUE_REASONS[reason]}${
    trimmedNote ? ` — ${trimmedNote}` : ""
  }`;
  const { data: openFlag } = await supabaseAdmin
    .from("flags")
    .select("id")
    .eq("entity_type", "service")
    .eq("entity_id", serviceId)
    .eq("status", "open")
    .maybeSingle();
  const { error: flagErr } = openFlag
    ? await supabaseAdmin.from("flags").update({ reason: flagReason }).eq("id", openFlag.id)
    : await supabaseAdmin
        .from("flags")
        .insert({ entity_type: "service", entity_id: serviceId, reason: flagReason, created_by: req.userId! });
  if (flagErr) {
    console.error("report-issue flag error:", flagErr);
  }

  return res.json({ confirmation });
});

export default router;
