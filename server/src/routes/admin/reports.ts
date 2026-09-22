import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/admin/reports (super_admin only). Read-only MVP aggregates for
// the Reports & Analytics module (RPT-1): verified hours per cohort, pipeline /
// pending-verification counts, and duration_tag timing trends. Deliberately
// basic counts, not a full analytics layer.
//
// "Verified" means services.status = 'verified', the single source of truth
// confirmed in VER-9. A verified service's minutes are the educator's
// adjusted_duration_min when set, else the student's timed actual_duration_min.
// Services logged without the timer have neither and are counted as untimed.
const router = Router();

const PIPELINE_STATUSES = [
  "in_progress",
  "awaiting_client",
  "awaiting_educator",
  "corrections_requested",
  "verified",
  "rejected",
] as const;

const TREND_WEEKS = 8;
const PAGE_SIZE = 1000;

interface ServiceRow {
  student_id: string;
  status: string;
  actual_duration_min: number | null;
  adjusted_duration_min: number | null;
  duration_tag: "under" | "within" | "over" | null;
  ended_at: string | null;
}

type TagCounts = { under: number; within: number; over: number };

// Supabase caps a single select at 1000 rows by default, and these are totals,
// so page through every service rather than silently truncating.
async function fetchAllServices(includeDemo: boolean): Promise<ServiceRow[]> {
  const rows: ServiceRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabaseAdmin
      .from("services")
      .select("student_id, status, actual_duration_min, adjusted_duration_min, duration_tag, ended_at")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (!includeDemo) query = query.eq("is_demo", false);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as ServiceRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// Monday 00:00 UTC of the week containing `d`.
function weekStart(d: Date): Date {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

// GET /?include_demo= — every aggregate the reports page renders, in one call.
router.get("/", async (req: AuthRequest, res: Response) => {
  const includeDemo = req.query.include_demo === "true";

  try {
    let studentQuery = supabaseAdmin.from("user_profiles").select("id, cohort_id").eq("role", "student");
    if (!includeDemo) studentQuery = studentQuery.eq("is_demo", false);

    const [studentsRes, cohortsRes, services] = await Promise.all([
      studentQuery,
      supabaseAdmin.from("cohorts").select("id, name, programme:programme_id ( name )").order("name"),
      fetchAllServices(includeDemo),
    ]);
    if (studentsRes.error) throw studentsRes.error;
    if (cohortsRes.error) throw cohortsRes.error;

    const cohortOf = new Map<string, string | null>();
    for (const s of studentsRes.data ?? []) cohortOf.set(s.id, s.cohort_id);

    // Per-cohort buckets, keyed by cohort id ("" = students with no cohort).
    const buckets = new Map<
      string,
      { students: number; verified_services: number; verified_minutes: number; pending_verifications: number }
    >();
    const bucket = (key: string) => {
      let b = buckets.get(key);
      if (!b) {
        b = { students: 0, verified_services: 0, verified_minutes: 0, pending_verifications: 0 };
        buckets.set(key, b);
      }
      return b;
    };
    for (const c of cohortsRes.data ?? []) bucket(c.id);
    for (const cohortId of cohortOf.values()) bucket(cohortId ?? "").students += 1;

    const pipeline = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0])) as Record<
      (typeof PIPELINE_STATUSES)[number],
      number
    >;
    const totals = { verified_services: 0, verified_minutes: 0, untimed_verified: 0 };
    const timingOverall: TagCounts = { under: 0, within: 0, over: 0 };
    let untagged = 0;

    const thisWeek = weekStart(new Date());
    const weekly = Array.from({ length: TREND_WEEKS }, (_, i) => {
      const start = new Date(thisWeek);
      start.setUTCDate(start.getUTCDate() - 7 * (TREND_WEEKS - 1 - i));
      return { week_start: start.toISOString().slice(0, 10), under: 0, within: 0, over: 0 };
    });
    const weekIndex = new Map(weekly.map((w, i) => [w.week_start, i]));

    for (const s of services) {
      // A service whose student isn't in the (demo-filtered) student set still
      // counts toward platform totals, just not toward any cohort row.
      const cohortKey = cohortOf.has(s.student_id) ? cohortOf.get(s.student_id) ?? "" : null;

      if (s.status in pipeline) pipeline[s.status as keyof typeof pipeline] += 1;

      if (s.status === "verified") {
        const minutes = s.adjusted_duration_min ?? s.actual_duration_min;
        totals.verified_services += 1;
        if (minutes == null) totals.untimed_verified += 1;
        else totals.verified_minutes += minutes;
        if (cohortKey !== null) {
          const b = bucket(cohortKey);
          b.verified_services += 1;
          b.verified_minutes += minutes ?? 0;
        }
      } else if (s.status === "awaiting_educator" && cohortKey !== null) {
        bucket(cohortKey).pending_verifications += 1;
      }

      // Timing trend covers every timed service regardless of review outcome —
      // duration_tag is set on stop, before any verification decision.
      if (s.duration_tag) {
        timingOverall[s.duration_tag] += 1;
        if (s.ended_at) {
          const i = weekIndex.get(weekStart(new Date(s.ended_at)).toISOString().slice(0, 10));
          if (i !== undefined) weekly[i][s.duration_tag] += 1;
        }
      } else if (s.actual_duration_min != null) {
        // Timed, but the service type had no recommended range to compare against.
        untagged += 1;
      }
    }

    const cohorts = (cohortsRes.data ?? []).map((c) => {
      const programme = c.programme as unknown as { name: string } | null;
      return {
        cohort_id: c.id as string | null,
        cohort_name: c.name as string,
        programme_name: programme?.name ?? null,
        ...bucket(c.id),
      };
    });
    const unassigned = buckets.get("");
    if (unassigned) {
      cohorts.push({ cohort_id: null, cohort_name: "No cohort", programme_name: null, ...unassigned });
    }

    return res.json({
      pipeline,
      totals,
      cohorts,
      timing: { overall: timingOverall, untagged, weekly },
    });
  } catch (err) {
    console.error("admin reports GET / error:", err);
    return res.status(500).json({ error: "Failed to load reports" });
  }
});

export default router;
