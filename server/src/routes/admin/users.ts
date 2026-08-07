import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";

// Mounted at /api/admin/users (super_admin only). Read + placement/status management
// for user profiles. Role is NOT editable here — an account can only become (or
// stop being) super_admin via server/src/scripts/seed-super-admin.ts, never through
// this route, to keep privilege escalation off the admin API surface.
const router = Router();

const LIST_SELECT = "id, full_name, phone, role, status, is_demo, institution_id, programme_id, cohort_id, created_at";
const DETAIL_SELECT =
  "id, full_name, phone, role, status, is_demo, institution_id, programme_id, cohort_id, created_at, " +
  "institution:institution_id ( id, name ), programme:programme_id ( id, name ), cohort:cohort_id ( id, name )";

const SELECTABLE_ROLES = ["student", "educator", "client", "employer"];
const STATUSES = ["active", "suspended"];

// GET /?role=&status=&institution_id=&q=&include_demo= — filtered user list.
// Demo-flagged rows are excluded by default (matching the overview module);
// pass include_demo=true to include them.
router.get("/", async (req: AuthRequest, res: Response) => {
  const { role, status, institution_id, q, include_demo } = req.query;

  let query = supabaseAdmin.from("user_profiles").select(LIST_SELECT).order("created_at", { ascending: false });

  if (include_demo !== "true") {
    query = query.eq("is_demo", false);
  }
  if (role !== undefined) {
    if (typeof role !== "string" || !SELECTABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: `role filter must be one of: ${SELECTABLE_ROLES.join(", ")}` });
    }
    query = query.eq("role", role);
  }
  if (status !== undefined) {
    if (typeof status !== "string" || !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status filter must be one of: ${STATUSES.join(", ")}` });
    }
    query = query.eq("status", status);
  }
  if (institution_id !== undefined) {
    if (!isUuid(institution_id)) {
      return res.status(400).json({ error: "Invalid institution_id filter" });
    }
    query = query.eq("institution_id", institution_id);
  }
  if (q !== undefined) {
    if (typeof q !== "string") {
      return res.status(400).json({ error: "q filter must be a string" });
    }
    query = query.ilike("full_name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin users GET / error:", error);
    return res.status(500).json({ error: "Failed to list users" });
  }

  return res.json({ users: data ?? [] });
});

// GET /:id — single user with institution/programme/cohort names embedded.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const { data, error } = await supabaseAdmin.from("user_profiles").select(DETAIL_SELECT).eq("id", req.params.id).single();
  if (error || !data) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: data });
});

// PATCH /:id — assign institution/programme/cohort and/or set status.
// Role is intentionally not accepted here (see header).
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  if ("role" in req.body) {
    return res.status(400).json({ error: "role cannot be changed through this endpoint" });
  }

  const { institution_id, programme_id, cohort_id, status } = req.body;

  if (
    institution_id === undefined &&
    programme_id === undefined &&
    cohort_id === undefined &&
    status === undefined
  ) {
    return res.status(400).json({ error: "Provide at least one field to update (institution_id, programme_id, cohort_id, status)" });
  }

  const updates: Record<string, string | null> = {};

  // Each of these may be set to null to clear the placement.
  for (const [field, value] of [
    ["institution_id", institution_id],
    ["programme_id", programme_id],
    ["cohort_id", cohort_id],
  ] as const) {
    if (value !== undefined) {
      if (value !== null && !isUuid(value)) {
        return res.status(400).json({ error: `${field} must be a valid UUID or null` });
      }
      updates[field] = value;
    }
  }

  if (status !== undefined) {
    if (typeof status !== "string" || !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    updates.status = status;
  }

  const { data, error } = await supabaseAdmin.from("user_profiles").update(updates).eq("id", req.params.id).select(DETAIL_SELECT).single();
  if (error || !data) {
    console.error("admin users PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update user" : "User not found" });
  }

  return res.json({ user: data });
});

export default router;
