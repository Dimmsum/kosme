"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { LoadingCard, ErrorBanner } from "@/components/admin/DataStates";

export interface ReqRow {
  scope: "programme" | "category" | "service";
  category_id: string | null;
  service_type_id: string | null;
  required_count: number | null;
  required_hours: number | null;
}

interface Category {
  id: string;
  label: string;
}
interface ServiceType {
  id: string;
  category_id: string;
  name: string;
  recommended_duration_min: number | null;
  recommended_duration_max: number | null;
}

const keyOf = (r: Pick<ReqRow, "scope" | "category_id" | "service_type_id">) =>
  `${r.scope}:${r.category_id ?? ""}:${r.service_type_id ?? ""}`;

const inputClass =
  "w-20 rounded-lg border border-k-gray-200 bg-k-white px-2 py-1 text-sm text-k-black outline-none focus:border-k-primary";

// Shared editor for a requirement set (a programme's dated set, or a template).
// Required Count = qualifying times a student must perform a service; Required
// Hours = minimum practical hours, only where the curriculum demands it, at
// programme, category or service level. Blank = no requirement.
export default function RequirementsEditor({ rows, onChange }: { rows: ReqRow[]; onChange: (rows: ReqRow[]) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([
          apiGet<{ categories: Category[] }>("/api/admin/service-catalog/categories"),
          apiGet<{ types: ServiceType[] }>("/api/admin/service-catalog/types"),
        ]);
        setCategories([...c.categories].sort((a, b) => a.label.localeCompare(b.label)));
        setTypes([...t.types].sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        setError("Failed to load the service catalogue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const find = (target: Pick<ReqRow, "scope" | "category_id" | "service_type_id">) =>
    rows.find((r) => keyOf(r) === keyOf(target));

  function set(
    target: Pick<ReqRow, "scope" | "category_id" | "service_type_id">,
    field: "required_count" | "required_hours",
    raw: string,
  ) {
    const value = raw.trim() === "" ? null : Math.max(0, Math.floor(Number(raw)));
    const existing = find(target);
    if (existing) {
      onChange(rows.map((r) => (r === existing ? { ...r, [field]: value } : r)));
    } else {
      onChange([...rows, { ...target, required_count: null, required_hours: null, [field]: value }]);
    }
  }

  const val = (target: Pick<ReqRow, "scope" | "category_id" | "service_type_id">, field: "required_count" | "required_hours") =>
    find(target)?.[field]?.toString() ?? "";

  if (loading) return <LoadingCard label="Loading catalogue…" />;

  const progTarget = { scope: "programme" as const, category_id: null, service_type_id: null };

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-k-gray-200 bg-k-gray-100/50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-k-black">Programme practical hours</p>
          <p className="text-xs text-k-gray-400">Minimum total verified hours, if the curriculum requires it.</p>
        </div>
        <input
          type="number"
          min={0}
          className={inputClass}
          aria-label="Programme required hours"
          value={val(progTarget, "required_hours")}
          onChange={(e) => set(progTarget, "required_hours", e.target.value)}
        />
      </div>

      {categories.map((cat) => {
        const catTarget = { scope: "category" as const, category_id: cat.id, service_type_id: null };
        const catTypes = types.filter((t) => t.category_id === cat.id);
        return (
          <div key={cat.id} className="mb-3 overflow-hidden rounded-xl border border-k-gray-200">
            <div className="flex items-center justify-between gap-3 bg-k-gray-100/50 px-4 py-2.5">
              <p className="text-sm font-medium text-k-black">{cat.label}</p>
              <div className="flex items-center gap-2 text-xs text-k-gray-400">
                <label className="flex items-center gap-1">
                  count
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={val(catTarget, "required_count")}
                    onChange={(e) => set(catTarget, "required_count", e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1">
                  hrs
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={val(catTarget, "required_hours")}
                    onChange={(e) => set(catTarget, "required_hours", e.target.value)}
                  />
                </label>
              </div>
            </div>
            {catTypes.length > 0 && (
              <div className="divide-y divide-k-gray-200">
                {catTypes.map((t) => {
                  const target = { scope: "service" as const, category_id: null, service_type_id: t.id };
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-k-black">{t.name}</p>
                        <p className="text-xs text-k-gray-400">
                          Recommended {t.recommended_duration_min ?? "—"}–{t.recommended_duration_max ?? "—"} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-k-gray-400">
                        <label className="flex items-center gap-1">
                          count
                          <input
                            type="number"
                            min={0}
                            className={inputClass}
                            value={val(target, "required_count")}
                            onChange={(e) => set(target, "required_count", e.target.value)}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          hrs
                          <input
                            type="number"
                            min={0}
                            className={inputClass}
                            value={val(target, "required_hours")}
                            onChange={(e) => set(target, "required_hours", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
