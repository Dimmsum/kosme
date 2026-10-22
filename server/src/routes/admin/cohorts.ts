import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { studentCountsBy } from "../../lib/capacity";

// Mounted at /api/admin/cohorts (super_admin only).
const router = Router();

const SELECT = "id, programme_id, name, start_date, end_date, capacity, created_at";

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

  try {
    const counts = await studentCountsBy("cohort_id", (data ?? []).map((c) => c.id as string));
    return res.json({ cohorts: (data ?? []).map((c) => ({ ...c, student_count: counts[c.id as string] ?? 0 })) });
  } catch (err) {
    console.error("admin cohorts GET / counts error:", err);
    return res.status(500).json({ error: "Failed to list cohorts" });
  }
});

function parseCapacity(v: unknown): { value: number | null } | { error: string } {
  if (v === null) return { value: null };
  if (!Number.isInteger(v) || (v as number) < 0) return { error: "capacity must be a non-negative integer or null" };
  return { value: v as number };
}

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

// GET /:id/students — students placed in the cohort (step Cohort → Students).
router.get("/:id/students", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid cohort id" });
  }
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, student_id, status")
    .eq("role", "student")
    .eq("is_demo", false)
    .neq("status", "deleted")
    .eq("cohort_id", req.params.id)
    .order("full_name");
  if (error) {
    console.error("admin cohorts GET /:id/students error:", error);
    return res.status(500).json({ error: "Failed to list cohort students" });
  }
  return res.json({ students: data ?? [] });
});

// POST / — create a cohort under a programme.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { programme_id, name, start_date, end_date, capacity } = req.body;

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

  let capacityValue: number | null = null;
  if (capacity !== undefined) {
    const c = parseCapacity(capacity);
    if ("error" in c) return res.status(400).json({ error: c.error });
    capacityValue = c.value;
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
      capacity: capacityValue,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin cohorts POST / error:", error);
    return res.status(500).json({ error: "Failed to create cohort" });
  }

  await logAudit(req.userId, "create", "cohort", data.id, { name: data.name, programme_id });
  return res.status(201).json({ cohort: data });
});

// PATCH /:id — update cohort fields, re-checking date ordering against the merged state.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid cohort id" });
  }

  const { name, start_date, end_date, capacity } = req.body;

  if (name === undefined && start_date === undefined && end_date === undefined && capacity === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | number | null> = {};

  if (capacity !== undefined) {
    const c = parseCapacity(capacity);
    if ("error" in c) return res.status(400).json({ error: c.error });
    updates.capacity = c.value;
  }

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

  await logAudit(req.userId, "update", "cohort", data.id, updates);
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

  await logAudit(req.userId, "delete", "cohort", req.params.id, null);
  return res.json({ ok: true });
});

export default router;
