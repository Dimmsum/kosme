"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, CheckCircle2, XCircle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type VerifyStatus = "All" | "Awaiting Review" | "Verified";

interface VerificationItem {
  id: string;
  serviceId: string;
  service: string;
  category: string;
  student: string | null;
  client: string | null;
  dateSubmitted: string;
  status: "Awaiting Review" | "Verified" | "Rejected";
  statusColor: string;
  notes: string | null;
}

const filters: VerifyStatus[] = ["All", "Awaiting Review", "Verified"];

function statusColor(status: VerificationItem["status"]): string {
  if (status === "Verified") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

interface PendingResponse {
  pending: Array<{
    id: string;
    name: string;
    category_id: string;
    notes: string | null;
    created_at: string;
    student: { full_name: string | null } | null;
    client: { full_name: string | null } | null;
  }>;
}

interface HistoryResponse {
  history: Array<{
    status: "verified" | "rejected";
    service: {
      id: string;
      name: string;
      category_id: string;
      created_at: string;
      student: { full_name: string | null } | null;
    };
  }>;
}

export default function VerifyPage() {
  const [activeFilter, setActiveFilter] = useState<VerifyStatus>("All");
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    Promise.all([
      apiGet<PendingResponse>("/api/verifications/pending"),
      apiGet<HistoryResponse>("/api/verifications/history"),
    ])
      .then(([pendingRes, historyRes]) => {
        const pendingItems: VerificationItem[] = (pendingRes.pending ?? []).map(
          (item) => ({
            id: `pending-${item.id}`,
            serviceId: item.id,
            service: item.name,
            category: item.category_id,
            student: item.student?.full_name ?? null,
            client: item.client?.full_name ?? null,
            dateSubmitted: item.created_at,
            status: "Awaiting Review",
            statusColor: statusColor("Awaiting Review"),
            notes: item.notes,
          }),
        );

        const historyItems: VerificationItem[] = (historyRes.history ?? []).map(
          (item) => {
            const label = item.status === "verified" ? "Verified" : "Rejected";
            return {
              id: `history-${item.service.id}`,
              serviceId: item.service.id,
              service: item.service.name,
              category: item.service.category_id,
              student: item.service.student?.full_name ?? null,
              client: null,
              dateSubmitted: item.service.created_at,
              status: label,
              statusColor: statusColor(label),
              notes: null,
            };
          },
        );

        setItems([...pendingItems, ...historyItems]);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load verifications.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "Awaiting Review").length,
    [items],
  );

  const filtered = items.filter((item) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Verified") return item.status === "Verified";
    return item.status === "Awaiting Review";
  });

  async function handleVerify(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;
    setPendingActionIds((prev) => new Set(prev).add(serviceId));

    try {
      await apiPost(
        `/api/verifications/${encodeURIComponent(serviceId)}/verify`,
      );
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId
            ? {
                ...item,
                status: "Verified",
                statusColor: statusColor("Verified"),
              }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to verify service.";
      setError(message);
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  async function handleReject(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;
    setPendingActionIds((prev) => new Set(prev).add(serviceId));

    try {
      await apiPost(
        `/api/verifications/${encodeURIComponent(serviceId)}/reject`,
      );
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId
            ? {
                ...item,
                status: "Rejected",
                statusColor: statusColor("Rejected"),
              }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject service.";
      setError(message);
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            Pending Verifications
          </h1>
          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
            {pendingCount}
          </span>
        </div>
        <p className="mt-1 text-sm text-k-gray-400">
          Review and verify student service submissions.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        <Filter size={14} className="shrink-0 text-k-gray-400" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f
                ? "bg-k-primary text-k-white"
                : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Verification items */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              Loading verification queue...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              No items match this filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-5 sm:p-6"
            >
              {/* Top row: service info and status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-k-black">
                    {item.service}
                  </p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {item.category} &middot; Submitted{" "}
                    {new Date(item.dateSubmitted).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${item.statusColor}`}
                >
                  {item.status}
                </span>
              </div>

              {/* Student and client info */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-k-primary/10">
                    <span className="text-[10px] font-semibold text-k-primary">
                      {(item.student ?? "Student")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                      Student
                    </p>
                    <p className="text-xs text-k-black">
                      {item.student ?? "Unknown student"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-k-gray-100">
                    <span className="text-[10px] font-semibold text-k-gray-600">
                      {(item.client ?? "Client")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                      Client
                    </p>
                    <p className="text-xs text-k-black">
                      {item.client ?? "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-gray-100 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Notes
                </p>
                <p className="mt-1 text-sm text-k-gray-600">
                  {item.notes ?? "No notes provided."}
                </p>
              </div>

              {/* Action buttons */}
              {item.status === "Awaiting Review" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVerify(item.serviceId)}
                    disabled={pendingActionIds.has(item.serviceId)}
                    className="inline-flex items-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
                  >
                    <CheckCircle2 size={16} />
                    Verify
                  </button>
                  <button
                    onClick={() => handleReject(item.serviceId)}
                    disabled={pendingActionIds.has(item.serviceId)}
                    className="inline-flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}

              {item.status === "Verified" && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}

              {item.status === "Rejected" && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
