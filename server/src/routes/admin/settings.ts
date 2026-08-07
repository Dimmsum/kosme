import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { logAudit } from "../../lib/audit";

// Mounted at /api/admin/settings (super_admin only). Key/value platform config
// stored as JSONB in public.app_settings.
const router = Router();

const SELECT = "key, value, updated_at, updated_by";

// GET / — all settings.
router.get("/", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin.from("app_settings").select(SELECT).order("key");
  if (error) {
    console.error("admin settings GET / error:", error);
    return res.status(500).json({ error: "Failed to load settings" });
  }
  return res.json({ settings: data ?? [] });
});

// PUT /:key — upsert a setting value. Body: { value: <any JSON> }.
router.put("/:key", async (req: AuthRequest, res: Response) => {
  const key = req.params.key;
  if (!key || key.length > 128) {
    return res.status(400).json({ error: "Invalid setting key" });
  }
  if (!("value" in req.body)) {
    return res.status(400).json({ error: "Body must include a 'value' field" });
  }

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      { key, value: req.body.value, updated_at: new Date().toISOString(), updated_by: req.userId ?? null },
      { onConflict: "key" },
    )
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin settings PUT /:key error:", error);
    return res.status(500).json({ error: "Failed to save setting" });
  }

  await logAudit(req.userId, "update", "setting", key, { value: req.body.value });
  return res.json({ setting: data });
});

export default router;
