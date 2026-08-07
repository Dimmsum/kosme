import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";

// Mounted at /api/admin/flags (super_admin only).
const router = Router();

const SELECT =
  "id, entity_type, entity_id, reason, status, created_by, resolved_by, created_at, resolved_at, creator:created_by ( id, full_name ), resolver:resolved_by ( id, full_name )";

const STATUSES = ["open", "resolved", "dismissed"];

// GET /?status= — list flags, most recent first.
router.get("/", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin.from("flags").select(SELECT).order("created_at", { ascending: false });

  const { status } = req.query;
  if (status !== undefined) {
    if (typeof status !== "string" || !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status filter must be one of: ${STATUSES.join(", ")}` });
    }
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin flags GET / error:", error);
    return res.status(500).json({ error: "Failed to load flags" });
  }

  return res.json({ flags: data ?? [] });
});

// POST / — raise a flag against an entity.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { entity_type, entity_id, reason } = req.body;

  if (typeof entity_type !== "string" || entity_type.trim().length === 0) {
    return res.status(400).json({ error: "entity_type is required" });
  }
  if (typeof entity_id !== "string" || entity_id.trim().length === 0) {
    return res.status(400).json({ error: "entity_id is required" });
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "reason is required" });
  }

  const { data, error } = await supabaseAdmin
    .from("flags")
    .insert({
      entity_type: entity_type.trim(),
      entity_id: entity_id.trim(),
      reason: reason.trim(),
      created_by: req.userId ?? null,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin flags POST / error:", error);
    return res.status(500).json({ error: "Failed to create flag" });
  }

  await logAudit(req.userId, "create", "flag", data.id, { entity_type, entity_id });
  return res.status(201).json({ flag: data });
});

// PATCH /:id — resolve or dismiss a flag.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid flag id" });
  }
  const { status } = req.body;
  if (status !== "resolved" && status !== "dismissed" && status !== "open") {
    return res.status(400).json({ error: "status must be 'open', 'resolved', or 'dismissed'" });
  }

  const updates: Record<string, string | null> = { status };
  if (status === "open") {
    updates.resolved_by = null;
    updates.resolved_at = null;
  } else {
    updates.resolved_by = req.userId ?? null;
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin.from("flags").update(updates).eq("id", req.params.id).select(SELECT).single();
  if (error || !data) {
    console.error("admin flags PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update flag" : "Flag not found" });
  }

  await logAudit(req.userId, status, "flag", data.id, null);
  return res.json({ flag: data });
});

export default router;
