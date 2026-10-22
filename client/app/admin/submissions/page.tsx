"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiErrorMessage } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

type Status = "in_progress" | "awaiting_client" | "awaiting_educator" | "corrections_requested" | "verified" | "rejected";

interface Option {
  id: string;
  name: string;
}

interface Submission {
  id: string;
  name: string;
  category_id: string;
  status: Status;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  student: {
    id: string;
    full_name: string | null;
    institution: { name: string } | null;
    programme: { name: string } | null;
    cohort: { name: string } | null;
  } | null;
  client: { id: string; full_name: string | null } | null;
  verification: { status: string } | null;
  confirmation: { status: string } | null;
}

const statusColor: Record<Status, string> = {
  in_progress: "bg-k-primary/10 text-k-primary",
  corrections_requested: "bg-orange-100 text-orange-700",
  awaiting_client: "bg-blue-100 text-blue-700",
  awaiting_educator: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabel: Record<Status, string> = {
  in_progress: "In progress",
  corrections_requested: "Corrections requested",
  awaiting_client: "Awaiting client",
  awaiting_educator: "Awaiting educator",
  verified: "Verified",
  rejected: "Rejected",
};

const FILTERS: { v: string; l: string }[] = [
  { v: "", l: "All" },
  { v: "in_progress", l: "In progress" },
  { v: "awaiting_client", l: "Awaiting client" },
  { v: "awaiting_educator", l: "Awaiting educator" },
  { v: "corrections_requested", l: "Corrections requested" },
  { v: "verified", l: "Verified" },
  { v: "rejected", l: "Rejected" },
];

const selectClass = "rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none disabled:opacity-50";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [institutions, setInstitutions] = useState<Option[]>([]);
  const [programmes, setProgrammes] = useState<Option[]>([]);
  const [cohorts, setCohorts] = useState<Option[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);

  // Reference lists: institutions + categories once; each lower level reloads
  // from the one above it, so a school's programmes/cohorts/students stay separate.
  useEffect(() => {
    apiGet<{ institutions: Option[] }>("/api/admin/institutions").then((r) => setInstitutions(r.institutions)).catch(() => {});
    apiGet<{ categories: { id: string; label: string }[] }>("/api/admin/service-catalog/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setProgrammes([]);
    if (!institutionId) return;
    apiGet<{ programmes: Option[] }>(`/api/admin/programmes?institution_id=${institutionId}`).then((r) => setProgrammes(r.programmes)).catch(() => {});
  }, [institutionId]);
  useEffect(() => {
    setCohorts([]);
    if (!programmeId) return;
    apiGet<{ cohorts: Option[] }>(`/api/admin/cohorts?programme_id=${programmeId}`).then((r) => setCohorts(r.cohorts)).catch(() => {});
  }, [programmeId]);
  useEffect(() => {
    setStudents([]);
    const qs = new URLSearchParams({ role: "student" });
    if (cohortId) qs.set("cohort_id", cohortId);
    else if (programmeId) qs.set("programme_id", programmeId);
    else if (institutionId) qs.set("institution_id", institutionId);
    else return; // too many students to list without narrowing
    apiGet<{ users: { id: string; full_name: string | null }[] }>(`/api/admin/users?${qs}`)
      .then((r) => setStudents(r.users.map((u) => ({ id: u.id, name: u.full_name ?? "—" }))))
      .catch(() => {});
  }, [institutionId, programmeId, cohortId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries({
        status,
        institution_id: institutionId,
        programme_id: programmeId,
        cohort_id: cohortId,
        student_id: studentId,
        category_id: categoryId,
        from,
        to,
      })) {
        if (v) qs.set(k, v);
      }
      const q = qs.toString();
      const r = await apiGet<{ submissions: Submission[]; truncated: boolean }>(`/api/admin/submissions${q ? `?${q}` : ""}`);
      setSubmissions(r.submissions);
      setTruncated(r.truncated);
      setError("");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to load submissions."));
    } finally {
      setLoading(false);
    }
  }, [status, institutionId, programmeId, cohortId, studentId, categoryId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const anyFilter = !!(status || institutionId || programmeId || cohortId || studentId || categoryId || from || to);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Practical Submissions"
        subtitle="Filter by Institution → Programme → Cohort → Student, then by category, status and date."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className={selectClass} value={institutionId} onChange={(e) => { setInstitutionId(e.target.value); setProgrammeId(""); setCohortId(""); setStudentId(""); }}>
          <option value="">All institutions</option>
          {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select className={selectClass} value={programmeId} disabled={!institutionId} onChange={(e) => { setProgrammeId(e.target.value); setCohortId(""); setStudentId(""); }}>
          <option value="">All programmes</option>
          {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={selectClass} value={cohortId} disabled={!programmeId} onChange={(e) => { setCohortId(e.target.value); setStudentId(""); }}>
          <option value="">All cohorts</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectClass} value={studentId} disabled={!institutionId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">{institutionId ? "All students" : "Pick an institution first"}</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-k-gray-400">
          From <input type="date" className={selectClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs text-k-gray-400">
          To <input type="date" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {anyFilter && (
          <button
            className="text-xs font-medium text-k-primary hover:underline"
            onClick={() => { setStatus(""); setInstitutionId(""); setProgrammeId(""); setCohortId(""); setStudentId(""); setCategoryId(""); setFrom(""); setTo(""); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              status === f.v ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>
      {truncated && <p className="mb-3 text-xs text-amber-600">Showing the newest 500 — narrow the filters to see the rest.</p>}

      {loading ? (
        <LoadingCard label="Loading submissions…" />
      ) : submissions.length === 0 ? (
        <EmptyCard label="No submissions match this filter." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-k-gray-200 bg-k-gray-100/50 text-xs uppercase tracking-wide text-k-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Confirmation</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-k-gray-200">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-k-gray-100/40">
                    <td className="px-5 py-3">
                      <span className="font-medium text-k-black">{s.name}</span>
                      <span className="ml-2 text-xs text-k-gray-400">{s.category_id}</span>
                      {s.is_demo && (
                        <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">Demo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-k-gray-600">
                      {s.student?.full_name ?? "—"}
                      <span className="block text-xs text-k-gray-400">
                        {[s.student?.institution?.name, s.student?.programme?.name, s.student?.cohort?.name].filter(Boolean).join(" › ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-k-gray-600">{s.client?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-k-gray-600">{s.confirmation?.status ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[s.status]}`}>
                        {statusLabel[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-k-gray-400">
                      {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
