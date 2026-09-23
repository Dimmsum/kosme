import { Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase";
import { AuthRequest } from "../middleware/auth";

// Cohort scoping for educators (EDU-1). Resolves which students an educator
// may see and act on: educator_assignments.cohort_id → user_profiles.cohort_id.
//
// Returns null when the educator has no assignments, meaning unrestricted —
// they see every student on their side of the demo boundary, as before
// EDU-1. That keeps unassigned educators (and the demo educator, which is
// never assigned) working, and lets admins turn scoping on per educator from
// /admin/educators. Otherwise returns the student ids in the assigned
// cohorts, possibly empty. An empty list is a valid scope: `.in(col, [])`
// matches no rows.
//
// Read fresh on every request, same as the role lookup in requireAuth, so an
// assignment change applies immediately. Throws on a DB error so callers
// fail closed rather than falling back to unrestricted.
export async function educatorStudentScope(educatorId: string): Promise<string[] | null> {
  const { data: assignments, error: assignErr } = await supabaseAdmin
    .from("educator_assignments")
    .select("cohort_id")
    .eq("educator_id", educatorId);
  if (assignErr) throw assignErr;

  const cohortIds = (assignments ?? []).map((a) => a.cohort_id as string);
  if (cohortIds.length === 0) return null;

  const { data: students, error: studentErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("role", "student")
    .in("cohort_id", cohortIds);
  if (studentErr) throw studentErr;

  return (students ?? []).map((s) => s.id as string);
}

// True when the student is inside the scope from educatorStudentScope().
// undefined (scope never resolved) is treated like null.
export function inEducatorScope(scope: string[] | null | undefined, studentId: string | null | undefined): boolean {
  if (scope == null) return true;
  return !!studentId && scope.includes(studentId);
}

// Router-level middleware: resolves the scope once per request for
// educators and stores it on req.educatorScope. Non-educators pass through
// untouched (requireRole on each route still rejects them). A lookup
// failure is a 500, never an unscoped fallback.
export async function attachEducatorScope(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "educator") return next();
  try {
    req.educatorScope = await educatorStudentScope(req.userId!);
    return next();
  } catch (err) {
    console.error("educator scope lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
