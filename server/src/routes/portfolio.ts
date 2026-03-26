import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/portfolio — student's own verified services
router.get("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, created_at,
      service_photos ( id, type, url ),
      verifications ( id, educator_id, created_at, educator:educator_id ( full_name ) )
    `)
    .eq("student_id", req.userId!)
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ portfolio: data });
});

// GET /api/portfolio/browse — employer talent search
// Supports ?specialisation=Colour&institution_id=<uuid>
router.get("/browse", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const { specialisation, institution_id } = req.query;

  // Get all students who have at least one verified service
  let query = supabaseAdmin
    .from("user_profiles")
    .select(`
      id, full_name, institution_id,
      institutions ( name ),
      services!services_student_id_fkey (
        id, category_id, status
      )
    `)
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
      if (specialisation && !p.specialisations.includes(specialisation as string)) return false;
      return true;
    })
    .sort((a, b) => b.verified_count - a.verified_count);

  return res.json({ graduates: results });
});

// GET /api/portfolio/:studentId — employer or educator views a specific student's portfolio
router.get("/:studentId", async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  // Only educators and employers can view others' portfolios
  if (!["educator", "employer"].includes(req.userRole ?? "")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, created_at,
      service_photos ( id, type, url ),
      verifications ( id, created_at, educator:educator_id ( full_name ) )
    `)
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
