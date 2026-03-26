import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/shortlist — employer's saved students
router.get("/", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("shortlist")
    .select(`
      id, created_at,
      student:student_id (
        id, full_name, institution_id,
        institutions ( name )
      )
    `)
    .eq("employer_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Enrich with verified service count + specialisations per student
  type ShortlistRow = {
    id: string;
    created_at: string;
    student: { id: string; full_name: string | null; institution_id: string | null; institutions: { name: string } | null };
  };

  const enriched = await Promise.all(
    (data as unknown as ShortlistRow[]).map(async (row) => {
      const { data: services } = await supabaseAdmin
        .from("services")
        .select("category_id")
        .eq("student_id", row.student.id)
        .eq("status", "verified");

      const specialisations = [...new Set((services ?? []).map((s) => s.category_id))];
      return {
        shortlist_id: row.id,
        date_added: row.created_at,
        student: {
          ...row.student,
          institution_name: row.student.institutions?.name ?? null,
          verified_count: services?.length ?? 0,
          specialisations,
        },
      };
    })
  );

  return res.json({ shortlist: enriched });
});

// POST /api/shortlist — add a student to the employer's shortlist
router.post("/", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: "studentId is required" });
  }

  const { data, error } = await supabaseAdmin
    .from("shortlist")
    .upsert(
      { employer_id: req.userId!, student_id: studentId },
      { onConflict: "employer_id,student_id" }
    )
    .select("id, created_at")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ entry: data });
});

// DELETE /api/shortlist/:studentId — remove a student from the shortlist
router.delete("/:studentId", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  const { error } = await supabaseAdmin
    .from("shortlist")
    .delete()
    .eq("employer_id", req.userId!)
    .eq("student_id", studentId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

export default router;
