import { supabaseAdmin } from "./supabase";

// Capacity / allocation helpers (SFB-2). NULL limits mean "unlimited".
// Usage is always derived: deleted and demo accounts never count against a school.

async function countStudents(filter: { institution_id?: string; programme_id?: string; cohort_id?: string }, excludeUserId?: string): Promise<number> {
  let q = supabaseAdmin
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .eq("is_demo", false)
    .neq("status", "deleted");
  if (filter.institution_id) q = q.eq("institution_id", filter.institution_id);
  if (filter.programme_id) q = q.eq("programme_id", filter.programme_id);
  if (filter.cohort_id) q = q.eq("cohort_id", filter.cohort_id);
  if (excludeUserId) q = q.neq("id", excludeUserId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

// Student counts per programme / cohort, for the admin lists.
export async function studentCountsBy(column: "programme_id" | "cohort_id", ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select(column)
    .eq("role", "student")
    .eq("is_demo", false)
    .neq("status", "deleted")
    .in(column, ids);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as Record<string, string>[]) {
    counts[row[column]] = (counts[row[column]] ?? 0) + 1;
  }
  return counts;
}

export async function getSubscription(institutionId: string) {
  const { data, error } = await supabaseAdmin
    .from("institution_subscriptions")
    .select("institution_id, plan_name, max_programmes, max_students, status, period_start, period_end, notes, updated_at")
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Subscriptions that are expired/cancelled grant nothing new; trial/active apply their limits.
function activeLimits(sub: Awaited<ReturnType<typeof getSubscription>>) {
  if (!sub) return { maxProgrammes: null, maxStudents: null, blocked: false };
  const blocked = sub.status === "expired" || sub.status === "cancelled";
  return { maxProgrammes: sub.max_programmes as number | null, maxStudents: sub.max_students as number | null, blocked };
}

export async function usageForInstitution(institutionId: string) {
  const [{ count: programmes }, students] = await Promise.all([
    supabaseAdmin.from("programmes").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
    countStudents({ institution_id: institutionId }),
  ]);
  return { programmes: programmes ?? 0, students };
}

// Returns an error message when the institution cannot add another programme.
export async function checkProgrammeAllocation(institutionId: string): Promise<string | null> {
  const sub = await getSubscription(institutionId);
  const { maxProgrammes, blocked } = activeLimits(sub);
  if (blocked) return `This institution's subscription is ${sub!.status}`;
  if (maxProgrammes == null) return null;
  const { programmes } = await usageForInstitution(institutionId);
  return programmes >= maxProgrammes ? `Programme limit reached (${programmes}/${maxProgrammes}) for this institution's plan` : null;
}

// Returns an error message when placing `userId` (a student) into the given
// institution/programme/cohort would exceed a limit. Students already in the
// target are excluded from the count, so re-saving an unchanged placement passes.
export async function checkStudentPlacement(
  userId: string,
  target: { institution_id: string | null; programme_id: string | null; cohort_id: string | null },
): Promise<string | null> {
  if (target.cohort_id) {
    const { data: cohort } = await supabaseAdmin.from("cohorts").select("capacity").eq("id", target.cohort_id).single();
    if (cohort?.capacity != null) {
      const n = await countStudents({ cohort_id: target.cohort_id }, userId);
      if (n >= cohort.capacity) return `Cohort is full (${n}/${cohort.capacity})`;
    }
  }
  if (target.programme_id) {
    const { data: prog } = await supabaseAdmin.from("programmes").select("capacity").eq("id", target.programme_id).single();
    if (prog?.capacity != null) {
      const n = await countStudents({ programme_id: target.programme_id }, userId);
      if (n >= prog.capacity) return `Programme is full (${n}/${prog.capacity})`;
    }
  }
  if (target.institution_id) {
    const sub = await getSubscription(target.institution_id);
    const { maxStudents, blocked } = activeLimits(sub);
    if (blocked) return `This institution's subscription is ${sub!.status}`;
    if (maxStudents != null) {
      const n = await countStudents({ institution_id: target.institution_id }, userId);
      if (n >= maxStudents) return `Institution student limit reached (${n}/${maxStudents})`;
    }
  }
  return null;
}
