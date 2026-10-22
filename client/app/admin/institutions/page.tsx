"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, ChevronRight, Power, ListChecks, X } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiErrorMessage } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import ProgrammeRequirementsModal from "@/components/admin/ProgrammeRequirementsModal";

interface Institution {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  programme_count: number;
}
interface Programme {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  required_services_count: number;
  qualification_type: string | null;
  level: string | null;
  duration_weeks: number | null;
  awarding_body: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "active" | "archived";
  capacity: number | null;
  student_count: number;
  created_at: string;
}
interface Subscription {
  plan_name: string | null;
  max_programmes: number | null;
  max_students: number | null;
  status: "trial" | "active" | "expired" | "cancelled";
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
}
interface Usage {
  programmes: number;
  students: number;
}

const QUALIFICATION_LABELS: Record<string, string> = {
  certificate: "Certificate",
  diploma: "Diploma",
  advanced_diploma: "Advanced diploma",
  apprenticeship: "Apprenticeship",
  short_course: "Short course",
  other: "Other",
};
const capText = (n: number, cap: number | null) => (cap == null ? `${n} students` : `${n}/${cap} students`);
interface Cohort {
  id: string;
  programme_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  student_count: number;
  created_at: string;
}

interface EducatorUser {
  id: string;
  full_name: string | null;
  status: string;
  institution_id: string | null;
}
interface Assignment {
  id: string;
  educator_id: string;
  cohort_id: string;
  educator: { id: string; full_name: string | null } | null;
}
interface CohortStudent {
  id: string;
  full_name: string | null;
  student_id: string | null;
  status: string;
}

const cardClass = "rounded-2xl border border-k-gray-200 bg-k-white";
const rowBtn =
  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-k-gray-100";
const iconBtn = "rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black";
const newBtn =
  "inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selInst, setSelInst] = useState<Institution | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [progLoading, setProgLoading] = useState(false);

  const [selProg, setSelProg] = useState<Programme | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohLoading, setCohLoading] = useState(false);

  const [selCoh, setSelCoh] = useState<Cohort | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Modal state: which entity form is open, and the row being edited (null = create).
  const [modal, setModal] = useState<null | { kind: "inst" | "prog" | "coh"; edit: Institution | Programme | Cohort | null }>(null);
  const [confirm, setConfirm] = useState<null | { kind: "inst" | "prog" | "coh"; row: Institution | Programme | Cohort }>(null);
  const [busy, setBusy] = useState(false);
  const [reqProg, setReqProg] = useState<Programme | null>(null);

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const { institutions } = await apiGet<{ institutions: Institution[] }>("/api/admin/institutions");
      setInstitutions(institutions);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load institutions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const loadProgrammes = useCallback(async (inst: Institution) => {
    setSelInst(inst);
    setSelProg(null);
    setCohorts([]);
    setProgLoading(true);
    try {
      const { programmes } = await apiGet<{ programmes: Programme[] }>(
        `/api/admin/programmes?institution_id=${inst.id}`,
      );
      setProgrammes(programmes);
    } catch (e) {
      setError(errMsg(e, "Failed to load programmes."));
    } finally {
      setProgLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const { assignments } = await apiGet<{ assignments: Assignment[] }>("/api/admin/educator-assignments");
      setAssignments(assignments);
    } catch (e) {
      setError(errMsg(e, "Failed to load educator assignments."));
    }
  }, []);

  const loadCohorts = useCallback(async (prog: Programme) => {
    setSelProg(prog);
    setSelCoh(null);
    setCohLoading(true);
    try {
      const [{ cohorts }] = await Promise.all([
        apiGet<{ cohorts: Cohort[] }>(`/api/admin/cohorts?programme_id=${prog.id}`),
        loadAssignments(),
      ]);
      setCohorts(cohorts);
    } catch (e) {
      setError(errMsg(e, "Failed to load cohorts."));
    } finally {
      setCohLoading(false);
    }
  }, [loadAssignments]);

  async function handleDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "inst") {
        await apiDelete(`/api/admin/institutions/${confirm.row.id}`);
        if (selInst?.id === confirm.row.id) {
          setSelInst(null);
          setProgrammes([]);
          setSelProg(null);
          setCohorts([]);
        }
        await loadInstitutions();
      } else if (confirm.kind === "prog") {
        await apiDelete(`/api/admin/programmes/${confirm.row.id}`);
        if (selProg?.id === confirm.row.id) {
          setSelProg(null);
          setCohorts([]);
        }
        if (selInst) await loadProgrammes(selInst);
        await loadInstitutions();
      } else {
        await apiDelete(`/api/admin/cohorts/${confirm.row.id}`);
        if (selProg) await loadCohorts(selProg);
        if (selCoh?.id === confirm.row.id) setSelCoh(null);
      }
      setConfirm(null);
    } catch (e) {
      setError(errMsg(e, "Failed to delete."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(inst: Institution) {
    try {
      await apiPatch(`/api/admin/institutions/${inst.id}`, { is_active: !inst.is_active });
      await loadInstitutions();
    } catch (e) {
      setError(errMsg(e, "Failed to update institution."));
    }
  }

  const confirmNoun =
    confirm?.kind === "inst" ? "institution" : confirm?.kind === "prog" ? "programme" : "cohort";

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Institutions & Cohorts"
        subtitle="Manage institutions, their programmes, and cohorts."
        action={
          <button className={newBtn} onClick={() => setModal({ kind: "inst", edit: null })}>
            <Plus size={16} /> New Institution
          </button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Institutions column */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">Institutions</h2>
          {loading ? (
            <LoadingCard label="Loading institutions…" />
          ) : institutions.length === 0 ? (
            <EmptyCard label="No institutions yet." />
          ) : (
            <div className={`${cardClass} divide-y divide-k-gray-200 overflow-hidden`}>
              {institutions.map((inst) => (
                <div key={inst.id} className={`flex items-center ${selInst?.id === inst.id ? "bg-k-gray-100" : ""}`}>
                  <button className={rowBtn} onClick={() => loadProgrammes(inst)}>
                    <span className="flex min-w-0 items-center gap-3">
                      <Building2 size={16} className="shrink-0 text-k-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-k-black">
                          {inst.name}
                          {!inst.is_active && (
                            <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">
                              Inactive
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-k-gray-400">
                          {inst.programme_count} programme{inst.programme_count === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-k-gray-400" />
                  </button>
                  <div className="flex items-center gap-0.5 pr-2">
                    <button className={iconBtn} title={inst.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(inst)}>
                      <Power size={15} />
                    </button>
                    <button className={iconBtn} title="Edit" onClick={() => setModal({ kind: "inst", edit: inst })}>
                      <Pencil size={15} />
                    </button>
                    <button className={iconBtn} title="Delete" onClick={() => setConfirm({ kind: "inst", row: inst })}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Programmes column */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-k-gray-400">Programmes</h2>
            {selInst && (
              <button className={newBtn} onClick={() => setModal({ kind: "prog", edit: null })}>
                <Plus size={16} /> New
              </button>
            )}
          </div>
          {selInst && <SubscriptionPanel key={selInst.id} institutionId={selInst.id} programmeCount={programmes.length} />}
          {!selInst ? (
            <EmptyCard label="Select an institution to view its programmes." />
          ) : progLoading ? (
            <LoadingCard label="Loading programmes…" />
          ) : programmes.length === 0 ? (
            <EmptyCard label="No programmes in this institution yet." />
          ) : (
            <div className={`${cardClass} divide-y divide-k-gray-200 overflow-hidden`}>
              {programmes.map((prog) => (
                <div key={prog.id} className={`flex items-center ${selProg?.id === prog.id ? "bg-k-gray-100" : ""}`}>
                  <button className={rowBtn} onClick={() => loadCohorts(prog)}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-k-black">
                        {prog.name}
                        {prog.status !== "active" && (
                          <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium capitalize text-k-gray-600">
                            {prog.status}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-k-gray-400">
                        {[
                          prog.qualification_type ? QUALIFICATION_LABELS[prog.qualification_type] : null,
                          prog.level,
                          capText(prog.student_count, prog.capacity),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-k-gray-400" />
                  </button>
                  <div className="flex items-center gap-0.5 pr-2">
                    <button className={iconBtn} title="Programme requirements" onClick={() => setReqProg(prog)}>
                      <ListChecks size={15} />
                    </button>
                    <button className={iconBtn} title="Edit" onClick={() => setModal({ kind: "prog", edit: prog })}>
                      <Pencil size={15} />
                    </button>
                    <button className={iconBtn} title="Delete" onClick={() => setConfirm({ kind: "prog", row: prog })}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cohorts column */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-k-gray-400">Cohorts</h2>
            {selProg && (
              <button className={newBtn} onClick={() => setModal({ kind: "coh", edit: null })}>
                <Plus size={16} /> New
              </button>
            )}
          </div>
          {!selProg ? (
            <EmptyCard label="Select a programme to view its cohorts." />
          ) : cohLoading ? (
            <LoadingCard label="Loading cohorts…" />
          ) : cohorts.length === 0 ? (
            <EmptyCard label="No cohorts in this programme yet." />
          ) : (
            <div className={`${cardClass} divide-y divide-k-gray-200 overflow-hidden`}>
              {cohorts.map((coh) => (
                <div key={coh.id} className={`flex items-center ${selCoh?.id === coh.id ? "bg-k-gray-100" : ""}`}>
                  <button className={`${rowBtn} flex-1`} onClick={() => setSelCoh(coh)}>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-k-black">{coh.name}</span>
                      <span className="block text-xs text-k-gray-400">
                        {coh.start_date ?? "—"} → {coh.end_date ?? "—"} · {capText(coh.student_count, coh.capacity)}
                      </span>
                      {(() => {
                        const names = assignments.filter((a) => a.cohort_id === coh.id).map((a) => a.educator?.full_name ?? "—");
                        return names.length ? (
                          <span className="block truncate text-xs text-k-gray-600">Educators: {names.join(", ")}</span>
                        ) : (
                          <span className="block text-xs text-amber-600">No educator assigned</span>
                        );
                      })()}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-k-gray-400" />
                  </button>
                  <div className="flex items-center gap-0.5 pr-2">
                    <button className={iconBtn} title="Edit" onClick={() => setModal({ kind: "coh", edit: coh })}>
                      <Pencil size={15} />
                    </button>
                    <button className={iconBtn} title="Delete" onClick={() => setConfirm({ kind: "coh", row: coh })}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selCoh && selProg && selInst && (
            <CohortPeoplePanel
              key={selCoh.id}
              cohort={selCoh}
              institutionId={selInst.id}
              assignments={assignments.filter((a) => a.cohort_id === selCoh.id)}
              onChanged={async () => {
                await loadAssignments();
              }}
            />
          )}
        </section>
      </div>

      {/* Forms */}
      {modal?.kind === "inst" && (
        <InstitutionForm
          edit={modal.edit as Institution | null}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await loadInstitutions();
          }}
        />
      )}
      {modal?.kind === "prog" && selInst && (
        <ProgrammeForm
          institutionId={selInst.id}
          edit={modal.edit as Programme | null}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await loadProgrammes(selInst);
            await loadInstitutions(); // refresh programme_count
          }}
        />
      )}
      {modal?.kind === "coh" && selProg && (
        <CohortForm
          programmeId={selProg.id}
          edit={modal.edit as Cohort | null}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await loadCohorts(selProg);
          }}
        />
      )}

      {reqProg && <ProgrammeRequirementsModal programmeId={reqProg.id} programmeName={reqProg.name} onClose={() => setReqProg(null)} />}

      <ConfirmDialog
        open={!!confirm}
        title={`Delete ${confirmNoun}?`}
        message={
          confirm?.kind === "inst"
            ? "This permanently deletes the institution and cascades to all its programmes and cohorts. Consider deactivating instead."
            : confirm?.kind === "prog"
              ? "This permanently deletes the programme and all its cohorts."
              : "This permanently deletes the cohort."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────

function InstitutionForm({
  edit,
  onClose,
  onSaved,
}: {
  edit: Institution | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [email, setEmail] = useState(edit?.contact_email ?? "");
  const [phone, setPhone] = useState(edit?.contact_phone ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = { name: name.trim(), contact_email: email.trim() || null, contact_phone: phone.trim() || null };
    try {
      if (edit) await apiPatch(`/api/admin/institutions/${edit.id}`, body);
      else await apiPost("/api/admin/institutions", body);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save institution."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Institution" : "New Institution"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Contact email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contact phone">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        </Field>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}

function ProgrammeForm({
  institutionId,
  edit,
  onClose,
  onSaved,
}: {
  institutionId: string;
  edit: Programme | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [qualification, setQualification] = useState(edit?.qualification_type ?? "");
  const [level, setLevel] = useState(edit?.level ?? "");
  const [duration, setDuration] = useState(edit?.duration_weeks != null ? String(edit.duration_weeks) : "");
  const [awardingBody, setAwardingBody] = useState(edit?.awarding_body ?? "");
  const [start, setStart] = useState(edit?.start_date ?? "");
  const [end, setEnd] = useState(edit?.end_date ?? "");
  const [status, setStatus] = useState<Programme["status"]>(edit?.status ?? "active");
  const [capacity, setCapacity] = useState(edit?.capacity != null ? String(edit.capacity) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = {
      institution_id: institutionId,
      name: name.trim(),
      description: description.trim() || null,
      qualification_type: qualification || null,
      level: level.trim() || null,
      duration_weeks: duration ? Number(duration) : null,
      awarding_body: awardingBody.trim() || null,
      start_date: start || null,
      end_date: end || null,
      status,
      capacity: capacity ? Number(capacity) : null,
    };
    try {
      if (edit) await apiPatch(`/api/admin/programmes/${edit.id}`, body);
      else await apiPost("/api/admin/programmes", body);
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to save programme."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Programme" : "New Programme"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Programme name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Certification / qualification type">
            <Select value={qualification} onChange={(e) => setQualification(e.target.value)}>
              <option value="">— not set —</option>
              {Object.entries(QUALIFICATION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level" hint='e.g. "Level 3"'>
            <TextInput value={level} onChange={(e) => setLevel(e.target.value)} maxLength={255} />
          </Field>
          <Field label="Duration (weeks)">
            <TextInput type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Awarding body">
            <TextInput value={awardingBody} onChange={(e) => setAwardingBody(e.target.value)} maxLength={255} />
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Programme["status"])}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Student capacity" hint="Blank = unlimited. Enforced when placing students.">
            <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </Field>
        </div>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}

function CohortForm({
  programmeId,
  edit,
  onClose,
  onSaved,
}: {
  programmeId: string;
  edit: Cohort | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [start, setStart] = useState(edit?.start_date ?? "");
  const [end, setEnd] = useState(edit?.end_date ?? "");
  const [capacity, setCapacity] = useState(edit?.capacity != null ? String(edit.capacity) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = {
      programme_id: programmeId,
      capacity: capacity ? Number(capacity) : null,
      name: name.trim(),
      start_date: start || null,
      end_date: end || null,
    };
    try {
      if (edit) await apiPatch(`/api/admin/cohorts/${edit.id}`, body);
      else await apiPost("/api/admin/cohorts", body);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save cohort."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Cohort" : "New Cohort"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label="Cohort capacity" hint="Blank = unlimited. Enforced when placing students.">
          <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </Field>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}

// ── Cohort people: educators and students ─────────────────────────────────────

function CohortPeoplePanel({
  cohort,
  institutionId,
  assignments,
  onChanged,
}: {
  cohort: Cohort;
  institutionId: string;
  assignments: Assignment[];
  onChanged: () => Promise<void>;
}) {
  const [educators, setEducators] = useState<EducatorUser[]>([]);
  const [students, setStudents] = useState<CohortStudent[] | null>(null);
  const [toAdd, setToAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [e, s] = await Promise.all([
          apiGet<{ users: EducatorUser[] }>("/api/admin/users?role=educator&status=active"),
          apiGet<{ students: CohortStudent[] }>(`/api/admin/cohorts/${cohort.id}/students`),
        ]);
        setEducators(e.users);
        setStudents(s.students);
      } catch (e) {
        setErr(apiErrorMessage(e, "Failed to load cohort people."));
      }
    })();
  }, [cohort.id]);

  const assignedIds = new Set(assignments.map((a) => a.educator_id));
  // Educators already at this institution (or not yet placed) come first.
  const options = educators
    .filter((u) => !assignedIds.has(u.id))
    .sort((a, b) => Number(b.institution_id === institutionId) - Number(a.institution_id === institutionId));

  async function add() {
    if (!toAdd) return;
    setBusy(true);
    setErr("");
    try {
      await apiPost("/api/admin/educator-assignments", { educator_id: toAdd, cohort_id: cohort.id });
      setToAdd("");
      await onChanged();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to assign educator."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setErr("");
    try {
      await apiDelete(`/api/admin/educator-assignments/${id}`);
      await onChanged();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to remove educator."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} mt-4 p-4`}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">{cohort.name}</h3>
      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <p className="mb-1.5 text-xs font-medium text-k-gray-600">Educators</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {assignments.length === 0 && <span className="text-xs text-k-gray-400">None assigned yet.</span>}
        {assignments.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">
            {a.educator?.full_name ?? "—"}
            <button type="button" disabled={busy} onClick={() => remove(a.id)} aria-label="Remove educator">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        <Select value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
          <option value="">Assign an educator…</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? "—"}
              {u.institution_id && u.institution_id !== institutionId ? " (other institution)" : ""}
            </option>
          ))}
        </Select>
        <button type="button" onClick={add} disabled={!toAdd || busy} className="rounded-full bg-k-primary px-4 text-sm text-k-white disabled:opacity-50">
          Add
        </button>
      </div>

      <p className="mb-1.5 text-xs font-medium text-k-gray-600">Students{students ? ` (${students.length})` : ""}</p>
      {!students ? (
        <p className="text-xs text-k-gray-400">Loading…</p>
      ) : students.length === 0 ? (
        <p className="text-xs text-k-gray-400">No students in this cohort. Place students from User Management.</p>
      ) : (
        <ul className="max-h-48 divide-y divide-k-gray-200 overflow-y-auto text-sm text-k-gray-600">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between py-1.5">
              <span>{s.full_name ?? "—"}</span>
              <span className="text-xs text-k-gray-400">
                {s.student_id ?? ""}
                {s.status !== "active" ? ` · ${s.status}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Subscription / allocation ─────────────────────────────────────────────────

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const over = limit != null && used >= limit;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs text-k-gray-600">
        <span>{label}</span>
        <span className={over ? "font-medium text-red-600" : ""}>{limit == null ? `${used} (unlimited)` : `${used} / ${limit}`}</span>
      </div>
      {limit != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-k-gray-200">
          <div className={`h-full ${over ? "bg-red-500" : "bg-k-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function SubscriptionPanel({ institutionId, programmeCount }: { institutionId: string; programmeCount: number }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ subscription: Subscription | null; usage: Usage }>(
        `/api/admin/institutions/${institutionId}/subscription`,
      );
      setSub(r.subscription);
      setUsage(r.usage);
      setError("");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to load allocation."));
    }
  }, [institutionId]);

  // programmeCount changes when programmes are added/removed, so usage refreshes too.
  useEffect(() => {
    load();
  }, [load, programmeCount]);

  return (
    <div className={`${cardClass} mb-4 p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-k-gray-400">Subscription &amp; usage</h3>
        <button className="text-xs font-medium text-k-primary hover:underline" onClick={() => setEditing(true)}>
          {sub ? "Edit" : "Set allocation"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {usage && (
        <>
          <p className="mb-3 text-xs text-k-gray-400">
            {sub
              ? `${sub.plan_name ?? "Plan"} · ${sub.status}${sub.period_end ? ` · ends ${sub.period_end}` : ""}`
              : "No allocation set — unlimited."}
          </p>
          <UsageBar label="Programmes" used={usage.programmes} limit={sub?.max_programmes ?? null} />
          <UsageBar label="Students" used={usage.students} limit={sub?.max_students ?? null} />
        </>
      )}
      {editing && (
        <SubscriptionForm
          institutionId={institutionId}
          current={sub}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function SubscriptionForm({
  institutionId,
  current,
  onClose,
  onSaved,
}: {
  institutionId: string;
  current: Subscription | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState(current?.plan_name ?? "");
  const [maxProg, setMaxProg] = useState(current?.max_programmes != null ? String(current.max_programmes) : "");
  const [maxStud, setMaxStud] = useState(current?.max_students != null ? String(current.max_students) : "");
  const [status, setStatus] = useState<Subscription["status"]>(current?.status ?? "active");
  const [pStart, setPStart] = useState(current?.period_start ?? "");
  const [pEnd, setPEnd] = useState(current?.period_end ?? "");
  const [notes, setNotes] = useState(current?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiPut(`/api/admin/institutions/${institutionId}/subscription`, {
        plan_name: plan.trim() || null,
        max_programmes: maxProg ? Number(maxProg) : null,
        max_students: maxStud ? Number(maxStud) : null,
        status,
        period_start: pStart || null,
        period_end: pEnd || null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to save allocation."));
      setBusy(false);
    }
  }

  return (
    <Modal open title="Subscription / allocation" onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Plan name">
          <TextInput value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={255} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max programmes" hint="Blank = unlimited">
            <TextInput type="number" min={0} value={maxProg} onChange={(e) => setMaxProg(e.target.value)} />
          </Field>
          <Field label="Max students" hint="Blank = unlimited">
            <TextInput type="number" min={0} value={maxStud} onChange={(e) => setMaxStud(e.target.value)} />
          </Field>
          <Field label="Period start">
            <TextInput type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} />
          </Field>
          <Field label="Period end">
            <TextInput type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Status" hint="Expired or cancelled blocks adding programmes and placing students.">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Subscription["status"])}>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <FormActions onCancel={onClose} busy={busy} />
      </form>
    </Modal>
  );
}
