import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/portfolio — student's own verified services
router.get(
  "/",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, created_at,
      service_photos ( id, type, url ),
      verifications ( id, educator_id, created_at, educator:educator_id ( full_name ) )
    `,
      )
      .eq("student_id", req.userId!)
      .eq("status", "verified")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ portfolio: data });
  },
);

// PATCH /api/portfolio/:serviceId/photos — student updates photos for one service
router.patch(
  "/:serviceId/photos",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { photos } = req.body as { photos?: unknown };

    if (
      !Array.isArray(photos) ||
      !photos.every((photo) => typeof photo === "string")
    ) {
      return res.status(400).json({ error: "photos must be an array of URLs" });
    }

    const sanitizedPhotos = photos
      .map((photo) => photo.trim())
      .filter((photo) => photo.length > 0);

    if (sanitizedPhotos.length > 20) {
      return res
        .status(400)
        .json({ error: "A maximum of 20 photos is allowed" });
    }

    const invalidPhoto = sanitizedPhotos.find(
      (photo) => !/^https?:\/\//i.test(photo),
    );
    if (invalidPhoto) {
      return res
        .status(400)
        .json({ error: "All photos must be valid http(s) URLs" });
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("student_id", req.userId!)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("service_photos")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    if (sanitizedPhotos.length === 0) {
      return res.json({ photos: [] });
    }

    const rows = sanitizedPhotos.map((url, index) => ({
      service_id: serviceId,
      type: index % 2 === 0 ? "before" : "after",
      url,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("service_photos")
      .insert(rows)
      .select("id, type, url");

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.json({ photos: inserted ?? [] });
  },
);

// GET /api/portfolio/browse — employer talent search
// Supports ?specialisation=Colour&institution_id=<uuid>
router.get(
  "/browse",
  requireRole("employer"),
  async (req: AuthRequest, res: Response) => {
    const { specialisation, institution_id } = req.query;

    // Get all students who have at least one verified service
    let query = supabaseAdmin
      .from("user_profiles")
      .select(
        `
      id, full_name, institution_id,
      institutions ( name ),
      services!services_student_id_fkey (
        id, category_id, status
      )
    `,
      )
      .not("services", "is", null);

    if (institution_id) {
      query = query.eq("institution_id", institution_id as string);
    }

    const { data: profiles, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Build a summary per student: verified count, category list
    type ServiceRow = { id: string; category_id: string; status: string };
    type ProfileRow = {
      id: string;
      full_name: string | null;
      institution_id: string | null;
      institutions: { name: string } | null;
      services: ServiceRow[];
    };

    const results = (profiles as unknown as ProfileRow[])
      .map((p) => {
        const verified = p.services.filter((s) => s.status === "verified");
        const categories = [...new Set(verified.map((s) => s.category_id))];
        return {
          id: p.id,
          full_name: p.full_name,
          institution_id: p.institution_id,
          institution_name: p.institutions?.name ?? null,
          verified_count: verified.length,
          specialisations: categories,
        };
      })
      .filter((p) => {
        if (p.verified_count === 0) return false;
        if (
          specialisation &&
          !p.specialisations.includes(specialisation as string)
        )
          return false;
        return true;
      })
      .sort((a, b) => b.verified_count - a.verified_count);

    return res.json({ graduates: results });
  },
);

// GET /api/portfolio/:studentId — employer or educator views a specific student's portfolio
router.get("/:studentId", async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  // Only educators and employers can view others' portfolios
  if (!["educator", "employer"].includes(req.userRole ?? "")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select(
      `
      id, name, category_id, created_at,
      service_photos ( id, type, url ),
      verifications ( id, created_at, educator:educator_id ( full_name ) )
    `,
    )
    .eq("student_id", studentId)
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Also return the student's profile
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, institution_id, institutions ( name )")
    .eq("id", studentId)
    .single();

  return res.json({ student: profile, portfolio: data });
});

export default router;
