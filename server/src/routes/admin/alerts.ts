import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";

// Mounted at /api/admin/alerts (super_admin only).
const router = Router();

const SELECT = "id, audience_role, title, body, severity, active, created_by, created_at";
const SEVERITIES = ["info", "warning", "critical"];
const AUDIENCE_ROLES = ["student", "educator", "client", "employer"];

// GET / — all alerts, most recent first.
router.get("/", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin.from("alerts").select(SELECT).order("created_at", { ascending: false });
  if (error) {
    console.error("admin alerts GET / error:", error);
    return res.status(500).json({ error: "Failed to load alerts" });
  }
  return res.json({ alerts: data ?? [] });
});

// POST / — create an alert.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { audience_role, title, body, severity, active } = req.body;

  if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
    return res.status(400).json({ error: "title must be between 1 and 255 characters" });
  }
  if (audience_role !== undefined && audience_role !== null && !AUDIENCE_ROLES.includes(audience_role)) {
    return res.status(400).json({ error: `audience_role must be null or one of: ${AUDIENCE_ROLES.join(", ")}` });
  }
  if (severity !== undefined && !SEVERITIES.includes(severity)) {
    return res.status(400).json({ error: `severity must be one of: ${SEVERITIES.join(", ")}` });
  }
  if (body !== undefined && body !== null && typeof body !== "string") {
    return res.status(400).json({ error: "body must be a string" });
  }
  if (active !== undefined && typeof active !== "boolean") {
    return res.status(400).json({ error: "active must be a boolean" });
  }

  const { data, error } = await supabaseAdmin
    .from("alerts")
    .insert({
      audience_role: audience_role ?? null,
      title: title.trim(),
      body: body ?? null,
      severity: severity ?? "info",
      ...(active !== undefined ? { active } : {}),
      created_by: req.userId ?? null,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("admin alerts POST / error:", error);
    return res.status(500).json({ error: "Failed to create alert" });
  }

  await logAudit(req.userId, "create", "alert", data.id, { title: data.title });
  return res.status(201).json({ alert: data });
});

// PATCH /:id — edit an alert (including the active toggle).
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid alert id" });
  }

  const { audience_role, title, body, severity, active } = req.body;
  const updates: Record<string, string | boolean | null> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
      return res.status(400).json({ error: "title must be between 1 and 255 characters" });
    }
    updates.title = title.trim();
  }
  if (audience_role !== undefined) {
    if (audience_role !== null && !AUDIENCE_ROLES.includes(audience_role)) {
      return res.status(400).json({ error: `audience_role must be null or one of: ${AUDIENCE_ROLES.join(", ")}` });
    }
    updates.audience_role = audience_role;
  }
  if (body !== undefined) {
    if (body !== null && typeof body !== "string") {
      return res.status(400).json({ error: "body must be a string" });
    }
    updates.body = body;
  }
  if (severity !== undefined) {
    if (!SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: `severity must be one of: ${SEVERITIES.join(", ")}` });
    }
    updates.severity = severity;
  }
  if (active !== undefined) {
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be a boolean" });
    }
    updates.active = active;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const { data, error } = await supabaseAdmin.from("alerts").update(updates).eq("id", req.params.id).select(SELECT).single();
  if (error || !data) {
    console.error("admin alerts PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update alert" : "Alert not found" });
  }

  await logAudit(req.userId, "update", "alert", data.id, null);
  return res.json({ alert: data });
});

// DELETE /:id — remove an alert.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid alert id" });
  }
  const { error } = await supabaseAdmin.from("alerts").delete().eq("id", req.params.id);
  if (error) {
    console.error("admin alerts DELETE /:id error:", error);
    return res.status(500).json({ error: "Failed to delete alert" });
  }
  await logAudit(req.userId, "delete", "alert", req.params.id, null);
  return res.json({ ok: true });
});

export default router;
