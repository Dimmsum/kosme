"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Plus, Pencil, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

type Severity = "info" | "warning" | "critical";

interface Alert {
  id: string;
  audience_role: string | null;
  title: string;
  body: string | null;
  severity: Severity;
  active: boolean;
  created_at: string;
}

const severityColor: Record<Severity, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | { edit: Alert | null }>(null);
  const [confirm, setConfirm] = useState<Alert | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { alerts } = await apiGet<{ alerts: Alert[] }>("/api/admin/alerts");
      setAlerts(alerts);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load alerts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(a: Alert) {
    try {
      await apiPatch(`/api/admin/alerts/${a.id}`, { active: !a.active });
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to update alert."));
    }
  }

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiDelete(`/api/admin/alerts/${confirm.id}`);
      setConfirm(null);
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to delete alert."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Alerts"
        subtitle="Author notices shown to a role or the whole platform."
        action={
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light"
            onClick={() => setModal({ edit: null })}
          >
            <Plus size={16} /> New Alert
          </button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyCard label="No alerts created yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded-2xl border border-k-gray-200 bg-k-white p-5 ${a.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                    <Bell size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-k-black">{a.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${severityColor[a.severity]}`}>{a.severity}</span>
                      <span className="rounded-full bg-k-gray-100 px-2 py-0.5 text-[11px] font-medium text-k-gray-600">
                        {a.audience_role ?? "everyone"}
                      </span>
                    </div>
                    {a.body && <p className="mt-1 text-sm text-k-gray-600">{a.body}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(a)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      a.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-k-gray-100 text-k-gray-600 hover:bg-k-gray-200"
                    }`}
                  >
                    {a.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    className="rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black"
                    title="Edit"
                    onClick={() => setModal({ edit: a })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    onClick={() => setConfirm(a)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AlertForm
          edit={modal.edit}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete alert?"
        message={`This permanently deletes "${confirm?.title}".`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function AlertForm({ edit, onClose, onSaved }: { edit: Alert | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(edit?.title ?? "");
  const [body, setBody] = useState(edit?.body ?? "");
  const [severity, setSeverity] = useState<Severity>(edit?.severity ?? "info");
  const [audience, setAudience] = useState(edit?.audience_role ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const payload = {
      title: title.trim(),
      body: body.trim() || null,
      severity,
      audience_role: audience || null,
    };
    try {
      if (edit) await apiPatch(`/api/admin/alerts/${edit.id}`, payload);
      else await apiPost("/api/admin/alerts", payload);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save alert."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Alert" : "New Alert"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Body">
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Severity">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="">Everyone</option>
              <option value="student">Students</option>
              <option value="educator">Educators</option>
              <option value="client">Clients</option>
              <option value="employer">Employers</option>
            </Select>
          </Field>
        </div>
        <FormActions onCancel={onClose} busy={busy} disabled={!title.trim()} />
      </form>
    </Modal>
  );
}
