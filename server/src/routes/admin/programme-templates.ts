import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { parseReqRows, pickSet, type ReqRow } from "../../lib/requirements";

// Mounted at /api/admin/programme-templates (super_admin only). A template is a
// reusable requirement set. Applying it COPIES the rows into each target
// programme's own dated set (programme_requirements), so a programme can then
// be varied for one institution without touching the template or other schools.
const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROW_SELECT = "scope, category_id, service_type_id, required_count, required_hours";

async function templateRows(templateId: string): Promise<ReqRow[]> {
  const { data, error } = await supabaseAdmin.from("programme_template_requirements").select(ROW_SELECT).eq("template_id", templateId);
  if (error) throw error;
  return (data ?? []) as ReqRow[];
}

async function replaceTemplateRows(templateId: string, rows: ReqRow[]) {
  const del = await supabaseAdmin.from("programme_template_requirements").delete().eq("template_id", templateId);
  if (del.error) throw del.error;
  if (rows.length) {
    const ins = await supabaseAdmin.from("programme_template_requirements").insert(rows.map((r) => ({ ...r, template_id: templateId })));
    if (ins.error) throw ins.error;
  }
}

// GET / — templates with row and linked-programme counts.
router.get("/", async (_req: AuthRequest, res: Response) => {
  const [templates, rows, progs] = await Promise.all([
    supabaseAdmin.from("programme_templates").select("id, name, description, created_at, updated_at").order("name"),
    supabaseAdmin.from("programme_template_requirements").select("template_id"),
    supabaseAdmin.from("programmes").select("template_id").not("template_id", "is", null),
  ]);
  if (templates.error || rows.error || progs.error) {
    console.error("admin programme-templates GET / error:", templates.error ?? rows.error ?? progs.error);
    return res.status(500).json({ error: "Failed to list templates" });
  }
  const tally = (list: { template_id: string | null }[] | null) => {
    const m: Record<string, number> = {};
    for (const r of list ?? []) if (r.template_id) m[r.template_id] = (m[r.template_id] ?? 0) + 1;
    return m;
  };
  const rowCount = tally(rows.data);
  const progCount = tally(progs.data);
  return res.json({
    templates: (templates.data ?? []).map((t) => ({ ...t, requirement_count: rowCount[t.id] ?? 0, programme_count: progCount[t.id] ?? 0 })),
  });
});

// GET /:id — template with its rows and the programmes linked to it.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid template id" });
  const { data: template } = await supabaseAdmin.from("programme_templates").select("id, name, description").eq("id", req.params.id).single();
  if (!template) return res.status(404).json({ error: "Template not found" });
  try {
    const [rows, progs] = await Promise.all([
      templateRows(req.params.id),
      supabaseAdmin.from("programmes").select("id, name, institution_id").eq("template_id", req.params.id),
    ]);
    return res.json({ template, rows, programmes: progs.data ?? [] });
  } catch (err) {
    console.error("admin programme-templates GET /:id error:", err);
    return res.status(500).json({ error: "Failed to load template" });
  }
});

// POST / — create a template: from `rows`, or by copying a programme's set
// (from_programme_id, optionally at `effective_from`, default its latest set).
router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, description, from_programme_id, effective_from } = req.body;
  if (typeof name !== "string" || !name.trim() || name.length > 255) {
    return res.status(400).json({ error: "name must be between 1 and 255 characters" });
  }
  if (description != null && typeof description !== "string") return res.status(400).json({ error: "description must be a string" });

  let rows: ReqRow[] = [];
  if (from_programme_id !== undefined) {
    if (!isUuid(from_programme_id)) return res.status(400).json({ error: "from_programme_id must be a valid UUID" });
    const { data } = await supabaseAdmin
      .from("programme_requirements")
      .select("effective_from, scope, category_id, service_type_id, required_count, required_hours")
      .eq("programme_id", from_programme_id);
    const all = (data ?? []).map((r) => ({ ...r, effective_from: String(r.effective_from) }));
    const date = typeof effective_from === "string" && DATE_RE.test(effective_from) ? effective_from : "9999-12-31";
    rows = pickSet(all, date).map(({ effective_from: _e, ...r }) => r as ReqRow);
  } else if (req.body.rows !== undefined) {
    const parsed = parseReqRows(req.body.rows);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    rows = parsed.rows;
  }

  const { data: template, error } = await supabaseAdmin
    .from("programme_templates")
    .insert({ name: name.trim(), description: description || null })
    .select("id, name, description")
    .single();
  if (error || !template) {
    console.error("admin programme-templates POST error:", error);
    return res.status(500).json({ error: "Failed to create template" });
  }
  try {
    await replaceTemplateRows(template.id, rows);
  } catch (err) {
    console.error("admin programme-templates POST rows error:", err);
    await supabaseAdmin.from("programme_templates").delete().eq("id", template.id);
    return res.status(500).json({ error: "Failed to create template" });
  }
  await logAudit(req.userId, "create", "programme_template", template.id, { name: template.name, rows: rows.length });
  return res.status(201).json({ template });
});

// PATCH /:id — rename / redescribe, and/or replace the rows.
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid template id" });
  const { name, description, rows } = req.body;
  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.length > 255) return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    updates.name = name.trim();
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== "string") return res.status(400).json({ error: "description must be a string" });
    updates.description = description;
  }
  let parsedRows: ReqRow[] | null = null;
  if (rows !== undefined) {
    const parsed = parseReqRows(rows);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    parsedRows = parsed.rows;
  }
  const { data, error } = await supabaseAdmin.from("programme_templates").update(updates).eq("id", req.params.id).select("id, name, description").single();
  if (error || !data) return res.status(error ? 500 : 404).json({ error: error ? "Failed to update template" : "Template not found" });
  try {
    if (parsedRows) await replaceTemplateRows(req.params.id, parsedRows);
  } catch (err) {
    console.error("admin programme-templates PATCH rows error:", err);
    return res.status(500).json({ error: "Failed to update template rows" });
  }
  await logAudit(req.userId, "update", "programme_template", req.params.id, { ...updates, rows: parsedRows?.length });
  return res.json({ template: data });
});

// DELETE /:id — programmes keep their copied sets; template_id is cleared (FK SET NULL).
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid template id" });
  const { error } = await supabaseAdmin.from("programme_templates").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: "Failed to delete template" });
  await logAudit(req.userId, "delete", "programme_template", req.params.id, null);
  return res.json({ ok: true });
});

// POST /:id/apply — copy the template into target programmes' own sets.
// Body: { effective_from, programme_ids?: uuid[], all_linked?: boolean }.
// Targets are the explicit programmes (one, several institutions' programmes) and/or
// every programme already linked to this template. Cohorts that began before
// effective_from keep the set they started with.
router.post("/:id/apply", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid template id" });
  const { effective_from, programme_ids, all_linked } = req.body;
  if (typeof effective_from !== "string" || !DATE_RE.test(effective_from) || Number.isNaN(Date.parse(effective_from))) {
    return res.status(400).json({ error: "effective_from must be a YYYY-MM-DD date" });
  }
  if (programme_ids !== undefined && (!Array.isArray(programme_ids) || !programme_ids.every(isUuid))) {
    return res.status(400).json({ error: "programme_ids must be an array of UUIDs" });
  }

  const targets = new Set<string>(programme_ids ?? []);
  if (all_linked === true) {
    const { data } = await supabaseAdmin.from("programmes").select("id").eq("template_id", req.params.id);
    for (const p of data ?? []) targets.add(p.id as string);
  }
  if (targets.size === 0) return res.status(400).json({ error: "No target programmes" });

  const { data: template } = await supabaseAdmin.from("programme_templates").select("id").eq("id", req.params.id).single();
  if (!template) return res.status(404).json({ error: "Template not found" });

  try {
    const rows = await templateRows(req.params.id);
    const ids = Array.from(targets);
    const { data: existing } = await supabaseAdmin.from("programmes").select("id").in("id", ids);
    const valid = (existing ?? []).map((p) => p.id as string);

    for (const programmeId of valid) {
      const del = await supabaseAdmin.from("programme_requirements").delete().eq("programme_id", programmeId).eq("effective_from", effective_from);
      if (del.error) throw del.error;
      if (rows.length) {
        const ins = await supabaseAdmin.from("programme_requirements").insert(rows.map((r) => ({ ...r, programme_id: programmeId, effective_from })));
        if (ins.error) throw ins.error;
      }
    }
    if (valid.length) {
      const link = await supabaseAdmin.from("programmes").update({ template_id: req.params.id }).in("id", valid);
      if (link.error) throw link.error;
    }
    await logAudit(req.userId, "update", "programme_template", req.params.id, { applied_to: valid, effective_from });
    return res.json({ ok: true, applied: valid.length, skipped: ids.length - valid.length });
  } catch (err) {
    console.error("admin programme-templates apply error:", err);
    return res.status(500).json({ error: "Failed to apply template (some programmes may have been updated)" });
  }
});

export default router;
