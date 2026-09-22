import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/verifications/students — list all students with service stats (educator only)
router.get(
  "/students",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    // A demo educator only browses demo students; a real educator never sees
    // demo students mixed into their real roster.
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select(
        `
      id, full_name, institution_id, created_at,
      institutions ( name ),
      services!services_student_id_fkey ( id, status )
    `,
      )
      .eq("role", "student")
      .eq("is_demo", req.isDemo ?? false)
      .order("full_name");

    if (error) {
      console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
    }

    type ProfileRow = {
      id: string;
      full_name: string | null;
      institution_id: string | null;
      created_at: string;
      institutions: { name: string } | null;
      services: { id: string; status: string }[];
    };

    const students = (data as unknown as ProfileRow[]).map((p) => {
      const services = p.services ?? [];
      const verified = services.filter((s) => s.status === "verified");
      return {
        id: p.id,
        full_name: p.full_name,
        institution_id: p.institution_id,
        institution_name: p.institutions?.name ?? null,
        verified_count: verified.length,
        total_count: services.length,
      };
    });

    return res.json({ students });
  },
);

// GET /api/verifications/students/:studentId — educator view of a student's service history
router.get(
  "/students/:studentId",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { studentId } = req.params;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, institution_id, institutions ( name )")
      .eq("id", studentId)
      .eq("role", "student")
      .eq("is_demo", req.isDemo ?? false)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Student not found" });
    }

    const { data: services, error: servicesError } = await supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, notes, status, created_at,
      client:client_id ( id, full_name ),
      verifications ( id, status, created_at, notes ),
      service_photos ( id, type, url )
    `,
      )
      .eq("student_id", studentId)
      .eq("is_demo", req.isDemo ?? false)
      .order("created_at", { ascending: false });

    if (servicesError) {
      return res.status(500).json({ error: servicesError.message });
    }

    return res.json({ student: profile, services: services ?? [] });
  },
);

// GET /api/verifications/pending — services awaiting educator review
router.get(
  "/pending",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, notes, reflection_notes, status, created_at,
      started_at, ended_at, actual_duration_min, adjusted_duration_min, duration_tag,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      confirmations ( status, created_at, updated_at ),
      service_photos ( id, type, stage, url )
    `,
      )
      .eq("status", "awaiting_educator")
      .eq("is_demo", req.isDemo ?? false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
    }

    return res.json({ pending: data });
  },
);

// GET /api/verifications/history — services the educator has already verified or rejected
router.get(
  "/history",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("verifications")
      .select(
        `
      id, status, notes, created_at,
      service:service_id (
        id, name, category_id, notes, reflection_notes, created_at,
        started_at, ended_at, actual_duration_min, adjusted_duration_min, duration_tag,
        student:student_id ( id, full_name ),
        client:client_id ( id, full_name ),
        confirmations ( status, created_at, updated_at ),
        service_photos ( id, type, stage, url )
      )
    `,
      )
      .eq("educator_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
    }

    return res.json({ history: data });
  },
);

// POST /api/verifications/:serviceId/verify — educator verifies a service
router.post(
  "/:serviceId/verify",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { notes, adjusted_duration_min } = req.body;

    // Optional hour adjustment: the educator may correct the logged duration
    // at approval time without touching the student's own actual_duration_min.
    let adjustedDurationMin: number | null = null;
    if (adjusted_duration_min !== undefined && adjusted_duration_min !== null) {
      const parsed = Number(adjusted_duration_min);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({
          error: "adjusted_duration_min must be a non-negative integer",
        });
      }
      adjustedDurationMin = parsed;
    }

    // Every educator action scopes its service lookup by is_demo, same as the
    // reads above: the demo educator is publicly reachable, so a real
    // service's id must 404 for it rather than be actionable.
    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", serviceId)
      .eq("is_demo", req.isDemo ?? false)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_educator") {
      return res
        .status(400)
        .json({ error: "Service is not awaiting educator verification" });
    }

    // Mark service verified
    const { error: updateErr } = await supabaseAdmin
      .from("services")
      .update({
        status: "verified",
        adjusted_duration_min: adjustedDurationMin,
      })
      .eq("id", serviceId);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    // Upsert verification record
    const { data: verification, error: verErr } = await supabaseAdmin
      .from("verifications")
      .upsert(
        {
          service_id: serviceId,
          educator_id: req.userId!,
          status: "verified",
          notes: notes ?? null,
        },
        { onConflict: "service_id" },
      )
      .select("id, status, notes, created_at")
      .single();

    if (verErr) {
      return res.status(500).json({ error: verErr.message });
    }

    return res.json({ verification });
  },
);

// POST /api/verifications/:serviceId/reject — educator rejects a service
router.post(
  "/:serviceId/reject",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { notes } = req.body;

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", serviceId)
      .eq("is_demo", req.isDemo ?? false)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_educator") {
      return res
        .status(400)
        .json({ error: "Service is not awaiting educator verification" });
    }

    // Mark service rejected
    const { error: updateErr } = await supabaseAdmin
      .from("services")
      .update({ status: "rejected" })
      .eq("id", serviceId);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    // Upsert verification record as rejected
    const { data: verification, error: verErr } = await supabaseAdmin
      .from("verifications")
      .upsert(
        {
          service_id: serviceId,
          educator_id: req.userId!,
          status: "rejected",
          notes: notes ?? null,
        },
        { onConflict: "service_id" },
      )
      .select("id, status, notes, created_at")
      .single();

    if (verErr) {
      return res.status(500).json({ error: verErr.message });
    }

    return res.json({ verification });
  },
);

// POST /api/verifications/:serviceId/request-corrections — educator sends a
// service back to the student with required feedback, instead of a terminal
// reject. Moves the service to 'corrections_requested'; the student fixes it
// up and calls POST /api/services/:id/resubmit to route it back here.
router.post(
  "/:serviceId/request-corrections",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { notes } = req.body;

    if (typeof notes !== "string" || notes.trim().length === 0) {
      return res.status(400).json({
        error: "notes is required — describe what the student needs to fix",
      });
    }
    if (notes.length > 2000) {
      return res.status(400).json({ error: "notes must be at most 2000 characters" });
    }

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", serviceId)
      .eq("is_demo", req.isDemo ?? false)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_educator") {
      return res
        .status(400)
        .json({ error: "Service is not awaiting educator verification" });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("services")
      .update({ status: "corrections_requested" })
      .eq("id", serviceId);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    const { data: verification, error: verErr } = await supabaseAdmin
      .from("verifications")
      .upsert(
        {
          service_id: serviceId,
          educator_id: req.userId!,
          status: "corrections_requested",
          notes: notes.trim(),
        },
        { onConflict: "service_id" },
      )
      .select("id, status, notes, created_at")
      .single();

    if (verErr) {
      return res.status(500).json({ error: verErr.message });
    }

    return res.json({ verification });
  },
);

// POST /api/verifications/:serviceId/flag — educator raises a flag against a
// service for admin attention. Reuses the existing flags table/pattern
// (server/src/routes/admin/flags.ts) rather than a parallel mechanism; does
// not change the service's verification status — flagging and deciding are
// independent actions.
router.post(
  "/:serviceId/flag",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { reason } = req.body;

    if (typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ error: "reason is required" });
    }
    if (reason.length > 2000) {
      return res.status(400).json({ error: "reason must be at most 2000 characters" });
    }

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("is_demo", req.isDemo ?? false)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const { data: flag, error: flagErr } = await supabaseAdmin
      .from("flags")
      .insert({
        entity_type: "service",
        entity_id: serviceId,
        reason: reason.trim(),
        created_by: req.userId ?? null,
      })
      .select("id, entity_type, entity_id, reason, status, created_at")
      .single();

    if (flagErr) {
      console.error("verifications flag error:", flagErr);
      return res.status(500).json({ error: "Failed to raise flag" });
    }

    return res.status(201).json({ flag });
  },
);

export default router;
