import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/programmes (super_admin only).
const router = Router();

const SELECT = "id, institution_id, name, description, required_services_count, created_at";

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

  return res.json({ programmes: data ?? [] });
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

  // Ensure the parent institution exists (FK would reject anyway, but this gives a clean 400).
  const { data: inst } = await supabaseAdmin.from("institutions").select("id").eq("id", institution_id).single();
  if (!inst) {
    return res.status(400).json({ error: "institution_id does not reference an existing institution" });
  }

  const { data, error } = await supabaseAdmin
    .from("programmes")
    .insert({
      institution_id,
      name: name.trim(),
      description: description ?? null,
      ...(required_services_count !== undefined ? { required_services_count } : {}),
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin programmes POST / error:", error);
    return res.status(500).json({ error: "Failed to create programme" });
  }

  return res.status(201).json({ programme: data });
});

// PATCH /:id — update programme fields.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid programme id" });
  }

  const { name, description, required_services_count } = req.body;

  if (name === undefined && description === undefined && required_services_count === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | number | null> = {};

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

  return res.json({ ok: true });
});

export default router;
