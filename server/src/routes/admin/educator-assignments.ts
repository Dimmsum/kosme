import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/educator-assignments (super_admin only). Links an educator
// (user_profiles with role='educator') to a cohort. A UNIQUE(educator_id, cohort_id)
// constraint (0015) prevents duplicates — surfaced here as a 409.
const router = Router();

const SELECT =
  "id, educator_id, cohort_id, created_at, educator:educator_id ( id, full_name ), cohort:cohort_id ( id, name, programme_id )";

// GET /?educator_id=&cohort_id= — list assignments, optionally filtered.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin.from("educator_assignments").select(SELECT).order("created_at", { ascending: false });

  const { educator_id, cohort_id } = req.query;
  if (educator_id !== undefined) {
    if (!isUuid(educator_id)) {
      return res.status(400).json({ error: "Invalid educator_id filter" });
    }
    query = query.eq("educator_id", educator_id);
  }
  if (cohort_id !== undefined) {
    if (!isUuid(cohort_id)) {
      return res.status(400).json({ error: "Invalid cohort_id filter" });
    }
    query = query.eq("cohort_id", cohort_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin educator-assignments GET / error:", error);
    return res.status(500).json({ error: "Failed to list educator assignments" });
  }

  return res.json({ assignments: data ?? [] });
});

// POST / — assign an educator to a cohort.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { educator_id, cohort_id } = req.body;

  if (!isUuid(educator_id)) {
    return res.status(400).json({ error: "educator_id must be a valid UUID" });
  }
  if (!isUuid(cohort_id)) {
    return res.status(400).json({ error: "cohort_id must be a valid UUID" });
  }

  // The educator_id must resolve to a profile whose role is 'educator'.
  const { data: educator } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role")
    .eq("id", educator_id)
    .single();
  if (!educator || educator.role !== "educator") {
    return res.status(400).json({ error: "educator_id must reference a user with the 'educator' role" });
  }

  const { data: cohort } = await supabaseAdmin.from("cohorts").select("id").eq("id", cohort_id).single();
  if (!cohort) {
    return res.status(400).json({ error: "cohort_id does not reference an existing cohort" });
  }

  const { data, error } = await supabaseAdmin
    .from("educator_assignments")
    .insert({ educator_id, cohort_id })
    .select(SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "This educator is already assigned to that cohort" });
    }
    console.error("admin educator-assignments POST / error:", error);
    return res.status(500).json({ error: "Failed to create educator assignment" });
  }

  return res.status(201).json({ assignment: data });
});

// DELETE /:id — remove an assignment.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }

  const { error } = await supabaseAdmin.from("educator_assignments").delete().eq("id", req.params.id);
  if (error) {
    console.error("admin educator-assignments DELETE /:id error:", error);
    return res.status(500).json({ error: "Failed to delete educator assignment" });
  }

  return res.json({ ok: true });
});

export default router;
