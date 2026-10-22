import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { parseReqRows, pickSet } from "../../lib/requirements";

// Mounted at /api/admin/programme-requirements (super_admin only). Requirements
// are stored as dated sets per programme (see migration 0033): saving a set for
// an effective_from date replaces only that date's rows, so earlier sets — and
// the cohorts that began under them — are untouched.
const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SELECT = "id, programme_id, effective_from, scope, category_id, service_type_id, required_count, required_hours";

// GET /?programme_id= — all sets for a programme (newest first) plus which set
// each cohort resolves to, so admins can see existing cohorts are unaffected.
router.get("/", async (req: AuthRequest, res: Response) => {
  const { programme_id } = req.query;
  if (!isUuid(programme_id)) return res.status(400).json({ error: "programme_id must be a valid UUID" });

  const [reqs, cohorts] = await Promise.all([
    supabaseAdmin.from("programme_requirements").select(SELECT).eq("programme_id", programme_id).order("effective_from", { ascending: false }),
    supabaseAdmin.from("cohorts").select("id, name, start_date, created_at").eq("programme_id", programme_id).order("created_at"),
  ]);
  if (reqs.error || cohorts.error) {
    console.error("admin programme-requirements GET error:", reqs.error ?? cohorts.error);
    return res.status(500).json({ error: "Failed to load requirements" });
  }

  const rows = (reqs.data ?? []).map((r) => ({ ...r, effective_from: String(r.effective_from) }));
  const sets = Array.from(new Set(rows.map((r) => r.effective_from)))
    .sort()
    .reverse()
    .map((effective_from) => ({ effective_from, rows: rows.filter((r) => r.effective_from === effective_from) }));

  const cohortUse = await Promise.all(
    (cohorts.data ?? []).map(async (c) => {
      const date = c.start_date ?? String(c.created_at).slice(0, 10);
      return { id: c.id, name: c.name, start_date: c.start_date, uses_set: pickSet(rows, date)[0]?.effective_from ?? null };
    }),
  );
  return res.json({ sets, cohorts: cohortUse });
});

// PUT /?programme_id=&effective_from= — replace the set at that date with `rows`.
router.put("/", async (req: AuthRequest, res: Response) => {
  const { programme_id, effective_from } = req.query;
  if (!isUuid(programme_id)) return res.status(400).json({ error: "programme_id must be a valid UUID" });
  if (typeof effective_from !== "string" || !DATE_RE.test(effective_from) || Number.isNaN(Date.parse(effective_from))) {
    return res.status(400).json({ error: "effective_from must be a YYYY-MM-DD date" });
  }
  const parsed = parseReqRows(req.body?.rows);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const { data: prog } = await supabaseAdmin.from("programmes").select("id").eq("id", programme_id).single();
  if (!prog) return res.status(404).json({ error: "Programme not found" });

  const del = await supabaseAdmin.from("programme_requirements").delete().eq("programme_id", programme_id).eq("effective_from", effective_from);
  if (del.error) {
    console.error("admin programme-requirements PUT delete error:", del.error);
    return res.status(500).json({ error: "Failed to save requirements" });
  }
  if (parsed.rows.length > 0) {
    const ins = await supabaseAdmin
      .from("programme_requirements")
      .insert(parsed.rows.map((r) => ({ ...r, programme_id, effective_from })));
    if (ins.error) {
      console.error("admin programme-requirements PUT insert error:", ins.error);
      return res.status(500).json({ error: "Failed to save requirements" });
    }
  }
  await logAudit(req.userId, "update", "programme_requirements", programme_id, { effective_from, rows: parsed.rows.length });
  return res.json({ ok: true, rows: parsed.rows.length });
});

// DELETE /?programme_id=&effective_from= — remove a whole set.
router.delete("/", async (req: AuthRequest, res: Response) => {
  const { programme_id, effective_from } = req.query;
  if (!isUuid(programme_id)) return res.status(400).json({ error: "programme_id must be a valid UUID" });
  if (typeof effective_from !== "string" || !DATE_RE.test(effective_from)) {
    return res.status(400).json({ error: "effective_from must be a YYYY-MM-DD date" });
  }
  const { error } = await supabaseAdmin.from("programme_requirements").delete().eq("programme_id", programme_id).eq("effective_from", effective_from);
  if (error) return res.status(500).json({ error: "Failed to delete requirement set" });
  await logAudit(req.userId, "delete", "programme_requirements", programme_id, { effective_from });
  return res.json({ ok: true });
});

export default router;
