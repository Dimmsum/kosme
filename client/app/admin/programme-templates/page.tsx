"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, apiErrorMessage } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, TextArea, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import RequirementsEditor, { type ReqRow } from "@/components/admin/RequirementsEditor";

interface Template {
  id: string;
  name: string;
  description: string | null;
  requirement_count: number;
  programme_count: number;
}
interface Institution {
  id: string;
  name: string;
}
interface Programme {
  id: string;
  institution_id: string;
  name: string;
  template_id?: string | null;
}

const iconBtn = "rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black";
const newBtn =
  "inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light";
const today = () => new Date().toISOString().slice(0, 10);

export default function ProgrammeTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [applying, setApplying] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ templates: Template[] }>("/api/admin/programme-templates");
      setTemplates(r.templates);
      setError("");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to load templates."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiDelete(`/api/admin/programme-templates/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to delete template."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Programme Templates"
        subtitle="Reusable requirement sets. Apply one to several institutions' programmes, then vary any programme individually."
        action={
          <button className={newBtn} onClick={() => setEditing("new")}>
            <Plus size={16} /> New Template
          </button>
        }
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingCard label="Loading templates…" />
      ) : templates.length === 0 ? (
        <EmptyCard label="No templates yet. Create one here, or save a programme's requirements as a template." />
      ) : (
        <div className="divide-y divide-k-gray-200 overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-k-black">{t.name}</p>
                <p className="text-xs text-k-gray-400">
                  {t.requirement_count} requirement{t.requirement_count === 1 ? "" : "s"} · used by {t.programme_count} programme
                  {t.programme_count === 1 ? "" : "s"}
                  {t.description ? ` · ${t.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button className={iconBtn} title="Apply to programmes" onClick={() => setApplying(t)}>
                  <Send size={15} />
                </button>
                <button className={iconBtn} title="Edit" onClick={() => setEditing(t)}>
                  <Pencil size={15} />
                </button>
                <button className={iconBtn} title="Delete" onClick={() => setDeleting(t)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateForm
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {applying && (
        <ApplyForm
          template={applying}
          onClose={() => setApplying(null)}
          onApplied={async () => {
            setApplying(null);
            await load();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete template?"
        message="Programmes that already received this template keep their requirements; only the shared template is removed."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function TemplateForm({ template, onClose, onSaved }: { template: Template | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [ready, setReady] = useState(!template);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!template) return;
    apiGet<{ rows: ReqRow[] }>(`/api/admin/programme-templates/${template.id}`)
      .then((r) => {
        setRows(r.rows);
        setReady(true);
      })
      .catch((e) => setErr(apiErrorMessage(e, "Failed to load template.")));
  }, [template]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = { name: name.trim(), description: description.trim() || null, rows };
    try {
      if (template) await apiPatch(`/api/admin/programme-templates/${template.id}`, body);
      else await apiPost("/api/admin/programme-templates", body);
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to save template."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={template ? "Edit Template" : "New Template"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {template && template.programme_count > 0 && (
          <p className="mb-3 text-xs font-light text-k-gray-400">
            Editing a template does not change programmes that already received it — re-apply it with a new effective date.
          </p>
        )}
        {ready && <RequirementsEditor rows={rows} onChange={setRows} />}
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim() || !ready} />
      </form>
    </Modal>
  );
}

function ApplyForm({ template, onClose, onApplied }: { template: Template; onClose: () => void; onApplied: () => void }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [i, p, t] = await Promise.all([
          apiGet<{ institutions: Institution[] }>("/api/admin/institutions"),
          apiGet<{ programmes: Programme[] }>("/api/admin/programmes"),
          apiGet<{ programmes: { id: string }[] }>(`/api/admin/programme-templates/${template.id}`),
        ]);
        setInstitutions(i.institutions);
        setProgrammes(p.programmes);
        setLinked(t.programmes.map((x) => x.id));
      } catch (e) {
        setErr(apiErrorMessage(e, "Failed to load programmes."));
      }
    })();
  }, [template.id]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiPost(`/api/admin/programme-templates/${template.id}/apply`, {
        effective_from: effectiveFrom,
        programme_ids: Array.from(picked),
      });
      onApplied();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to apply template."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Apply "${template.name}"`} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Effective from" hint="Cohorts that started before this date keep their current requirements.">
          <TextInput type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        </Field>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-k-gray-400">Programmes</span>
          <button type="button" className="text-xs font-medium text-k-primary hover:underline" onClick={() => setPicked(new Set(linked))} disabled={linked.length === 0}>
            Select all using this template ({linked.length})
          </button>
        </div>
        <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-k-gray-200 p-3">
          {institutions.map((inst) => {
            const progs = programmes.filter((p) => p.institution_id === inst.id);
            if (progs.length === 0) return null;
            return (
              <div key={inst.id} className="mb-3 last:mb-0">
                <p className="mb-1 text-xs font-medium text-k-gray-600">{inst.name}</p>
                {progs.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-0.5 pl-3 text-sm text-k-gray-600">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                    {p.name}
                    {linked.includes(p.id) && <span className="text-[10px] text-k-gray-400">(uses template)</span>}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        <FormActions onCancel={onClose} busy={busy} disabled={picked.size === 0} submitLabel={`Apply to ${picked.size} programme${picked.size === 1 ? "" : "s"}`} />
      </form>
    </Modal>
  );
}
