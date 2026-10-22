import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { checkProgrammeAllocation, studentCountsBy } from "../../lib/capacity";

// Mounted at /api/admin/programmes (super_admin only).
const router = Router();

const SELECT =
  "id, institution_id, name, description, required_services_count, qualification_type, level, duration_weeks, awarding_body, start_date, end_date, status, capacity, created_at";

const QUALIFICATION_TYPES = ["certificate", "diploma", "advanced_diploma", "apprenticeship", "short_course", "other"];
const PROGRAMME_STATUSES = ["draft", "active", "archived"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

// Validates the SFB-2 detail fields present in `body`. Returns the DB-ready
// updates, or an error message. Shared by POST and PATCH.
function parseDetailFields(body: Record<string, unknown>): { updates: Record<string, string | number | null> } | { error: string } {
  const updates: Record<string, string | number | null> = {};
  const { qualification_type, level, duration_weeks, awarding_body, start_date, end_date, status, capacity } = body;

  if (qualification_type !== undefined) {
    if (qualification_type !== null && !QUALIFICATION_TYPES.includes(qualification_type as string)) {
      return { error: `qualification_type must be one of: ${QUALIFICATION_TYPES.join(", ")}` };
    }
    updates.qualification_type = qualification_type as string | null;
  }
  for (const [field, value] of [["level", level], ["awarding_body", awarding_body]] as const) {
    if (value !== undefined) {
      if (value !== null && (typeof value !== "string" || value.length > 255)) return { error: `${field} must be a string up to 255 characters` };
      updates[field] = typeof value === "string" && value.trim() === "" ? null : (value as string | null);
    }
  }
  for (const [field, value] of [["duration_weeks", duration_weeks], ["capacity", capacity]] as const) {
    if (value !== undefined && value !== null) {
      if (!Number.isInteger(value) || (value as number) < (field === "capacity" ? 0 : 1)) {
        return { error: `${field} must be a ${field === "capacity" ? "non-negative" : "positive"} integer or null` };
      }
    }
    if (value !== undefined) updates[field] = value as number | null;
  }
  for (const [field, value] of [["start_date", start_date], ["end_date", end_date]] as const) {
    if (value !== undefined) {
      if (value !== null && !isValidDate(value)) return { error: `${field} must be a valid YYYY-MM-DD date or null` };
      updates[field] = value as string | null;
    }
  }
  if (status !== undefined) {
    if (typeof status !== "string" || !PROGRAMME_STATUSES.includes(status)) {
      return { error: `status must be one of: ${PROGRAMME_STATUSES.join(", ")}` };
    }
    updates.status = status;
  }
  return { updates };
}

// GET /?institution_id= — list programmes, optionally filtered by institution.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin.from("programmes").select(SELECT).order("created_at", { ascending: false });

  const { institution_id } = req.query;
  if (institution_id !== undefined) {
    if (!isUuid(institution_id)) {
      return res.status(400).json({ error: "Invalid institution_id filter" });
    }
    query = query.eq("institution_id", institution_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin programmes GET / error:", error);
    return res.status(500).json({ error: "Failed to list programmes" });
  }

  try {
    const counts = await studentCountsBy("programme_id", (data ?? []).map((p) => p.id as string));
    return res.json({ programmes: (data ?? []).map((p) => ({ ...p, student_count: counts[p.id as string] ?? 0 })) });
  } catch (err) {
    console.error("admin programmes GET / counts error:", err);
    return res.status(500).json({ error: "Failed to list programmes" });
  }
});

// GET /:id — single programme.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid programme id" });
  }

  const { data, error } = await supabaseAdmin.from("programmes").select(SELECT).eq("id", req.params.id).single();
  if (error || !data) {
    return res.status(404).json({ error: "Programme not found" });
  }

  return res.json({ programme: data });
});

// POST / — create a programme under an institution.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { institution_id, name, description, required_services_count } = req.body;

  if (!isUuid(institution_id)) {
    return res.status(400).json({ error: "institution_id must be a valid UUID" });
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return res.status(400).json({ error: "name must be between 1 and 255 characters" });
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }
  if (required_services_count !== undefined) {
    if (!Number.isInteger(required_services_count) || required_services_count < 0) {
      return res.status(400).json({ error: "required_services_count must be a non-negative integer" });
    }
  }

  const detail = parseDetailFields(req.body);
  if ("error" in detail) return res.status(400).json({ error: detail.error });
  if (
    typeof detail.updates.start_date === "string" &&
    typeof detail.updates.end_date === "string" &&
    detail.updates.start_date > detail.updates.end_date
  ) {
    return res.status(400).json({ error: "start_date must be on or before end_date" });
  }

  // Ensure the parent institution exists (FK would reject anyway, but this gives a clean 400).
  const { data: inst } = await supabaseAdmin.from("institutions").select("id").eq("id", institution_id).single();
  if (!inst) {
    return res.status(400).json({ error: "institution_id does not reference an existing institution" });
  }

  try {
    const blocked = await checkProgrammeAllocation(institution_id);
    if (blocked) return res.status(409).json({ error: blocked });
  } catch (err) {
    console.error("admin programmes POST allocation error:", err);
    return res.status(500).json({ error: "Failed to check institution allocation" });
  }

  const { data, error } = await supabaseAdmin
    .from("programmes")
    .insert({
      institution_id,
      name: name.trim(),
      description: description ?? null,
      ...detail.updates,
      ...(required_services_count !== undefined ? { required_services_count } : {}),
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin programmes POST / error:", error);
    return res.status(500).json({ error: "Failed to create programme" });
  }

  await logAudit(req.userId, "create", "programme", data.id, { name: data.name, institution_id });
  return res.status(201).json({ programme: data });
});

// PATCH /:id — update programme fields.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid programme id" });
  }

  const { name, description, required_services_count } = req.body;

  const detail = parseDetailFields(req.body);
  if ("error" in detail) return res.status(400).json({ error: detail.error });

  const updates: Record<string, string | number | null> = { ...detail.updates };

  if (name === undefined && description === undefined && required_services_count === undefined && Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  if ("start_date" in updates || "end_date" in updates) {
    const { data: existing } = await supabaseAdmin.from("programmes").select("start_date, end_date").eq("id", req.params.id).single();
    if (!existing) return res.status(404).json({ error: "Programme not found" });
    const effStart = "start_date" in updates ? updates.start_date : existing.start_date;
    const effEnd = "end_date" in updates ? updates.end_date : existing.end_date;
    if (effStart && effEnd && effStart > effEnd) {
      return res.status(400).json({ error: "start_date must be on or before end_date" });
    }
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    }
    updates.name = name.trim();
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== "string") {
      return res.status(400).json({ error: "description must be a string" });
    }
    updates.description = description;
  }
  if (required_services_count !== undefined) {
    if (!Number.isInteger(required_services_count) || required_services_count < 0) {
      return res.status(400).json({ error: "required_services_count must be a non-negative integer" });
    }
    updates.required_services_count = required_services_count;
  }

  const { data, error } = await supabaseAdmin.from("programmes").update(updates).eq("id", req.params.id).select(SELECT).single();
  if (error || !data) {
    console.error("admin programmes PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update programme" : "Programme not found" });
  }

  await logAudit(req.userId, "update", "programme", data.id, updates);
  return res.json({ programme: data });
});

// DELETE /:id — hard delete (cascades to cohorts).
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid programme id" });
  }

  const { error } = await supabaseAdmin.from("programmes").delete().eq("id", req.params.id);
  if (error) {
    console.error("admin programmes DELETE /:id error:", error);
    return res.status(500).json({ error: "Failed to delete programme" });
  }

  await logAudit(req.userId, "delete", "programme", req.params.id, null);
  return res.json({ ok: true });
});

export default router;
