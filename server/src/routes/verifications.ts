import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/verifications/students — list all students with service stats (educator only)
router.get(
  "/students",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
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
      .order("full_name");

    if (error) {
      return res.status(500).json({ error: error.message });
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
      id, name, category_id, notes, status, created_at,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      service_photos ( id, type, url )
    `,
      )
      .eq("status", "awaiting_educator")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
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
        id, name, category_id, notes, created_at,
        student:student_id ( id, full_name ),
        service_photos ( id, type, url )
      )
    `,
      )
      .eq("educator_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
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
    const { notes } = req.body;

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", serviceId)
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
      .update({ status: "verified" })
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

export default router;
