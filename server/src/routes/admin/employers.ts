import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { parseEmployerFields, BUSINESS_TYPES, VERIFICATION_STATUSES } from "../../lib/employer-profile";

// Mounted at /api/admin/employers (super_admin only). Employer accounts with
// their business details, verification status and activity. Suspend/reactivate
// and delete go through /api/admin/users/:id (same controlled flow as every
// other user type).
const router = Router();

const PROFILE_SELECT = "user_id, business_name, contact_person, location, business_type, verification_status, updated_at";

// GET /?q=&status=&verification_status=&business_type=&include_demo=
router.get("/", async (req: AuthRequest, res: Response) => {
  const { q, status, verification_status, business_type, include_demo } = req.query;

  let query = supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, phone, status, is_demo, created_at")
    .eq("role", "employer")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (include_demo !== "true") query = query.eq("is_demo", false);
  if (typeof status === "string" && status) {
    if (!["active", "suspended", "deactivated"].includes(status)) return res.status(400).json({ error: "Invalid status filter" });
    query = query.eq("status", status);
  }

  const { data: employers, error } = await query;
  if (error) {
    console.error("admin employers GET / error:", error);
    return res.status(500).json({ error: "Failed to load employers" });
  }

  const [profiles, shortlist] = await Promise.all([
    supabaseAdmin.from("employer_profiles").select(PROFILE_SELECT),
    supabaseAdmin.from("shortlist").select("employer_id, created_at"),
  ]);
  if (profiles.error || shortlist.error) {
    console.error("admin employers GET / lookups error:", profiles.error ?? shortlist.error);
    return res.status(500).json({ error: "Failed to load employers" });
  }

  const profileById = new Map((profiles.data ?? []).map((p) => [p.user_id as string, p]));
  const activity = new Map<string, { count: number; last: string | null }>();
  for (const row of shortlist.data ?? []) {
    const cur = activity.get(row.employer_id) ?? { count: 0, last: null };
    cur.count += 1;
    if (!cur.last || row.created_at > cur.last) cur.last = row.created_at;
    activity.set(row.employer_id, cur);
  }

  const needle = typeof q === "string" ? q.trim().toLowerCase() : "";
  let result = (employers ?? []).map((e) => {
    const p = profileById.get(e.id);
    const a = activity.get(e.id);
    return {
      ...e,
      business_name: p?.business_name ?? null,
      contact_person: p?.contact_person ?? null,
      location: p?.location ?? null,
      business_type: p?.business_type ?? null,
      verification_status: p?.verification_status ?? "pending",
      shortlist_count: a?.count ?? 0,
      last_shortlisted_at: a?.last ?? null,
    };
  });

  if (typeof verification_status === "string" && verification_status) {
    if (!VERIFICATION_STATUSES.includes(verification_status)) return res.status(400).json({ error: "Invalid verification_status filter" });
    result = result.filter((e) => e.verification_status === verification_status);
  }
  if (typeof business_type === "string" && business_type) {
    if (!BUSINESS_TYPES.includes(business_type)) return res.status(400).json({ error: "Invalid business_type filter" });
    result = result.filter((e) => e.business_type === business_type);
  }
  if (needle) {
    result = result.filter((e) =>
      [e.full_name, e.business_name, e.contact_person, e.location].some((v) => v?.toLowerCase().includes(needle)),
    );
  }

  return res.json({ employers: result });
});

// PUT /:id/profile — Super Admin edits business details and verification status.
router.put("/:id/profile", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid employer id" });

  const parsed = parseEmployerFields(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });
  const updates: Record<string, string | null> = { ...parsed.updates };

  if (req.body?.verification_status !== undefined) {
    if (!VERIFICATION_STATUSES.includes(req.body.verification_status)) {
      return res.status(400).json({ error: `verification_status must be one of: ${VERIFICATION_STATUSES.join(", ")}` });
    }
    updates.verification_status = req.body.verification_status;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Provide at least one field to update" });

  const { data: user } = await supabaseAdmin.from("user_profiles").select("id, role").eq("id", req.params.id).single();
  if (!user || user.role !== "employer") return res.status(404).json({ error: "Employer not found" });

  const { data, error } = await supabaseAdmin
    .from("employer_profiles")
    .upsert({ user_id: req.params.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(PROFILE_SELECT)
    .single();
  if (error) {
    console.error("admin employers PUT /:id/profile error:", error);
    return res.status(500).json({ error: "Failed to save employer details" });
  }

  await logAudit(req.userId, "update", "employer_profile", req.params.id, updates);
  return res.json({ profile: data });
});

export default router;
