"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut, apiPost, apiDelete, apiErrorMessage } from "@/lib/api";
import Modal from "@/components/admin/Modal";
import { Field, TextInput, Select } from "@/components/admin/FormControls";
import { LoadingCard, ErrorBanner } from "@/components/admin/DataStates";
import RequirementsEditor, { type ReqRow } from "@/components/admin/RequirementsEditor";

interface RequirementSet {
  effective_from: string;
  rows: ReqRow[];
}
interface CohortUse {
  id: string;
  name: string;
  start_date: string | null;
  uses_set: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

// Requirements for one programme. Each save writes a dated set; cohorts that
// began before that date keep the set they started under.
export default function ProgrammeRequirementsModal({
  programmeId,
  programmeName,
  onClose,
}: {
  programmeId: string;
  programmeName: string;
  onClose: () => void;
}) {
  const [sets, setSets] = useState<RequirementSet[]>([]);
  const [cohorts, setCohorts] = useState<CohortUse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("new");
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [templateName, setTemplateName] = useState("");

  const load = useCallback(
    async (keep?: string) => {
      try {
        const r = await apiGet<{ sets: RequirementSet[]; cohorts: CohortUse[] }>(
          `/api/admin/programme-requirements?programme_id=${programmeId}`,
        );
        setSets(r.sets);
        setCohorts(r.cohorts);
        const pick = keep ?? r.sets[0]?.effective_from ?? "new";
        setSelected(pick);
        const found = r.sets.find((s) => s.effective_from === pick);
        setRows(found ? found.rows : []);
        setEffectiveFrom(found ? found.effective_from : today());
      } catch (e) {
        setErr(apiErrorMessage(e, "Failed to load requirements."));
      } finally {
        setLoading(false);
      }
    },
    [programmeId],
  );

  useEffect(() => {
    load();
  }, [load]);

  function choose(value: string) {
    setSelected(value);
    setNotice("");
    const found = sets.find((s) => s.effective_from === value);
    setRows(found ? found.rows : []);
    setEffectiveFrom(found ? found.effective_from : today());
  }

  async function save() {
    setBusy(true);
    setErr("");
    setNotice("");
    try {
      await apiPut(`/api/admin/programme-requirements?programme_id=${programmeId}&effective_from=${effectiveFrom}`, { rows });
      await load(effectiveFrom);
      setNotice(`Saved. Applies to cohorts starting on or after ${effectiveFrom}.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to save requirements."));
    } finally {
      setBusy(false);
    }
  }

  async function removeSet() {
    if (selected === "new") return;
    setBusy(true);
    setErr("");
    try {
      await apiDelete(`/api/admin/programme-requirements?programme_id=${programmeId}&effective_from=${selected}`);
      await load();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to delete set."));
    } finally {
      setBusy(false);
    }
  }

  async function saveAsTemplate() {
    if (!templateName.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await apiPost("/api/admin/programme-templates", {
        name: templateName.trim(),
        from_programme_id: programmeId,
        effective_from: selected === "new" ? undefined : selected,
      });
      setNotice(`Template "${templateName.trim()}" created — apply it from Programme Templates.`);
      setTemplateName("");
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to create template."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Requirements — ${programmeName}`} onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      {notice && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
      {loading ? (
        <LoadingCard label="Loading…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Requirement set">
              <Select value={selected} onChange={(e) => choose(e.target.value)}>
                {sets.map((s) => (
                  <option key={s.effective_from} value={s.effective_from}>
                    From {s.effective_from}
                  </option>
                ))}
                <option value="new">+ New set (future curriculum change)</option>
              </Select>
            </Field>
            <Field label="Effective from" hint="Cohorts starting on/after this date use this set.">
              <TextInput type="date" value={effectiveFrom} disabled={selected !== "new"} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </Field>
          </div>

          {cohorts.length > 0 && (
            <p className="mb-4 text-xs font-light text-k-gray-400">
              Cohorts:{" "}
              {cohorts.map((c) => `${c.name} → ${c.uses_set ? `set from ${c.uses_set}` : "catalogue defaults"}`).join(" · ")}
            </p>
          )}

          <RequirementsEditor key={selected} rows={rows} onChange={setRows} />

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-k-gray-200 pt-4">
            <div className="flex items-end gap-2">
              <Field label="Save as reusable template">
                <TextInput value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
              </Field>
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={busy || !templateName.trim()}
                className="mb-4 rounded-full border border-k-gray-200 px-4 py-2 text-sm text-k-gray-600 disabled:opacity-50"
              >
                Save template
              </button>
            </div>
            <div className="mb-4 flex gap-2">
              {selected !== "new" && (
                <button type="button" onClick={removeSet} disabled={busy} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 disabled:opacity-50">
                  Delete set
                </button>
              )}
              <button type="button" onClick={save} disabled={busy || !effectiveFrom} className="rounded-full bg-k-primary px-5 py-2 text-sm font-medium text-k-white disabled:opacity-50">
                {busy ? "Saving…" : "Save set"}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
