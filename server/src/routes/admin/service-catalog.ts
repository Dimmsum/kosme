import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";

// Mounted at /api/admin/service-catalog (super_admin only). Manages both lookup
// levels: service_categories (text-PK lookup, seeded in 0003) and service_types
// (added in 0015 with recommended durations + required hours/count).
const router = Router();

const CATEGORY_SELECT = "id, label, max_required, created_at";
const TYPE_SELECT =
  "id, category_id, name, recommended_duration_min, recommended_duration_max, required_practical_hours, required_practical_count, created_at";

// Optional non-negative integer field validator; returns an error string or null.
function checkOptionalNonNegInt(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 0) return `${field} must be a non-negative integer`;
  return null;
}

// ── Service categories ──────────────────────────────────────────────────────

// GET /categories — list all service categories.
router.get("/categories", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin.from("service_categories").select(CATEGORY_SELECT).order("id");
  if (error) {
    console.error("admin service-catalog GET /categories error:", error);
    return res.status(500).json({ error: "Failed to list service categories" });
  }
  return res.json({ categories: data ?? [] });
});

// POST /categories — create a category (text PK is caller-supplied, like roles).
router.post("/categories", async (req: AuthRequest, res: Response) => {
  const { id, label, max_required } = req.body;

  if (typeof id !== "string" || id.trim().length === 0 || id.length > 64) {
    return res.status(400).json({ error: "id must be a string between 1 and 64 characters" });
  }
  if (typeof label !== "string" || label.trim().length === 0 || label.length > 255) {
    return res.status(400).json({ error: "label must be between 1 and 255 characters" });
  }
  const maxErr = checkOptionalNonNegInt(max_required, "max_required");
  if (maxErr) return res.status(400).json({ error: maxErr });

  const { data, error } = await supabaseAdmin
    .from("service_categories")
    .insert({ id: id.trim(), label: label.trim(), ...(max_required !== undefined ? { max_required } : {}) })
    .select(CATEGORY_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "A service category with that id already exists" });
    }
    console.error("admin service-catalog POST /categories error:", error);
    return res.status(500).json({ error: "Failed to create service category" });
  }

  await logAudit(req.userId, "create", "service_category", data.id, { label: data.label });
  return res.status(201).json({ category: data });
});

// PATCH /categories/:id — update label / max_required.
router.patch("/categories/:id", async (req: AuthRequest, res: Response) => {
  const { label, max_required } = req.body;

  if (label === undefined && max_required === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | number> = {};
  if (label !== undefined) {
    if (typeof label !== "string" || label.trim().length === 0 || label.length > 255) {
      return res.status(400).json({ error: "label must be between 1 and 255 characters" });
    }
    updates.label = label.trim();
  }
  if (max_required !== undefined) {
    const maxErr = checkOptionalNonNegInt(max_required, "max_required");
    if (maxErr) return res.status(400).json({ error: maxErr });
    updates.max_required = max_required;
  }

  const { data, error } = await supabaseAdmin
    .from("service_categories")
    .update(updates)
    .eq("id", req.params.id)
    .select(CATEGORY_SELECT)
    .single();

  if (error || !data) {
    console.error("admin service-catalog PATCH /categories/:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update service category" : "Service category not found" });
  }

  await logAudit(req.userId, "update", "service_category", data.id, updates);
  return res.json({ category: data });
});

// ── Service types ───────────────────────────────────────────────────────────

// GET /types?category_id= — list service types, optionally filtered by category.
router.get("/types", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin.from("service_types").select(TYPE_SELECT).order("created_at", { ascending: false });

  const { category_id } = req.query;
  if (category_id !== undefined) {
    if (typeof category_id !== "string" || category_id.length === 0) {
      return res.status(400).json({ error: "Invalid category_id filter" });
    }
    query = query.eq("category_id", category_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin service-catalog GET /types error:", error);
    return res.status(500).json({ error: "Failed to list service types" });
  }

  return res.json({ types: data ?? [] });
});

// GET /types/:id — single service type.
router.get("/types/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid service type id" });
  }

  const { data, error } = await supabaseAdmin.from("service_types").select(TYPE_SELECT).eq("id", req.params.id).single();
  if (error || !data) {
    return res.status(404).json({ error: "Service type not found" });
  }

  return res.json({ type: data });
});

// Validate the recommended duration pair; returns an error string or null.
function checkDurationRange(min: unknown, max: unknown): string | null {
  const minErr = checkOptionalNonNegInt(min, "recommended_duration_min");
  if (minErr) return minErr;
  const maxErr = checkOptionalNonNegInt(max, "recommended_duration_max");
  if (maxErr) return maxErr;
  if (typeof min === "number" && typeof max === "number" && min > max) {
    return "recommended_duration_min must be less than or equal to recommended_duration_max";
  }
  return null;
}

// POST /types — create a service type under a category.
router.post("/types", async (req: AuthRequest, res: Response) => {
  const {
    category_id,
    name,
    recommended_duration_min,
    recommended_duration_max,
    required_practical_hours,
    required_practical_count,
  } = req.body;

  if (typeof category_id !== "string" || category_id.length === 0) {
    return res.status(400).json({ error: "category_id is required" });
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return res.status(400).json({ error: "name must be between 1 and 255 characters" });
  }
  const durErr = checkDurationRange(recommended_duration_min, recommended_duration_max);
  if (durErr) return res.status(400).json({ error: durErr });
  const hoursErr = checkOptionalNonNegInt(required_practical_hours, "required_practical_hours");
  if (hoursErr) return res.status(400).json({ error: hoursErr });
  const countErr = checkOptionalNonNegInt(required_practical_count, "required_practical_count");
  if (countErr) return res.status(400).json({ error: countErr });

  const { data: cat } = await supabaseAdmin.from("service_categories").select("id").eq("id", category_id).single();
  if (!cat) {
    return res.status(400).json({ error: "category_id does not reference an existing service category" });
  }

  const { data, error } = await supabaseAdmin
    .from("service_types")
    .insert({
      category_id,
      name: name.trim(),
      recommended_duration_min: recommended_duration_min ?? null,
      recommended_duration_max: recommended_duration_max ?? null,
      ...(required_practical_hours !== undefined ? { required_practical_hours } : {}),
      ...(required_practical_count !== undefined ? { required_practical_count } : {}),
    })
    .select(TYPE_SELECT)
    .single();

  if (error) {
    console.error("admin service-catalog POST /types error:", error);
    return res.status(500).json({ error: "Failed to create service type" });
  }

  await logAudit(req.userId, "create", "service_type", data.id, { name: data.name, category_id });
  return res.status(201).json({ type: data });
});

// PATCH /types/:id — update service type fields.
router.patch("/types/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid service type id" });
  }

  const {
    name,
    recommended_duration_min,
    recommended_duration_max,
    required_practical_hours,
    required_practical_count,
  } = req.body;

  if (
    name === undefined &&
    recommended_duration_min === undefined &&
    recommended_duration_max === undefined &&
    required_practical_hours === undefined &&
    required_practical_count === undefined
  ) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | number | null> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    }
    updates.name = name.trim();
  }

  // Validate the duration range against the effective (merged) values.
  if (recommended_duration_min !== undefined || recommended_duration_max !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from("service_types")
      .select("recommended_duration_min, recommended_duration_max")
      .eq("id", req.params.id)
      .single();
    if (!existing) {
      return res.status(404).json({ error: "Service type not found" });
    }
    const effMin = recommended_duration_min !== undefined ? recommended_duration_min : existing.recommended_duration_min;
    const effMax = recommended_duration_max !== undefined ? recommended_duration_max : existing.recommended_duration_max;
    const durErr = checkDurationRange(effMin, effMax);
    if (durErr) return res.status(400).json({ error: durErr });
    if (recommended_duration_min !== undefined) updates.recommended_duration_min = recommended_duration_min;
    if (recommended_duration_max !== undefined) updates.recommended_duration_max = recommended_duration_max;
  }

  if (required_practical_hours !== undefined) {
    const err = checkOptionalNonNegInt(required_practical_hours, "required_practical_hours");
    if (err) return res.status(400).json({ error: err });
    updates.required_practical_hours = required_practical_hours;
  }
  if (required_practical_count !== undefined) {
    const err = checkOptionalNonNegInt(required_practical_count, "required_practical_count");
    if (err) return res.status(400).json({ error: err });
    updates.required_practical_count = required_practical_count;
  }

  const { data, error } = await supabaseAdmin.from("service_types").update(updates).eq("id", req.params.id).select(TYPE_SELECT).single();
  if (error || !data) {
    console.error("admin service-catalog PATCH /types/:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update service type" : "Service type not found" });
  }

  await logAudit(req.userId, "update", "service_type", data.id, updates);
  return res.json({ type: data });
});

// DELETE /types/:id — hard delete.
router.delete("/types/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid service type id" });
  }

  const { error } = await supabaseAdmin.from("service_types").delete().eq("id", req.params.id);
  if (error) {
    console.error("admin service-catalog DELETE /types/:id error:", error);
    return res.status(500).json({ error: "Failed to delete service type" });
  }

  await logAudit(req.userId, "delete", "service_type", req.params.id, null);
  return res.json({ ok: true });
});

export default router;
