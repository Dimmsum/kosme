"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Plus, Check, X } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import { Field, TextInput, TextArea, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface FlagItem {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  creator: { id: string; full_name: string | null } | null;
  resolver: { id: string; full_name: string | null } | null;
}

const statusColor: Record<FlagItem["status"], string> = {
  open: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-k-gray-200 text-k-gray-600",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [showNew, setShowNew] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const { flags } = await apiGet<{ flags: FlagItem[] }>(`/api/admin/flags${qs}`);
      setFlags(flags);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load flags."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "resolved" | "dismissed") {
    setActingId(id);
    try {
      await apiPatch(`/api/admin/flags/${id}`, { status });
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to update flag."));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Flagged Issues"
        subtitle="Issues raised against services, accounts, or other entities for admin review."
        action={
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} /> Raise Flag
          </button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { v: "open", l: "Open" },
          { v: "resolved", l: "Resolved" },
          { v: "dismissed", l: "Dismissed" },
          { v: "", l: "All" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setStatusFilter(f.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.v ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingCard label="Loading flags…" />
      ) : flags.length === 0 ? (
        <EmptyCard label="No flags in this view." />
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map((f) => (
            <div key={f.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Flag size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-k-black">
                      {f.entity_type} <span className="font-normal text-k-gray-400">· {f.entity_id}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-k-gray-600">{f.reason}</p>
                    <p className="mt-1 text-xs text-k-gray-400">
                      Raised by {f.creator?.full_name ?? "Unknown"} ·{" "}
                      {new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {f.resolver && ` · handled by ${f.resolver.full_name ?? "admin"}`}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[f.status]}`}>{f.status}</span>
              </div>

              {f.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setStatus(f.id, "resolved")}
                    disabled={actingId === f.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-k-white transition-colors hover:bg-k-primary-light disabled:opacity-50"
                  >
                    <Check size={13} /> Resolve
                  </button>
                  <button
                    onClick={() => setStatus(f.id, "dismissed")}
                    disabled={actingId === f.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-4 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100 disabled:opacity-50"
                  >
                    <X size={13} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewFlagForm
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewFlagForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiPost("/api/admin/flags", {
        entity_type: entityType.trim(),
        entity_id: entityId.trim(),
        reason: reason.trim(),
      });
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to raise flag."));
      setBusy(false);
    }
  }

  return (
    <Modal open title="Raise a Flag" onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Entity type" hint="e.g. service, user, institution">
          <TextInput value={entityType} onChange={(e) => setEntityType(e.target.value)} required />
        </Field>
        <Field label="Entity ID" hint="The id of the flagged record.">
          <TextInput value={entityId} onChange={(e) => setEntityId(e.target.value)} required />
        </Field>
        <Field label="Reason">
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Field>
        <FormActions onCancel={onClose} busy={busy} submitLabel="Raise flag" disabled={!entityType.trim() || !entityId.trim() || !reason.trim()} />
      </form>
    </Modal>
  );
}
