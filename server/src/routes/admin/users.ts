import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";
import { isUuid } from "../../lib/validation";
import { logAudit } from "../../lib/audit";
import { clerkClient } from "../../lib/clerk";
import { checkStudentPlacement } from "../../lib/capacity";

// Mounted at /api/admin/users (super_admin only). Read + placement/status management
// for user profiles, plus layered deletion (impact preview → name-confirmed anonymise). Role is NOT editable here — an account can only become (or
// stop being) super_admin via server/src/scripts/seed-super-admin.ts, never through
// this route, to keep privilege escalation off the admin API surface.
const router = Router();

const LIST_SELECT = "id, full_name, phone, role, status, is_demo, institution_id, programme_id, cohort_id, student_id, staff_id, access_level, created_at";
const DETAIL_SELECT =
  "id, full_name, phone, role, status, is_demo, institution_id, programme_id, cohort_id, student_id, staff_id, access_level, created_at, " +
  "institution:institution_id ( id, name ), programme:programme_id ( id, name ), cohort:cohort_id ( id, name )";

const SELECTABLE_ROLES = ["student", "educator", "school_admin", "client", "employer"];
// "deleted" is only reachable through DELETE /:id, never PATCH.
const STATUSES = ["active", "suspended", "deactivated", "deleted"];
const PATCH_STATUSES = ["active", "suspended", "deactivated"];
const ACCESS_LEVELS = ["view", "manage"];

// GET /?role=&status=&institution_id=&q=&include_demo= — filtered user list.
// Demo-flagged rows are excluded by default (matching the overview module);
// pass include_demo=true to include them.
router.get("/", async (req: AuthRequest, res: Response) => {
  const { role, status, institution_id, programme_id, cohort_id, q, include_demo } = req.query;

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
  for (const [field, value] of [["programme_id", programme_id], ["cohort_id", cohort_id]] as const) {
    if (value !== undefined) {
      if (!isUuid(value)) return res.status(400).json({ error: `Invalid ${field} filter` });
      query = query.eq(field, value);
    }
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

  const { institution_id, programme_id, cohort_id, status, student_id, staff_id, access_level, school_admin_programme_ids } = req.body;

  if (
    institution_id === undefined &&
    programme_id === undefined &&
    cohort_id === undefined &&
    status === undefined &&
    student_id === undefined &&
    staff_id === undefined &&
    access_level === undefined &&
    !Array.isArray(school_admin_programme_ids)
  ) {
    return res.status(400).json({ error: "Provide at least one field to update" });
  }

  const updates: Record<string, string | null> = {};

  for (const [field, value] of [
    ["student_id", student_id],
    ["staff_id", staff_id],
  ] as const) {
    if (value !== undefined) {
      if (value !== null && (typeof value !== "string" || value.length > 64)) {
        return res.status(400).json({ error: `${field} must be a string (max 64) or null` });
      }
      updates[field] = value === "" ? null : value;
    }
  }
  if (access_level !== undefined) {
    if (access_level !== null && !ACCESS_LEVELS.includes(access_level)) {
      return res.status(400).json({ error: `access_level must be one of: ${ACCESS_LEVELS.join(", ")}` });
    }
    updates.access_level = access_level;
  }

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
    if (typeof status !== "string" || !PATCH_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${PATCH_STATUSES.join(", ")}` });
    }
    updates.status = status;
  }

  if (Array.isArray(school_admin_programme_ids)) {
    if (!school_admin_programme_ids.every(isUuid)) {
      return res.status(400).json({ error: "school_admin_programme_ids must be UUIDs" });
    }
    await supabaseAdmin.from("school_admin_programmes").delete().eq("admin_id", req.params.id);
    if (school_admin_programme_ids.length > 0) {
      const { error: spErr } = await supabaseAdmin
        .from("school_admin_programmes")
        .insert(school_admin_programme_ids.map((pid: string) => ({ admin_id: req.params.id, programme_id: pid })));
      if (spErr) return res.status(500).json({ error: "Failed to update administered programmes" });
    }
  }

  // Capacity (SFB-2): only checked when a student's placement actually changes,
  // so suspending/editing an already-placed student never trips a full cohort.
  if ("institution_id" in updates || "programme_id" in updates || "cohort_id" in updates) {
    const { data: current } = await supabaseAdmin
      .from("user_profiles")
      .select("role, status, institution_id, programme_id, cohort_id")
      .eq("id", req.params.id)
      .single();
    if (!current) return res.status(404).json({ error: "User not found" });
    if (current.status === "deleted") return res.status(400).json({ error: "Deleted accounts cannot be edited" });
    if (current.role === "student") {
      const target = {
        institution_id: "institution_id" in updates ? updates.institution_id : current.institution_id,
        programme_id: "programme_id" in updates ? updates.programme_id : current.programme_id,
        cohort_id: "cohort_id" in updates ? updates.cohort_id : current.cohort_id,
      };
      const changed =
        target.institution_id !== current.institution_id ||
        target.programme_id !== current.programme_id ||
        target.cohort_id !== current.cohort_id;
      if (changed) {
        try {
          const blocked = await checkStudentPlacement(req.params.id, target);
          if (blocked) return res.status(409).json({ error: blocked });
        } catch (err) {
          console.error("admin users PATCH capacity error:", err);
          return res.status(500).json({ error: "Failed to check capacity" });
        }
      }
    }
  }

  // Refuse to touch deleted accounts or suspend yourself.
  if (updates.status && req.params.id === req.userId) {
    return res.status(400).json({ error: "You cannot change your own account status" });
  }
  if (Object.keys(updates).length === 0) {
    const { data: unchanged } = await supabaseAdmin.from("user_profiles").select(DETAIL_SELECT).eq("id", req.params.id).single();
    await logAudit(req.userId, "update", "user", req.params.id, { school_admin_programme_ids });
    return res.json({ user: unchanged });
  }

  const { data, error } = await supabaseAdmin.from("user_profiles").update(updates).eq("id", req.params.id).select(DETAIL_SELECT).single();
  if (error || !data) {
    console.error("admin users PATCH /:id error:", error);
    return res.status(error ? 500 : 404).json({ error: error ? "Failed to update user" : "User not found" });
  }

  await logAudit(req.userId, "update", "user", req.params.id, updates);
  return res.json({ user: data });
});

// GET /:id/programmes — programmes a school_admin administers.
router.get("/:id/programmes", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const { data, error } = await supabaseAdmin
    .from("school_admin_programmes")
    .select("programme_id")
    .eq("admin_id", req.params.id);
  if (error) return res.status(500).json({ error: "Failed to load programmes" });
  return res.json({ programme_ids: (data ?? []).map((r) => r.programme_id) });
});

// GET /:id/students — students in the cohorts an educator is assigned to.
router.get("/:id/students", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const { data: assigns, error: aErr } = await supabaseAdmin
    .from("educator_assignments")
    .select("cohort_id")
    .eq("educator_id", req.params.id);
  if (aErr) return res.status(500).json({ error: "Failed to load assignments" });
  const cohortIds = (assigns ?? []).map((a) => a.cohort_id as string);
  if (cohortIds.length === 0) return res.json({ students: [] });
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, student_id, status, cohort:cohort_id ( id, name )")
    .eq("role", "student")
    .in("cohort_id", cohortIds)
    .order("full_name");
  if (error) return res.status(500).json({ error: "Failed to load students" });
  return res.json({ students: data ?? [] });
});

// GET /:id/records — service/appointment record for a student or client.
router.get("/:id/records", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const id = req.params.id;
  const { data: u } = await supabaseAdmin.from("user_profiles").select("role").eq("id", id).single();
  if (!u) return res.status(404).json({ error: "User not found" });
  const col = u.role === "client" ? "client_id" : "student_id";

  const [services, appointments] = await Promise.all([
    supabaseAdmin
      .from("services")
      .select("id, name, category_id, status, created_at")
      .eq(col, id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("appointments")
      .select("id, category_id, status, starts_at")
      .eq(col, id)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);
  if (services.error || appointments.error) {
    console.error("admin users records error:", services.error ?? appointments.error);
    return res.status(500).json({ error: "Failed to load records" });
  }
  return res.json({ services: services.data ?? [], appointments: appointments.data ?? [] });
});

// GET /:id/impact — what a permanent delete would affect (step 2 of 3).
router.get("/:id/impact", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const id = req.params.id;
  const count = async (table: string, column: string) => {
    const { count: n } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq(column, id);
    return n ?? 0;
  };
  const { data: u, error } = await supabaseAdmin.from("user_profiles").select("id, full_name, role, status").eq("id", id).single();
  if (error || !u) return res.status(404).json({ error: "User not found" });

  const [servicesAsStudent, servicesAsClient, appointmentsStudent, appointmentsClient, verifications, shortlist] = await Promise.all([
    count("services", "student_id"),
    count("services", "client_id"),
    count("appointments", "student_id"),
    count("appointments", "client_id"),
    count("verifications", "educator_id"),
    count("shortlist", "employer_id"),
  ]);

  return res.json({
    user: u,
    impact: {
      services: servicesAsStudent + servicesAsClient,
      appointments: appointmentsStudent + appointmentsClient,
      verifications,
      shortlist_entries: shortlist,
    },
    retained: "Verified service records, verifications and appointments are retained for the institution's records but anonymised.",
    removed: "Name, phone, sign-in access and shortlist entries are removed. This cannot be undone.",
  });
});

// DELETE /:id — permanent removal (step 3 of 3). Body { confirm_name } must match
// the user's full name. The profile is anonymised in place (status = 'deleted')
// so retained records keep a valid FK; the Clerk login is deleted.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const id = req.params.id;
  if (id === req.userId) return res.status(400).json({ error: "You cannot delete your own account" });

  const { data: u, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, role, status, clerk_id")
    .eq("id", id)
    .single();
  if (error || !u) return res.status(404).json({ error: "User not found" });
  if (u.role === "super_admin") return res.status(400).json({ error: "Super admin accounts cannot be deleted here" });
  if (u.status === "deleted") return res.status(409).json({ error: "User is already deleted" });
  if (typeof req.body?.confirm_name !== "string" || req.body.confirm_name.trim() !== (u.full_name ?? "").trim()) {
    return res.status(400).json({ error: "confirm_name must match the user's full name" });
  }

  if (u.clerk_id) {
    try {
      await clerkClient.users.deleteUser(u.clerk_id);
    } catch (err) {
      console.error("admin users DELETE clerk error:", err);
      return res.status(502).json({ error: "Failed to remove sign-in access; nothing was deleted" });
    }
  }

  await supabaseAdmin.from("shortlist").delete().eq("employer_id", id);
  await supabaseAdmin.from("educator_assignments").delete().eq("educator_id", id);
  await supabaseAdmin.from("school_admin_programmes").delete().eq("admin_id", id);

  const { error: updErr } = await supabaseAdmin
    .from("user_profiles")
    .update({
      full_name: "Deleted user",
      phone: null,
      student_id: null,
      staff_id: null,
      clerk_id: null,
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    console.error("admin users DELETE anonymise error:", updErr);
    return res.status(500).json({ error: "Failed to delete user" });
  }

  await logAudit(req.userId, "delete", "user", id, { role: u.role, previous_status: u.status });
  return res.json({ ok: true });
});

export default router;
