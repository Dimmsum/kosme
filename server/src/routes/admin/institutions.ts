import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { getSubscription, usageForInstitution } from "../../lib/capacity";

// Mounted at /api/admin/institutions (super_admin only — guard is on the parent mount).
const router = Router();

// GET / — list institutions with a programme count per institution.
router.get("/", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id, name, contact_email, contact_phone, is_active, created_at, programmes(count)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin institutions GET / error:", error);
    return res.status(500).json({ error: "Failed to list institutions" });
  }

  const institutions = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    is_active: row.is_active,
    created_at: row.created_at,
    programme_count: row.programmes?.[0]?.count ?? 0,
  }));

  return res.json({ institutions });
});

// GET /:id — single institution.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid institution id" });
  }

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id, name, contact_email, contact_phone, is_active, created_at")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Institution not found" });
  }

  return res.json({ institution: data });
});

const SUB_STATUSES = ["trial", "active", "expired", "cancelled"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /:id/subscription — allocation (what the plan permits) plus current usage.
router.get("/:id/subscription", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid institution id" });
  try {
    const [subscription, usage] = await Promise.all([getSubscription(req.params.id), usageForInstitution(req.params.id)]);
    return res.json({ subscription, usage });
  } catch (err) {
    console.error("admin institutions GET /:id/subscription error:", err);
    return res.status(500).json({ error: "Failed to load subscription" });
  }
});

// PUT /:id/subscription — create or replace the allocation. Null limits = unlimited.
router.put("/:id/subscription", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid institution id" });
  const { plan_name, max_programmes, max_students, status, period_start, period_end, notes } = req.body;

  for (const [field, value] of [["max_programmes", max_programmes], ["max_students", max_students]] as const) {
    if (value != null && (!Number.isInteger(value) || value < 0)) {
      return res.status(400).json({ error: `${field} must be a non-negative integer or null` });
    }
  }
  if (status !== undefined && !SUB_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${SUB_STATUSES.join(", ")}` });
  }
  for (const [field, value] of [["period_start", period_start], ["period_end", period_end]] as const) {
    if (value != null && (typeof value !== "string" || !DATE_RE.test(value))) {
      return res.status(400).json({ error: `${field} must be a YYYY-MM-DD date or null` });
    }
  }
  if (period_start && period_end && period_start > period_end) {
    return res.status(400).json({ error: "period_start must be on or before period_end" });
  }
  for (const [field, value] of [["plan_name", plan_name], ["notes", notes]] as const) {
    if (value != null && (typeof value !== "string" || value.length > 1000)) {
      return res.status(400).json({ error: `${field} must be a string up to 1000 characters` });
    }
  }

  const { data: inst } = await supabaseAdmin.from("institutions").select("id").eq("id", req.params.id).single();
  if (!inst) return res.status(404).json({ error: "Institution not found" });

  const row = {
    institution_id: req.params.id,
    plan_name: plan_name || null,
    max_programmes: max_programmes ?? null,
    max_students: max_students ?? null,
    status: status ?? "active",
    period_start: period_start || null,
    period_end: period_end || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from("institution_subscriptions").upsert(row, { onConflict: "institution_id" });
  if (error) {
    console.error("admin institutions PUT /:id/subscription error:", error);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
  await logAudit(req.userId, "update", "institution_subscription", req.params.id, row);
  const usage = await usageForInstitution(req.params.id);
  return res.json({ subscription: row, usage });
});

// POST / — create an institution.
router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, contact_email, contact_phone, is_active } = req.body;

  if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return res.status(400).json({ error: "name must be between 1 and 255 characters" });
  }
  if (contact_email !== undefined && contact_email !== null) {
    if (typeof contact_email !== "string" || contact_email.length > 255) {
      return res.status(400).json({ error: "contact_email must be a string up to 255 characters" });
    }
  }
  if (contact_phone !== undefined && contact_phone !== null) {
    if (typeof contact_phone !== "string" || contact_phone.length > 20) {
      return res.status(400).json({ error: "contact_phone must be a string up to 20 characters" });
    }
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be a boolean" });
  }

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .insert({
      name: name.trim(),
      contact_email: contact_email ?? null,
      contact_phone: contact_phone ?? null,
      ...(is_active !== undefined ? { is_active } : {}),
    })
    .select("id, name, contact_email, contact_phone, is_active, created_at")
    .single();

  if (error) {
    console.error("admin institutions POST / error:", error);
    return res.status(500).json({ error: "Failed to create institution" });
  }

  await logAudit(req.userId, "create", "institution", data.id, { name: data.name });
  return res.status(201).json({ institution: data });
});

// PATCH /:id — update fields (including is_active for soft-deactivate).
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid institution id" });
  }

  const { name, contact_email, contact_phone, is_active } = req.body;

  if (name === undefined && contact_email === undefined && contact_phone === undefined && is_active === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | boolean | null> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    }
    updates.name = name.trim();
  }
  if (contact_email !== undefined) {
    if (contact_email !== null && (typeof contact_email !== "string" || contact_email.length > 255)) {
      return res.status(400).json({ error: "contact_email must be a string up to 255 characters" });
    }
    updates.contact_email = contact_email;
  }
  if (contact_phone !== undefined) {
    if (contact_phone !== null && (typeof contact_phone !== "string" || contact_phone.length > 20)) {
      return res.status(400).json({ error: "contact_phone must be a string up to 20 characters" });
    }
    updates.contact_phone = contact_phone;
  }
  if (is_active !== undefined) {
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active must be a boolean" });
    }
    updates.is_active = is_active;
  }

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, name, contact_email, contact_phone, is_active, created_at")
    .single();

  if (error || !data) {
    console.error("admin institutions PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update institution" : "Institution not found" });
  }

  await logAudit(req.userId, "update", "institution", data.id, updates);
  return res.json({ institution: data });
});

// DELETE /:id — hard delete (cascades to programmes → cohorts). For a reversible
// alternative, PATCH { is_active: false } deactivates without removing data.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid institution id" });
  }

  const { error } = await supabaseAdmin.from("institutions").delete().eq("id", req.params.id);

  if (error) {
    console.error("admin institutions DELETE /:id error:", error);
    return res.status(500).json({ error: "Failed to delete institution" });
  }

  await logAudit(req.userId, "delete", "institution", req.params.id, null);
  return res.json({ ok: true });
});

export default router;
