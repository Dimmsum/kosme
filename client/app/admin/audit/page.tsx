"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { id: string; full_name: string | null } | null;
}

const actionColor: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  suspend: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-k-gray-200 text-k-gray-600",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set("entity_type", entityType);
      if (action) params.set("action", action);
      const qs = params.toString();
      const { entries } = await apiGet<{ entries: AuditEntry[] }>(`/api/admin/audit${qs ? `?${qs}` : ""}`);
      setEntries(entries);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load audit log."));
    } finally {
      setLoading(false);
    }
  }, [entityType, action]);

  useEffect(() => {
    load();
  }, [load]);

  // Filter option lists are derived from what's present so filters stay relevant.
  const entityTypes = Array.from(new Set(entries.map((e) => e.entity_type))).sort();
  const actions = Array.from(new Set(entries.map((e) => e.action))).sort();

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title="Audit Trail" subtitle="Every administrative action taken on the platform, most recent first." />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none"
        >
          <option value="">All entities</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingCard label="Loading audit log…" />
      ) : entries.length === 0 ? (
        <EmptyCard label="No audit entries recorded yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          <div className="divide-y divide-k-gray-200">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-k-gray-100 text-k-gray-400">
                  <History size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${actionColor[e.action] ?? "bg-k-gray-100 text-k-gray-600"}`}>
                      {e.action}
                    </span>
                    <span className="text-sm font-medium text-k-black">{e.entity_type}</span>
                    {e.entity_id && <span className="truncate text-xs text-k-gray-400">{e.entity_id}</span>}
                  </div>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="mt-1 truncate text-xs text-k-gray-400">{JSON.stringify(e.metadata)}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-k-gray-600">{e.actor?.full_name ?? "System"}</p>
                  <p className="text-[11px] text-k-gray-400">
                    {new Date(e.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
