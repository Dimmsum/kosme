import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/cohorts (super_admin only).
const router = Router();

const SELECT = "id, programme_id, name, start_date, end_date, created_at";

// YYYY-MM-DD
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

// GET /?programme_id= — list cohorts, optionally filtered by programme.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin.from("cohorts").select(SELECT).order("created_at", { ascending: false });

  const { programme_id } = req.query;
  if (programme_id !== undefined) {
    if (!isUuid(programme_id)) {
      return res.status(400).json({ error: "Invalid programme_id filter" });
    }
    query = query.eq("programme_id", programme_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin cohorts GET / error:", error);
    return res.status(500).json({ error: "Failed to list cohorts" });
  }

  return res.json({ cohorts: data ?? [] });
});

// GET /:id — single cohort.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid cohort id" });
  }

  const { data, error } = await supabaseAdmin.from("cohorts").select(SELECT).eq("id", req.params.id).single();
  if (error || !data) {
    return res.status(404).json({ error: "Cohort not found" });
  }

  return res.json({ cohort: data });
});

// POST / — create a cohort under a programme.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { programme_id, name, start_date, end_date } = req.body;

  if (!isUuid(programme_id)) {
    return res.status(400).json({ error: "programme_id must be a valid UUID" });
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return res.status(400).json({ error: "name must be between 1 and 255 characters" });
  }
  if (start_date !== undefined && start_date !== null && !isValidDate(start_date)) {
    return res.status(400).json({ error: "start_date must be a valid YYYY-MM-DD date" });
  }
  if (end_date !== undefined && end_date !== null && !isValidDate(end_date)) {
    return res.status(400).json({ error: "end_date must be a valid YYYY-MM-DD date" });
  }
  if (isValidDate(start_date) && isValidDate(end_date) && start_date > end_date) {
    return res.status(400).json({ error: "start_date must be on or before end_date" });
  }

  const { data: prog } = await supabaseAdmin.from("programmes").select("id").eq("id", programme_id).single();
  if (!prog) {
    return res.status(400).json({ error: "programme_id does not reference an existing programme" });
  }

  const { data, error } = await supabaseAdmin
    .from("cohorts")
    .insert({
      programme_id,
      name: name.trim(),
      start_date: start_date ?? null,
      end_date: end_date ?? null,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin cohorts POST / error:", error);
    return res.status(500).json({ error: "Failed to create cohort" });
  }

  return res.status(201).json({ cohort: data });
});

// PATCH /:id — update cohort fields, re-checking date ordering against the merged state.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid cohort id" });
  }

  const { name, start_date, end_date } = req.body;

  if (name === undefined && start_date === undefined && end_date === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | null> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    }
    updates.name = name.trim();
  }
  if (start_date !== undefined) {
    if (start_date !== null && !isValidDate(start_date)) {
      return res.status(400).json({ error: "start_date must be a valid YYYY-MM-DD date" });
    }
    updates.start_date = start_date;
  }
  if (end_date !== undefined) {
    if (end_date !== null && !isValidDate(end_date)) {
      return res.status(400).json({ error: "end_date must be a valid YYYY-MM-DD date" });
    }
    updates.end_date = end_date;
  }

  // Validate ordering against the effective start/end after the update is applied.
  if (start_date !== undefined || end_date !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from("cohorts")
      .select("start_date, end_date")
      .eq("id", req.params.id)
      .single();
    if (!existing) {
      return res.status(404).json({ error: "Cohort not found" });
    }
    const effStart = start_date !== undefined ? start_date : existing.start_date;
    const effEnd = end_date !== undefined ? end_date : existing.end_date;
    if (effStart && effEnd && effStart > effEnd) {
      return res.status(400).json({ error: "start_date must be on or before end_date" });
    }
  }

  const { data, error } = await supabaseAdmin.from("cohorts").update(updates).eq("id", req.params.id).select(SELECT).single();
  if (error || !data) {
    console.error("admin cohorts PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update cohort" : "Cohort not found" });
  }

  return res.json({ cohort: data });
});

// DELETE /:id — hard delete.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid cohort id" });
  }

  const { error } = await supabaseAdmin.from("cohorts").delete().eq("id", req.params.id);
  if (error) {
    console.error("admin cohorts DELETE /:id error:", error);
    return res.status(500).json({ error: "Failed to delete cohort" });
  }

  return res.json({ ok: true });
});

export default router;
