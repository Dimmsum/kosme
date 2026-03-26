"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, ClipboardCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type ConfirmationStatus = "pending" | "confirmed" | "disputed";

interface Confirmation {
  id: string;
  serviceId: string;
  service: string;
  student: string | null;
  date: string;
  description: string | null;
  notes: string | null;
  status: ConfirmationStatus;
}

interface PendingResponse {
  confirmations: Array<{
    id: string;
    name: string;
    notes: string | null;
    created_at: string;
    student: { full_name: string | null } | null;
  }>;
}

interface HistoryResponse {
  history: Array<{
    id: string;
    status: ConfirmationStatus;
    created_at: string;
    service: {
      id: string;
      name: string;
      student: { full_name: string | null } | null;
    };
  }>;
}

export default function ConfirmationsPage() {
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    Promise.all([
      apiGet<PendingResponse>("/api/confirmations/pending"),
      apiGet<HistoryResponse>("/api/confirmations/history"),
    ])
      .then(([pendingRes, historyRes]) => {
        const pendingItems: Confirmation[] = (
          pendingRes.confirmations ?? []
        ).map((item) => ({
          id: `pending-${item.id}`,
          serviceId: item.id,
          service: item.name,
          student: item.student?.full_name ?? null,
          date: item.created_at,
          description: null,
          notes: item.notes,
          status: "pending",
        }));

        const historyItems: Confirmation[] = (historyRes.history ?? [])
          .filter((item) => item.status !== "pending")
          .map((item) => ({
            id: `history-${item.id}`,
            serviceId: item.service.id,
            service: item.service.name,
            student: item.service.student?.full_name ?? null,
            date: item.created_at,
            description: null,
            notes: null,
            status: item.status,
          }));

        setConfirmations([...pendingItems, ...historyItems]);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load confirmations.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (serviceId: string) => {
    if (pendingActionIds.has(serviceId)) return;
    setPendingActionIds((prev) => new Set(prev).add(serviceId));

    try {
      await apiPost(
        `/api/confirmations/${encodeURIComponent(serviceId)}/confirm`,
      );
      setConfirmations((prev) =>
        prev.map((c) =>
          c.serviceId === serviceId ? { ...c, status: "confirmed" } : c,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm service.";
      setError(message);
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleDispute = async (serviceId: string) => {
    if (pendingActionIds.has(serviceId)) return;
    setPendingActionIds((prev) => new Set(prev).add(serviceId));

    try {
      await apiPost(
        `/api/confirmations/${encodeURIComponent(serviceId)}/dispute`,
      );
      setConfirmations((prev) =>
        prev.map((c) =>
          c.serviceId === serviceId ? { ...c, status: "disputed" } : c,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to dispute service.";
      setError(message);
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const pending = useMemo(
    () => confirmations.filter((c) => c.status === "pending"),
    [confirmations],
  );
  const resolved = useMemo(
    () => confirmations.filter((c) => c.status !== "pending"),
    [confirmations],
  );

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Pending Confirmations
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Please confirm or dispute services performed by students.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Pending items */}
      {loading ? (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <p className="text-sm text-k-gray-400">Loading confirmations...</p>
        </div>
      ) : pending.length === 0 && resolved.length > 0 ? (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-k-black">All caught up!</p>
          <p className="mt-1 text-xs text-k-gray-400">
            No pending confirmations right now.
          </p>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-4">
          {pending.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-k-black">
                    {item.service}
                  </h3>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {item.student ?? "Unknown student"} &middot;{" "}
                    {new Date(item.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Pending
                </span>
              </div>

              <div className="mb-4 rounded-xl bg-k-gray-100 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400 mb-1">
                  Service Description
                </p>
                <p className="text-sm text-k-black">
                  {item.description ?? "No description provided."}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400 mt-3 mb-1">
                  Notes
                </p>
                <p className="text-sm text-k-gray-600">
                  {item.notes ?? "No notes provided."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirm(item.serviceId)}
                  disabled={pendingActionIds.has(item.serviceId)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
                >
                  <CheckCircle2 size={16} />
                  Confirm Service
                </button>
                <button
                  onClick={() => handleDispute(item.serviceId)}
                  disabled={pendingActionIds.has(item.serviceId)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                >
                  <AlertTriangle size={16} />
                  Dispute
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved items */}
      {resolved.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-k-black mb-4">
            Recently Resolved
          </h2>
          <div className="flex flex-col gap-3">
            {resolved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      item.status === "confirmed"
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}
                  >
                    {item.status === "confirmed" ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-k-black">
                      {item.service}
                    </p>
                    <p className="text-xs text-k-gray-400 mt-0.5">
                      {item.student ?? "Unknown student"} &middot;{" "}
                      {new Date(item.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.status === "confirmed" ? "Confirmed" : "Disputed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
