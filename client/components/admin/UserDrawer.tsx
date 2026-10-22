"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete, apiErrorMessage } from "@/lib/api";
import Modal from "@/components/admin/Modal";
import { Field, Select, TextInput, FormActions } from "@/components/admin/FormControls";
import { ErrorBanner } from "@/components/admin/DataStates";

export interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: "active" | "suspended" | "deactivated" | "deleted";
  is_demo: boolean;
  institution_id: string | null;
  programme_id: string | null;
  cohort_id: string | null;
  student_id: string | null;
  staff_id: string | null;
  access_level: "view" | "manage" | null;
  created_at: string;
}
export interface Institution {
  id: string;
  name: string;
}
export interface Programme {
  id: string;
  institution_id: string;
  name: string;
}
export interface Cohort {
  id: string;
  programme_id: string;
  name: string;
}

interface Assignment {
  id: string;
  cohort_id: string;
}
interface RecordsResponse {
  services: { id: string; name: string; category_id: string; status: string; created_at: string }[];
  appointments: { id: string; category_id: string; status: string; starts_at: string }[];
}
interface Impact {
  impact: { services: number; appointments: number; verifications: number; shortlist_entries: number };
  retained: string;
  removed: string;
}

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  educator: "Educator",
  school_admin: "School Admin",
  client: "Client / Volunteer Client",
  employer: "Employer",
};

// Role-specific management drawer. Which fields appear depends on the user's role;
// delete is a 3-step flow (button → impact warning → type-the-name confirm).
export default function UserDrawer({
  user,
  institutions,
  programmes,
  cohorts,
  onClose,
  onSaved,
}: {
  user: UserRow;
  institutions: Institution[];
  programmes: Programme[];
  cohorts: Cohort[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const role = user.role;
  const isStudent = role === "student";
  const isEducator = role === "educator";
  const isSchoolAdmin = role === "school_admin";
  const usesPlacement = isStudent || isEducator || isSchoolAdmin;

  const [institutionId, setInstitutionId] = useState(user.institution_id ?? "");
  const [programmeId, setProgrammeId] = useState(user.programme_id ?? "");
  const [cohortId, setCohortId] = useState(user.cohort_id ?? "");
  const [studentId, setStudentId] = useState(user.student_id ?? "");
  const [staffId, setStaffId] = useState(user.staff_id ?? "");
  const [accessLevel, setAccessLevel] = useState(user.access_level ?? "");
  const [status, setStatus] = useState<"active" | "suspended" | "deactivated">(
    user.status === "deleted" ? "deactivated" : user.status,
  );
  const [adminProgrammeIds, setAdminProgrammeIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [addCohort, setAddCohort] = useState("");
  const [records, setRecords] = useState<RecordsResponse | null>(null);
  const [eduStudents, setEduStudents] = useState<{ id: string; full_name: string | null; cohort: { name: string } | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const progOptions = programmes.filter((p) => !institutionId || p.institution_id === institutionId);
  const cohOptions = cohorts.filter((c) => !programmeId || c.programme_id === programmeId);
  const institutionProgrammes = programmes.filter((p) => p.institution_id === institutionId);
  const educatorCohortOptions = cohorts.filter((c) => {
    const prog = programmes.find((p) => p.id === c.programme_id);
    return prog && (!institutionId || prog.institution_id === institutionId) && !assignments.some((a) => a.cohort_id === c.id);
  });

  useEffect(() => {
    (async () => {
      try {
        if (isEducator) {
          const [a, s] = await Promise.all([
            apiGet<{ assignments: Assignment[] }>(`/api/admin/educator-assignments?educator_id=${user.id}`),
            apiGet<{ students: typeof eduStudents }>(`/api/admin/users/${user.id}/students`),
          ]);
          setAssignments(a.assignments);
          setEduStudents(s.students);
        }
        if (isSchoolAdmin) {
          const p = await apiGet<{ programme_ids: string[] }>(`/api/admin/users/${user.id}/programmes`);
          setAdminProgrammeIds(p.programme_ids);
        }
        if (isStudent || role === "client") {
          setRecords(await apiGet<RecordsResponse>(`/api/admin/users/${user.id}/records`));
        }
      } catch {
        /* sections just stay empty */
      }
    })();
  }, [user.id, isEducator, isSchoolAdmin, isStudent, role]);

  const cohortName = (id: string) => cohorts.find((c) => c.id === id)?.name ?? id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body: Record<string, unknown> = { status };
      if (usesPlacement) body.institution_id = institutionId || null;
      if (isStudent) {
        body.programme_id = programmeId || null;
        body.cohort_id = cohortId || null;
        body.student_id = studentId || null;
      }
      if (isEducator) body.staff_id = staffId || null;
      if (isSchoolAdmin) {
        body.access_level = accessLevel || null;
        body.school_admin_programme_ids = adminProgrammeIds;
      }
      await apiPatch(`/api/admin/users/${user.id}`, body);
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to update user."));
      setBusy(false);
    }
  }

  async function assign() {
    if (!addCohort) return;
    try {
      const { assignment } = await apiPost<{ assignment: Assignment }>("/api/admin/educator-assignments", {
        educator_id: user.id,
        cohort_id: addCohort,
      });
      setAssignments((a) => [...a, assignment]);
      setAddCohort("");
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to assign cohort."));
    }
  }
  async function unassign(id: string) {
    try {
      await apiDelete(`/api/admin/educator-assignments/${id}`);
      setAssignments((a) => a.filter((x) => x.id !== id));
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to remove assignment."));
    }
  }

  async function startDelete() {
    setErr("");
    try {
      setImpact(await apiGet<Impact>(`/api/admin/users/${user.id}/impact`));
      setDeleteStep(1);
    } catch (e) {
      setErr(apiErrorMessage(e, "Could not load delete impact."));
    }
  }
  async function finishDelete() {
    setBusy(true);
    setErr("");
    try {
      await apiDelete(`/api/admin/users/${user.id}`, { confirm_name: confirmName });
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to delete user."));
      setBusy(false);
    }
  }

  if (deleteStep > 0 && impact) {
    const nameMatches = confirmName.trim() === (user.full_name ?? "").trim();
    return (
      <Modal open title={`Delete ${user.full_name ?? "user"}`} onClose={onClose}>
        {err && <ErrorBanner message={err} />}
        {deleteStep === 1 ? (
          <>
            <p className="mb-3 text-sm font-medium text-red-700">Step 2 of 3 — review what will be affected</p>
            <ul className="mb-3 list-disc pl-5 text-sm text-k-gray-600">
              <li>{impact.impact.services} service record(s)</li>
              <li>{impact.impact.appointments} appointment(s)</li>
              <li>{impact.impact.verifications} verification(s) made</li>
              <li>{impact.impact.shortlist_entries} shortlist entr(ies)</li>
            </ul>
            <p className="mb-2 text-sm font-light text-k-gray-600">
              <span className="font-medium">Retained:</span> {impact.retained}
            </p>
            <p className="mb-4 text-sm font-light text-k-gray-600">
              <span className="font-medium">Removed:</span> {impact.removed} If records must stay linked to a named
              person, deactivate the account instead.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteStep(0)} className="rounded-full border border-k-gray-200 px-5 py-2 text-sm text-k-gray-600">
                Back
              </button>
              <button type="button" onClick={() => setDeleteStep(2)} className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-k-white hover:bg-red-700">
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-red-700">Step 3 of 3 — final confirmation</p>
            <Field label={`Type "${user.full_name ?? ""}" to confirm`}>
              <TextInput value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteStep(1)} disabled={busy} className="rounded-full border border-k-gray-200 px-5 py-2 text-sm text-k-gray-600">
                Back
              </button>
              <button
                type="button"
                onClick={finishDelete}
                disabled={busy || !nameMatches}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-k-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal open title={user.full_name ?? "Manage user"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <p className="mb-4 text-xs text-k-gray-400">
          <span className="font-medium text-k-gray-600">{ROLE_LABEL[role] ?? role}</span> · {user.phone ?? "no phone"}
        </p>

        {usesPlacement && (
          <Field label="Institution">
            <Select
              value={institutionId}
              onChange={(e) => {
                setInstitutionId(e.target.value);
                setProgrammeId("");
                setCohortId("");
                setAdminProgrammeIds([]);
              }}
            >
              <option value="">— none —</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {isStudent && (
          <>
            <Field label="Student ID">
              <TextInput value={studentId} onChange={(e) => setStudentId(e.target.value)} maxLength={64} />
            </Field>
            <Field label="Programme">
              <Select
                value={programmeId}
                onChange={(e) => {
                  setProgrammeId(e.target.value);
                  setCohortId("");
                }}
                disabled={!institutionId}
              >
                <option value="">— none —</option>
                {progOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cohort">
              <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)} disabled={!programmeId}>
                <option value="">— none —</option>
                {cohOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {isEducator && (
          <>
            <Field label="Staff ID" hint="Optional">
              <TextInput value={staffId} onChange={(e) => setStaffId(e.target.value)} maxLength={64} />
            </Field>
            <div className="mb-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-k-gray-400">
                Assigned cohorts (programme / cohort)
              </span>
              <div className="mb-2 flex flex-wrap gap-2">
                {assignments.length === 0 && <span className="text-sm text-k-gray-400">None — sees all students until assigned.</span>}
                {assignments.map((a) => {
                  const c = cohorts.find((x) => x.id === a.cohort_id);
                  const p = programmes.find((x) => x.id === c?.programme_id);
                  return (
                    <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">
                      {p?.name ?? "?"} / {cohortName(a.cohort_id)}
                      <button type="button" onClick={() => unassign(a.id)} aria-label="Remove assignment" className="font-bold">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Select value={addCohort} onChange={(e) => setAddCohort(e.target.value)}>
                  <option value="">Add a cohort…</option>
                  {educatorCohortOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {programmes.find((p) => p.id === c.programme_id)?.name} / {c.name}
                    </option>
                  ))}
                </Select>
                <button type="button" onClick={assign} disabled={!addCohort} className="rounded-full bg-k-primary px-4 text-sm text-k-white disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>
            <div className="mb-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-k-gray-400">
                Assigned students ({eduStudents.length})
              </span>
              <p className="text-sm font-light text-k-gray-600">
                {eduStudents.length === 0 ? "No students in assigned cohorts." : eduStudents.map((s) => s.full_name ?? "—").join(", ")}
              </p>
            </div>
          </>
        )}

        {isSchoolAdmin && (
          <>
            <Field label="Access level" hint="View = read-only; Manage = can act on submissions and bookings.">
              <Select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
                <option value="">— not set —</option>
                <option value="view">View only</option>
                <option value="manage">Manage</option>
              </Select>
            </Field>
            <div className="mb-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-k-gray-400">
                Programmes they can administer
              </span>
              {!institutionId ? (
                <p className="text-sm text-k-gray-400">Choose an institution first. Leave all unticked for the whole institution.</p>
              ) : (
                institutionProgrammes.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-k-gray-600">
                    <input
                      type="checkbox"
                      checked={adminProgrammeIds.includes(p.id)}
                      onChange={(e) =>
                        setAdminProgrammeIds((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((i) => i !== p.id)))
                      }
                    />
                    {p.name}
                  </label>
                ))
              )}
            </div>
          </>
        )}

        {records && (
          <div className="mb-4 rounded-xl border border-k-gray-200 p-3 text-sm text-k-gray-600">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-k-gray-400">
              {isStudent ? "Progress / service record" : "Service / appointment history"}
            </p>
            <p>
              {records.services.length} service(s) ({records.services.filter((s) => s.status === "verified").length} verified) ·{" "}
              {records.appointments.length} appointment(s)
            </p>
            {role === "client" && (
              <p className="mt-1 text-xs font-light text-k-gray-400">
                Profile, parish, services and availability are managed by the client; approval status is under Volunteer Clients.
              </p>
            )}
          </div>
        )}

        <Field label="Account status" hint="Suspended/deactivated accounts are blocked from signing in; records are kept.">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </Select>
        </Field>

        <FormActions onCancel={onClose} busy={busy} submitLabel="Save changes" />
        <div className="mt-4 border-t border-k-gray-200 pt-4">
          <button type="button" onClick={startDelete} className="text-sm font-medium text-red-600 hover:underline">
            Delete user…
          </button>
        </div>
      </form>
    </Modal>
  );
}
