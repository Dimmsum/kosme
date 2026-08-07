"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings as SettingsIcon, Sparkles, Plus, Pencil } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import { Field, TextInput, TextArea, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | { edit: Setting | null }>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings } = await apiGet<{ settings: Setting[] }>("/api/admin/settings");
      setSettings(settings);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kai = settings.find((s) => s.key === "kai_enabled");
  const kaiOn = kai?.value === true;
  const others = settings.filter((s) => s.key !== "kai_enabled");

  async function saveSetting(key: string, value: unknown) {
    await putSetting(key, value);
    await load();
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Settings"
        subtitle="Platform-wide configuration and feature flags."
        action={
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light"
            onClick={() => setModal({ edit: null })}
          >
            <Plus size={16} /> New Setting
          </button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading settings…" />
      ) : (
        <div className="flex flex-col gap-6">
          {/* KAI feature flag — highlighted card (roadmap Phase 7) */}
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-k-black">KAI (Kosmè Assistive Intelligence)</p>
                  <p className="mt-0.5 text-sm font-light text-k-gray-600">
                    Master switch for assistive AI surfaces across the platform. Assistive only — KAI never verifies or
                    approves work.
                  </p>
                </div>
              </div>
              <button
                onClick={() => saveSetting("kai_enabled", !kaiOn).catch((e) => setError(errMsg(e, "Failed to save.")))}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  kaiOn ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-k-gray-100 text-k-gray-600 hover:bg-k-gray-200"
                }`}
              >
                {kaiOn ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          {/* Other settings */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">Configuration</h2>
            {others.length === 0 ? (
              <EmptyCard label="No other settings defined." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white divide-y divide-k-gray-200">
                {others.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-k-black">
                        <SettingsIcon size={14} className="text-k-gray-400" /> {s.key}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-k-gray-400">{JSON.stringify(s.value)}</p>
                    </div>
                    <button
                      className="rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black"
                      title="Edit"
                      onClick={() => setModal({ edit: s })}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <SettingForm
          edit={modal.edit}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// app_settings is upserted via PUT /api/admin/settings/:key.
async function putSetting(key: string, value: unknown): Promise<void> {
  await apiPut(`/api/admin/settings/${encodeURIComponent(key)}`, { value });
}

function SettingForm({ edit, onClose, onSaved }: { edit: Setting | null; onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState(edit?.key ?? "");
  const [valueText, setValueText] = useState(JSON.stringify(edit?.value ?? "", null, 2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(valueText);
    } catch {
      setErr("Value must be valid JSON (e.g. true, 42, \"text\", or {\"a\":1}).");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await putSetting(key.trim(), parsed);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save setting."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? `Edit "${edit.key}"` : "New Setting"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Key">
          <TextInput value={key} onChange={(e) => setKey(e.target.value)} required disabled={!!edit} maxLength={128} />
        </Field>
        <Field label="Value (JSON)" hint='e.g. true, 30, "text", or {"limit": 5}'>
          <TextArea value={valueText} onChange={(e) => setValueText(e.target.value)} className="font-mono" />
        </Field>
        <FormActions onCancel={onClose} busy={busy} disabled={!key.trim()} />
      </form>
    </Modal>
  );
}
