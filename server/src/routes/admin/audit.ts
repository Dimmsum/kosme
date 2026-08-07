import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/admin/audit (super_admin only). Read-only view of the audit log.
const router = Router();

const SELECT = "id, actor_id, action, entity_type, entity_id, metadata, created_at, actor:actor_id ( id, full_name )";

// GET /?entity_type=&action=&actor_id=&limit= — most recent first.
router.get("/", async (req: AuthRequest, res: Response) => {
  const { entity_type, action, actor_id } = req.query;
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  let query = supabaseAdmin.from("audit_log").select(SELECT).order("created_at", { ascending: false }).limit(limit);

  if (typeof entity_type === "string" && entity_type) query = query.eq("entity_type", entity_type);
  if (typeof action === "string" && action) query = query.eq("action", action);
  if (typeof actor_id === "string" && actor_id) query = query.eq("actor_id", actor_id);

  const { data, error } = await query;
  if (error) {
    console.error("admin audit GET / error:", error);
    return res.status(500).json({ error: "Failed to load audit log" });
  }

  return res.json({ entries: data ?? [] });
});

export default router;
