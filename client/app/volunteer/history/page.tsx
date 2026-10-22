"use client";

import { useEffect, useState } from "react";
import { Search, Filter, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { issueReasonLabel, serviceStage } from "@/lib/appointments";

type ConfirmationStatus = "pending" | "confirmed" | "disputed";
type HistoryFilter = "All" | "In progress" | "Verified";

const filters: HistoryFilter[] = ["All", "In progress", "Verified"];

interface HistoryResponse {
  history: Array<{
    id: string;
    status: ConfirmationStatus;
    created_at: string;
    issue_reason: string | null;
    service: {
      id: string;
      name: string;
      status: string;
      student: { full_name: string | null } | null;
    };
  }>;
}

// The steps after the client's confirmation, in order. `reached` is how many
// the service has got through (the confirmation itself is always the first).
const STEPS = ["Confirmed", "Student submits", "Educator review", "Verified"];

function stepsReached(serviceStatus: string): number {
  switch (serviceStatus) {
    case "verified":
      return 4;
    case "awaiting_educator":
    case "corrections_requested":
      return 3;
    case "rejected":
      return 2;
    default:
      return 1;
  }
}

function Tracker({ reached, stalled }: { reached: number; stalled: boolean }) {
  return (
    <ol className="mt-3 flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < reached;
        const current = i === reached - 1 && reached < STEPS.length;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={`h-1.5 rounded-full ${
                done ? (current && stalled ? "bg-amber-400" : "bg-emerald-500") : "bg-k-gray-200"
              }`}
            />
            <span className={`truncate text-[10px] ${done ? "text-k-gray-600" : "text-k-gray-400"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("All");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<HistoryResponse["history"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<HistoryResponse>("/api/confirmations/history")
      .then((res) => {
        // History is finished business. A reported issue on a service still
        // awaiting confirmation stays on the Confirm Service page until it's
        // resolved; pending rows never belong here.
        setItems(
          (res.history ?? []).filter(
            (item) =>
              item.status === "confirmed" ||
              (item.status === "disputed" && item.service.status !== "awaiting_client"),
          ),
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const verified = item.service.status === "verified";
    if (activeFilter === "Verified" && !verified) return false;
    if (activeFilter === "In progress" && verified) return false;
    const needle = search.toLowerCase();
    return (
      needle === "" ||
      item.service.name.toLowerCase().includes(needle) ||
      (item.service.student?.full_name ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Service History</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {items.length} {items.length === 1 ? "service" : "services"} received. Follow each one as it&apos;s verified.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
          <input
            type="text"
            placeholder="Search services or students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-k-gray-200 bg-k-white py-2.5 pl-10 pr-4 text-sm text-k-black outline-none transition-colors placeholder:text-k-gray-400 focus:border-k-primary"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={14} className="shrink-0 text-k-gray-400" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-k-primary text-k-white"
                  : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              {items.length === 0 ? "Services you confirm will move here." : "No services match your search."}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const stage = serviceStage(item.status, item.service.status);
            const issue = item.status === "disputed";
            return (
              <div key={item.id} className="rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      issue ? "bg-amber-100" : "bg-emerald-100"
                    }`}
                  >
                    {issue ? (
                      <AlertTriangle size={18} className="text-amber-600" />
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-k-black">{item.service.name}</p>
                    <p className="mt-0.5 text-xs text-k-gray-400">
                      {item.service.student?.full_name ?? "Unknown student"} &middot;{" "}
                      {new Date(item.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${stage.className}`}>
                    {stage.label}
                  </span>
                </div>

                {issue ? (
                  <p className="mt-3 text-xs text-k-gray-600">
                    {issueReasonLabel(item.issue_reason) ? `You reported: ${issueReasonLabel(item.issue_reason)}. ` : ""}
                    {stage.detail}
                  </p>
                ) : (
                  <>
                    <Tracker
                      reached={stepsReached(item.service.status)}
                      stalled={item.service.status === "corrections_requested"}
                    />
                    <p className="mt-2 text-xs text-k-gray-600">{stage.detail}</p>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
