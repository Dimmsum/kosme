"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, X, Plus } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import { Select } from "@/components/admin/FormControls";

interface Educator {
  id: string;
  full_name: string | null;
  status: string;
}
interface Assignment {
  id: string;
  educator_id: string;
  cohort_id: string;
  cohort: { id: string; name: string; programme_id: string } | null;
}
interface Cohort {
  id: string;
  programme_id: string;
  name: string;
}
interface Programme {
  id: string;
  institution_id: string;
  name: string;
}
interface Institution {
  id: string;
  name: string;
}

const cardClass = "rounded-2xl border border-k-gray-200 bg-k-white";
const rowBtn = "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-k-gray-100";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminEducatorsPage() {
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selId, setSelId] = useState<string | null>(null);
  const [cohortToAssign, setCohortToAssign] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [us, as, cs, ps, is] = await Promise.all([
        apiGet<{ users: Educator[] }>("/api/admin/users?role=educator"),
        apiGet<{ assignments: Assignment[] }>("/api/admin/educator-assignments"),
        apiGet<{ cohorts: Cohort[] }>("/api/admin/cohorts"),
        apiGet<{ programmes: Programme[] }>("/api/admin/programmes"),
        apiGet<{ institutions: Institution[] }>("/api/admin/institutions"),
      ]);
      setEducators(us.users);
      setAssignments(as.assignments);
      setCohorts(cs.cohorts);
      setProgrammes(ps.programmes);
      setInstitutions(is.institutions);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load educator assignments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Build "Institution / Programme / Cohort" labels for every cohort.
  const cohortLabel = useMemo(() => {
    const progById = new Map(programmes.map((p) => [p.id, p]));
    const instById = new Map(institutions.map((i) => [i.id, i]));
    return (cohortId: string, cohortName?: string) => {
      const coh = cohorts.find((c) => c.id === cohortId);
      const name = cohortName ?? coh?.name ?? "Unknown cohort";
      const prog = coh ? progById.get(coh.programme_id) : undefined;
      const inst = prog ? instById.get(prog.institution_id) : undefined;
      return [inst?.name, prog?.name, name].filter(Boolean).join(" / ");
    };
  }, [cohorts, programmes, institutions]);

  const selEducator = educators.find((e) => e.id === selId) ?? null;
  const myAssignments = assignments.filter((a) => a.educator_id === selId);
  const assignedCohortIds = new Set(myAssignments.map((a) => a.cohort_id));
  const availableCohorts = cohorts.filter((c) => !assignedCohortIds.has(c.id));

  async function assign() {
    if (!selId || !cohortToAssign) return;
    setAssigning(true);
    try {
      await apiPost("/api/admin/educator-assignments", { educator_id: selId, cohort_id: cohortToAssign });
      setCohortToAssign("");
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to assign cohort."));
    } finally {
      setAssigning(false);
    }
  }

  async function removeAssignment() {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await apiDelete(`/api/admin/educator-assignments/${confirmRemove.id}`);
      setConfirmRemove(null);
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to remove assignment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Educator Assignments"
        subtitle="Assign educators to cohorts so they only oversee their own students."
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading educators…" />
      ) : educators.length === 0 ? (
        <EmptyCard label="No educator accounts yet." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Educators list */}
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">Educators</h2>
            <div className={`${cardClass} divide-y divide-k-gray-200 overflow-hidden`}>
              {educators.map((ed) => {
                const count = assignments.filter((a) => a.educator_id === ed.id).length;
                return (
                  <button
                    key={ed.id}
                    className={`${rowBtn} ${selId === ed.id ? "bg-k-gray-100" : ""}`}
                    onClick={() => setSelId(ed.id)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                      <GraduationCap size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-k-black">
                        {ed.full_name ?? "Unnamed educator"}
                        {ed.status === "suspended" && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            Suspended
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-k-gray-400">
                        {count} cohort{count === 1 ? "" : "s"} assigned
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Assignments for selected educator */}
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">
              {selEducator ? `${selEducator.full_name ?? "Educator"}'s cohorts` : "Cohorts"}
            </h2>
            {!selEducator ? (
              <EmptyCard label="Select an educator to manage their cohort assignments." />
            ) : (
              <div className="flex flex-col gap-4">
                <div className={`${cardClass} p-4`}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-k-gray-400">Assign a cohort</p>
                  <div className="flex gap-2">
                    <Select value={cohortToAssign} onChange={(e) => setCohortToAssign(e.target.value)}>
                      <option value="">Select a cohort…</option>
                      {availableCohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {cohortLabel(c.id)}
                        </option>
                      ))}
                    </Select>
                    <button
                      onClick={assign}
                      disabled={!cohortToAssign || assigning}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light disabled:opacity-50"
                    >
                      <Plus size={15} /> Assign
                    </button>
                  </div>
                  {availableCohorts.length === 0 && (
                    <p className="mt-2 text-xs text-k-gray-400">No more cohorts available to assign.</p>
                  )}
                </div>

                {myAssignments.length === 0 ? (
                  <EmptyCard label="This educator has no cohort assignments yet." />
                ) : (
                  <div className={`${cardClass} divide-y divide-k-gray-200 overflow-hidden`}>
                    {myAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3">
                        <p className="text-sm text-k-black">{cohortLabel(a.cohort_id, a.cohort?.name)}</p>
                        <button
                          className="rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                          onClick={() => setConfirmRemove(a)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove assignment?"
        message="This educator will no longer be assigned to this cohort."
        confirmLabel="Remove"
        destructive
        busy={busy}
        onConfirm={removeAssignment}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
