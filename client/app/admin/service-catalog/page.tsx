"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag, Clock, Scissors, ChevronDown, FolderPlus } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Category {
  id: string;
  label: string;
  max_required: number;
  group_id: string | null;
  colour: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}
interface Group {
  id: string;
  name: string;
  sort_order: number;
}

// Preset swatches for category heading colours (any #RRGGBB is also accepted).
const SWATCHES = ["#ee0384", "#db2777", "#7c3aed", "#9333ea", "#2563eb", "#0891b2", "#059669", "#65a30d", "#d97706", "#ea580c", "#dc2626", "#475569"];
const DEFAULT_COLOUR = "#9b9690";
const UNGROUPED = "__ungrouped__";
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupModal, setGroupModal] = useState<null | { edit: Group | null }>(null);
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
      const [cats, tys, grps] = await Promise.all([
        apiGet<{ categories: Category[] }>("/api/admin/service-catalog/categories"),
        apiGet<{ types: ServiceType[] }>("/api/admin/service-catalog/types"),
        apiGet<{ groups: Group[] }>("/api/admin/service-catalog/groups"),
      ]);
      setCategories(cats.categories);
      setGroups(grps.groups);
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

  const sections: { id: string; name: string; group: Group | null }[] = [
    ...groups.map((g) => ({ id: g.id, name: g.name, group: g })),
    ...(categories.some((c) => !c.group_id) ? [{ id: UNGROUPED, name: "Ungrouped", group: null }] : []),
  ];

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Service Catalog"
        subtitle="Categories, grouped into sections, and the service types in each with their recommended durations."
        action={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
              onClick={() => setGroupModal({ edit: null })}
            >
              <FolderPlus size={16} /> New Section
            </button>
            <button className={newBtn} onClick={() => setCatModal({ edit: null })}>
              <Plus size={16} /> New Category
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading catalog…" />
      ) : categories.length === 0 ? (
        <EmptyCard label="No service categories yet." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end gap-3 text-xs font-medium text-k-primary">
            <button onClick={() => setExpanded(new Set(sections.map((sec) => sec.id)))}>Expand all</button>
            <button onClick={() => setExpanded(new Set())}>Collapse all</button>
          </div>
          {sections.map((sec) => {
            const open = expanded.has(sec.id);
            const secCats = categories.filter((c) => (c.group_id ?? UNGROUPED) === sec.id);
            return (
              <section key={sec.id} className={`${cardClass} overflow-hidden`}>
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={open}
                    onClick={() =>
                      setExpanded((cur) => {
                        const n = new Set(cur);
                        if (n.has(sec.id)) n.delete(sec.id);
                        else n.add(sec.id);
                        return n;
                      })
                    }
                  >
                    <ChevronDown size={18} className={`shrink-0 text-k-gray-400 transition-transform ${open ? "" : "-rotate-90"}`} />
                    <span className="font-serif text-lg font-light text-k-black">{sec.name}</span>
                    <span className="text-xs text-k-gray-400">
                      {secCats.length} categor{secCats.length === 1 ? "y" : "ies"}
                    </span>
                    <span className="flex gap-1">
                      {secCats.map((c) => (
                        <span key={c.id} className="h-2.5 w-2.5 rounded-full" style={{ background: c.colour ?? DEFAULT_COLOUR }} />
                      ))}
                    </span>
                  </button>
                  {sec.group && (
                    <button className={iconBtn} title="Rename section" onClick={() => setGroupModal({ edit: sec.group })}>
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                {open && (
                  <div className="flex flex-col gap-4 border-t border-k-gray-200 bg-k-gray-100/30 p-4">
                    {secCats.length === 0 && <p className="py-4 text-center text-xs text-k-gray-400">No categories in this section yet.</p>}
                    {secCats.map((cat) => {
            const catTypes = types.filter((t) => t.category_id === cat.id);
                    return (
                      <div key={cat.id} className={`${cardClass} overflow-hidden`}>
                        <div className="flex items-center justify-between border-b border-k-gray-200 bg-k-gray-100/50 px-5 py-3" style={{ borderLeft: `4px solid ${cat.colour ?? DEFAULT_COLOUR}` }}>
                          <div className="flex items-center gap-3">
                            <Tag size={16} style={{ color: cat.colour ?? DEFAULT_COLOUR }} />
                            <div>
                              <p className="text-sm font-medium text-k-black">{cat.label}</p>
                              <p className="text-xs text-k-gray-400">
                                {catTypes.length} type{catTypes.length === 1 ? "" : "s"}
                                {cat.description ? ` · ${cat.description}` : ""}
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
              </section>
            );
          })}
        </div>
      )}

      {groupModal && (
        <GroupForm
          edit={groupModal.edit}
          onClose={() => setGroupModal(null)}
          onSaved={async () => {
            setGroupModal(null);
            await load();
          }}
        />
      )}
      {catModal && (
        <CategoryForm
          edit={catModal.edit}
          groups={groups}
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

function CategoryForm({
  edit,
  groups,
  onClose,
  onSaved,
}: {
  edit: Category | null;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(edit?.label ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [groupId, setGroupId] = useState(edit?.group_id ?? groups[0]?.id ?? "");
  const [colour, setColour] = useState(edit?.colour ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = {
      label: label.trim(),
      description: description.trim() || null,
      group_id: groupId || null,
      colour: colour || null,
    };
    try {
      if (edit) {
        await apiPatch(`/api/admin/service-catalog/categories/${encodeURIComponent(edit.id)}`, body);
      } else {
        // The internal key is generated server-side from the name; required
        // counts live under Programme Requirements, so the legacy target is 0.
        await apiPost("/api/admin/service-catalog/categories", { ...body, max_required: 0 });
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
        <Field label="Category name" hint="The heading students, clients and admins see.">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={255} />
        </Field>
        <Field label="Description" hint="Optional. Shown under the category heading in the catalogue.">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </Field>
        <Field label="Section">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Ungrouped —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="mb-4">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-k-gray-400">Heading colour</span>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={colour === c}
                onClick={() => setColour(c)}
                className={`h-7 w-7 rounded-full border-2 ${colour === c ? "border-k-black" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom colour"
              value={colour || DEFAULT_COLOUR}
              onChange={(e) => setColour(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-k-gray-200 bg-transparent p-0"
            />
            {colour && (
              <button type="button" className="text-xs text-k-gray-400 underline" onClick={() => setColour("")}>
                Clear
              </button>
            )}
          </div>
        </div>
        {edit && (
          <p className="mb-4 text-xs font-light text-k-gray-400">
            Internal key: <code>{edit.id}</code>. Bookings, services and client profiles store this key, so it is set once from the
            name and never changes — renaming the category above is safe. You never need to enter it.
          </p>
        )}
        <FormActions onCancel={onClose} busy={busy} disabled={!label.trim()} />
      </form>
    </Modal>
  );
}

function GroupForm({ edit, onClose, onSaved }: { edit: Group | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(edit?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (edit) await apiPatch(`/api/admin/service-catalog/groups/${encodeURIComponent(edit.id)}`, { name: name.trim() });
      else await apiPost("/api/admin/service-catalog/groups", { name: name.trim(), sort_order: 100 });
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to save section."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={edit ? "Rename Section" : "New Section"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Section name" hint="e.g. Hair, Skin, Nails">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        </Field>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
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
        </div>
        <p className="mb-4 text-xs font-light text-k-gray-400">
          Recommended duration is the normal expected time. Required counts and hours are set per programme under
          Institutions &amp; Cohorts → Programme requirements.
        </p>
        <FormActions onCancel={onClose} busy={busy} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}
