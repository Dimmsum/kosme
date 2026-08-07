"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, ChevronRight, Power } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, TextArea, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

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
  created_at: string;
}
interface Cohort {
  id: string;
  programme_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
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

  // Modal state: which entity form is open, and the row being edited (null = create).
  const [modal, setModal] = useState<null | { kind: "inst" | "prog" | "coh"; edit: Institution | Programme | Cohort | null }>(null);
  const [confirm, setConfirm] = useState<null | { kind: "inst" | "prog" | "coh"; row: Institution | Programme | Cohort }>(null);
  const [busy, setBusy] = useState(false);

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

  const loadCohorts = useCallback(async (prog: Programme) => {
    setSelProg(prog);
    setCohLoading(true);
    try {
      const { cohorts } = await apiGet<{ cohorts: Cohort[] }>(`/api/admin/cohorts?programme_id=${prog.id}`);
      setCohorts(cohorts);
    } catch (e) {
      setError(errMsg(e, "Failed to load cohorts."));
    } finally {
      setCohLoading(false);
    }
  }, []);

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
                      <span className="block truncate text-sm font-medium text-k-black">{prog.name}</span>
                      <span className="block text-xs text-k-gray-400">
                        {prog.required_services_count} required service{prog.required_services_count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-k-gray-400" />
                  </button>
                  <div className="flex items-center gap-0.5 pr-2">
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
                <div key={coh.id} className="flex items-center">
                  <div className="flex-1 px-4 py-3">
                    <p className="text-sm font-medium text-k-black">{coh.name}</p>
                    <p className="text-xs text-k-gray-400">
                      {coh.start_date ?? "—"} → {coh.end_date ?? "—"}
                    </p>
                  </div>
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
  const [required, setRequired] = useState(String(edit?.required_services_count ?? 0));
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
      required_services_count: Number(required) || 0,
    };
    try {
      if (edit) await apiPatch(`/api/admin/programmes/${edit.id}`, body);
      else await apiPost("/api/admin/programmes", body);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save programme."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Programme" : "New Programme"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Required services count" hint="Number of verified services a student must complete.">
          <TextInput type="number" min={0} value={required} onChange={(e) => setRequired(e.target.value)} />
        </Field>
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = {
      programme_id: programmeId,
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
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}
