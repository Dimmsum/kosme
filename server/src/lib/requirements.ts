import { supabaseAdmin } from "./supabase";

// Programme requirement resolution (SFB-3). A programme's requirements are
// dated sets (programme_requirements.effective_from); a student is held to the
// set in force when their cohort began. Students with no programme (incl. demo
// accounts) and programmes with no set yet fall back to the legacy global
// catalogue values (service_categories.max_required, service_types.required_*).

export type ReqScope = "programme" | "category" | "service";

export interface ReqRow {
  scope: ReqScope;
  category_id: string | null;
  service_type_id: string | null;
  required_count: number | null;
  required_hours: number | null;
}

export interface ResolvedRequirements {
  source: "programme" | "legacy";
  effective_from: string | null;
  programme_hours: number | null;
  /** category id → required count (0/absent = not required by this programme) */
  categoryCounts: Record<string, number>;
  categoryHours: Record<string, number>;
  /** service type id → requirement */
  services: Record<string, { count: number; hours: number }>;
}

const today = () => new Date().toISOString().slice(0, 10);

// The set of rows in force on `date`: the latest effective_from <= date, or the
// earliest set if every set starts later (nothing older to preserve).
export function pickSet<T extends { effective_from: string }>(rows: T[], date: string): T[] {
  if (rows.length === 0) return [];
  const dates = Array.from(new Set(rows.map((r) => r.effective_from))).sort();
  const chosen = [...dates].reverse().find((d) => d <= date) ?? dates[0];
  return rows.filter((r) => r.effective_from === chosen);
}

export async function cohortEffectiveDate(cohortId: string | null): Promise<string> {
  if (!cohortId) return today();
  const { data } = await supabaseAdmin.from("cohorts").select("start_date, created_at").eq("id", cohortId).single();
  return data?.start_date ?? (data?.created_at ? String(data.created_at).slice(0, 10) : today());
}

async function legacy(): Promise<ResolvedRequirements> {
  const [cats, types] = await Promise.all([
    supabaseAdmin.from("service_categories").select("id, max_required"),
    supabaseAdmin
      .from("service_types")
      .select("id, required_practical_hours, required_practical_count")
      .or("required_practical_hours.gt.0,required_practical_count.gt.0"),
  ]);
  if (cats.error) throw cats.error;
  if (types.error) throw types.error;
  const out: ResolvedRequirements = {
    source: "legacy",
    effective_from: null,
    programme_hours: null,
    categoryCounts: {},
    categoryHours: {},
    services: {},
  };
  for (const c of cats.data ?? []) out.categoryCounts[c.id as string] = c.max_required as number;
  for (const t of types.data ?? []) {
    out.services[t.id as string] = { count: t.required_practical_count as number, hours: t.required_practical_hours as number };
  }
  return out;
}

export async function resolveRequirementsFor(programmeId: string | null, cohortId: string | null): Promise<ResolvedRequirements> {
  if (!programmeId) return legacy();
  const { data, error } = await supabaseAdmin
    .from("programme_requirements")
    .select("effective_from, scope, category_id, service_type_id, required_count, required_hours")
    .eq("programme_id", programmeId);
  if (error) throw error;
  if (!data || data.length === 0) return legacy();

  const rows = pickSet(data.map((r) => ({ ...r, effective_from: String(r.effective_from) })), await cohortEffectiveDate(cohortId));
  const out: ResolvedRequirements = {
    source: "programme",
    effective_from: rows[0]?.effective_from ?? null,
    programme_hours: null,
    categoryCounts: {},
    categoryHours: {},
    services: {},
  };
  for (const r of rows) {
    if (r.scope === "programme") out.programme_hours = r.required_hours ?? null;
    else if (r.scope === "category" && r.category_id) {
      if (r.required_count) out.categoryCounts[r.category_id] = r.required_count;
      if (r.required_hours) out.categoryHours[r.category_id] = r.required_hours;
    } else if (r.scope === "service" && r.service_type_id) {
      out.services[r.service_type_id] = { count: r.required_count ?? 0, hours: r.required_hours ?? 0 };
    }
  }
  return out;
}

export async function resolveRequirementsForStudent(studentId: string): Promise<ResolvedRequirements> {
  const { data } = await supabaseAdmin.from("user_profiles").select("programme_id, cohort_id").eq("id", studentId).single();
  return resolveRequirementsFor(data?.programme_id ?? null, data?.cohort_id ?? null);
}

// Validates rows from an admin request body. Rows with no count and no hours are dropped.
export function parseReqRows(input: unknown): { rows: ReqRow[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "rows must be an array" };
  const seen = new Set<string>();
  const rows: ReqRow[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const scope = raw?.scope;
    if (scope !== "programme" && scope !== "category" && scope !== "service") return { error: "row.scope must be programme, category or service" };
    const category_id = scope === "category" ? raw.category_id : null;
    const service_type_id = scope === "service" ? raw.service_type_id : null;
    if (scope === "category" && (typeof category_id !== "string" || !category_id)) return { error: "category rows need category_id" };
    if (scope === "service" && (typeof service_type_id !== "string" || !/^[0-9a-f-]{36}$/i.test(service_type_id))) {
      return { error: "service rows need a valid service_type_id" };
    }
    const required_count = raw.required_count ?? null;
    const required_hours = raw.required_hours ?? null;
    for (const [f, v] of [["required_count", required_count], ["required_hours", required_hours]] as const) {
      if (v !== null && (!Number.isInteger(v) || (v as number) < 0)) return { error: `${f} must be a non-negative integer or null` };
    }
    if (scope === "programme" && required_count) return { error: "programme rows only take required_hours" };
    if (!required_count && !required_hours) continue;
    const key = `${scope}:${category_id ?? ""}:${service_type_id ?? ""}`;
    if (seen.has(key)) return { error: `duplicate requirement row: ${key}` };
    seen.add(key);
    rows.push({
      scope,
      category_id: (category_id as string | null) ?? null,
      service_type_id: (service_type_id as string | null) ?? null,
      required_count: (required_count as number | null) || null,
      required_hours: (required_hours as number | null) || null,
    });
  }
  return { rows };
}
