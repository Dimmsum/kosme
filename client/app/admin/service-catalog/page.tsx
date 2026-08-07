"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag, Clock, Scissors } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Category {
  id: string;
  label: string;
  max_required: number;
  created_at: string;
}
interface ServiceType {
  id: string;
  category_id: string;
  name: string;
  recommended_duration_min: number | null;
  recommended_duration_max: number | null;
  required_practical_hours: number;
  required_practical_count: number;
  created_at: string;
}

const cardClass = "rounded-2xl border border-k-gray-200 bg-k-white";
const iconBtn = "rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black";
const newBtn =
  "inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminServiceCatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [catModal, setCatModal] = useState<null | { edit: Category | null }>(null);
  const [typeModal, setTypeModal] = useState<null | { categoryId: string; edit: ServiceType | null }>(null);
  const [confirm, setConfirm] = useState<null | ServiceType>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, tys] = await Promise.all([
        apiGet<{ categories: Category[] }>("/api/admin/service-catalog/categories"),
        apiGet<{ types: ServiceType[] }>("/api/admin/service-catalog/types"),
      ]);
      setCategories(cats.categories);
      setTypes(tys.types);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load service catalog."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteType() {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiDelete(`/api/admin/service-catalog/types/${confirm.id}`);
      setConfirm(null);
      await load();
    } catch (e) {
      setError(errMsg(e, "Failed to delete service type."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Service Catalog"
        subtitle="Categories and service types with recommended durations and required practical hours."
        action={
          <button className={newBtn} onClick={() => setCatModal({ edit: null })}>
            <Plus size={16} /> New Category
          </button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading catalog…" />
      ) : categories.length === 0 ? (
        <EmptyCard label="No service categories yet." />
      ) : (
        <div className="flex flex-col gap-6">
          {categories.map((cat) => {
            const catTypes = types.filter((t) => t.category_id === cat.id);
            return (
              <div key={cat.id} className={`${cardClass} overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-k-gray-200 bg-k-gray-100/50 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Tag size={16} className="text-k-primary" />
                    <div>
                      <p className="text-sm font-medium text-k-black">{cat.label}</p>
                      <p className="text-xs text-k-gray-400">
                        Target {cat.max_required} · {catTypes.length} type{catTypes.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-3 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                      onClick={() => setTypeModal({ categoryId: cat.id, edit: null })}
                    >
                      <Plus size={13} /> Type
                    </button>
                    <button className={iconBtn} title="Edit category" onClick={() => setCatModal({ edit: cat })}>
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>

                {catTypes.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-k-gray-400">No service types in this category yet.</p>
                ) : (
                  <div className="divide-y divide-k-gray-200">
                    {catTypes.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium text-k-black">
                            <Scissors size={13} className="text-k-gray-400" /> {t.name}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-k-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {t.recommended_duration_min ?? "—"}–{t.recommended_duration_max ?? "—"} min
                            </span>
                            <span>{t.required_practical_hours} req. hours</span>
                            <span>{t.required_practical_count} req. count</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            className={iconBtn}
                            title="Edit type"
                            onClick={() => setTypeModal({ categoryId: cat.id, edit: t })}
                          >
                            <Pencil size={15} />
                          </button>
                          <button className={iconBtn} title="Delete type" onClick={() => setConfirm(t)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {catModal && (
        <CategoryForm
          edit={catModal.edit}
          onClose={() => setCatModal(null)}
          onSaved={async () => {
            setCatModal(null);
            await load();
          }}
        />
      )}
      {typeModal && (
        <TypeForm
          categoryId={typeModal.categoryId}
          edit={typeModal.edit}
          onClose={() => setTypeModal(null)}
          onSaved={async () => {
            setTypeModal(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete service type?"
        message={`This permanently deletes "${confirm?.name}".`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={deleteType}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────

function CategoryForm({ edit, onClose, onSaved }: { edit: Category | null; onClose: () => void; onSaved: () => void }) {
  const [id, setId] = useState(edit?.id ?? "");
  const [label, setLabel] = useState(edit?.label ?? "");
  const [maxRequired, setMaxRequired] = useState(String(edit?.max_required ?? 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (edit) {
        await apiPatch(`/api/admin/service-catalog/categories/${encodeURIComponent(edit.id)}`, {
          label: label.trim(),
          max_required: Number(maxRequired) || 0,
        });
      } else {
        await apiPost("/api/admin/service-catalog/categories", {
          id: id.trim(),
          label: label.trim(),
          max_required: Number(maxRequired) || 0,
        });
      }
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save category."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Category" : "New Category"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        {!edit && (
          <Field label="ID" hint="Short unique key, e.g. 'Haircuts'. Cannot be changed later.">
            <TextInput value={id} onChange={(e) => setId(e.target.value)} required maxLength={64} />
          </Field>
        )}
        <Field label="Label">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Target count" hint="Recommended number of services in this category.">
          <TextInput type="number" min={0} value={maxRequired} onChange={(e) => setMaxRequired(e.target.value)} />
        </Field>
        <FormActions onCancel={onClose} busy={busy} disabled={!label.trim() || (!edit && !id.trim())} />
      </form>
    </Modal>
  );
}

function TypeForm({
  categoryId,
  edit,
  onClose,
  onSaved,
}: {
  categoryId: string;
  edit: ServiceType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [durMin, setDurMin] = useState(edit?.recommended_duration_min?.toString() ?? "");
  const [durMax, setDurMax] = useState(edit?.recommended_duration_max?.toString() ?? "");
  const [hours, setHours] = useState(String(edit?.required_practical_hours ?? 0));
  const [count, setCount] = useState(String(edit?.required_practical_count ?? 0));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = {
      category_id: categoryId,
      name: name.trim(),
      recommended_duration_min: num(durMin),
      recommended_duration_max: num(durMax),
      required_practical_hours: Number(hours) || 0,
      required_practical_count: Number(count) || 0,
    };
    try {
      if (edit) await apiPatch(`/api/admin/service-catalog/types/${edit.id}`, body);
      else await apiPost("/api/admin/service-catalog/types", body);
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save service type."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Edit Service Type" : "New Service Type"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration min (mins)">
            <TextInput type="number" min={0} value={durMin} onChange={(e) => setDurMin(e.target.value)} />
          </Field>
          <Field label="Duration max (mins)">
            <TextInput type="number" min={0} value={durMax} onChange={(e) => setDurMax(e.target.value)} />
          </Field>
          <Field label="Required hours">
            <TextInput type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field label="Required count">
            <TextInput type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} />
          </Field>
        </div>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}
