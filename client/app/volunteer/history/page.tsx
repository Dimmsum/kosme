"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";

type HistoryStatus = "All" | "Confirmed" | "Disputed";
type ConfirmationStatus = "confirmed" | "disputed";

interface HistoryItem {
  id: string;
  service: string;
  student: string | null;
  date: string;
  status: "Confirmed" | "Disputed";
  statusColor: string;
}

const filters: HistoryStatus[] = ["All", "Confirmed", "Disputed"];

interface HistoryResponse {
  history: Array<{
    id: string;
    status: ConfirmationStatus | "pending";
    created_at: string;
    service: {
      id: string;
      name: string;
      student: { full_name: string | null } | null;
    };
  }>;
}

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<HistoryStatus>("All");
  const [search, setSearch] = useState("");
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<HistoryResponse>("/api/confirmations/history")
      .then((res) => {
        const mapped: HistoryItem[] = (res.history ?? [])
          .filter(
            (item) => item.status === "confirmed" || item.status === "disputed",
          )
          .map((item) => ({
            id: item.id,
            service: item.service.name,
            student: item.service.student?.full_name ?? null,
            date: item.created_at,
            status: item.status === "confirmed" ? "Confirmed" : "Disputed",
            statusColor:
              item.status === "confirmed"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700",
          }));
        setAllHistory(mapped);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load history.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = allHistory.filter((s) => {
    const matchesFilter = activeFilter === "All" || s.status === activeFilter;
    const matchesSearch =
      search === "" ||
      s.service.toLowerCase().includes(search.toLowerCase()) ||
      (s.student ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Service History
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {allHistory.length} services received
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Search & filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400"
          />
          <input
            type="text"
            placeholder="Search services or students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-k-gray-200 bg-k-white py-2.5 pl-10 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary"
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
                  : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* History list */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              No services match your search.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  item.status === "Disputed" ? "bg-red-100" : "bg-emerald-100"
                }`}
              >
                {item.status === "Disputed" ? (
                  <AlertTriangle size={18} className="text-red-600" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
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

              <span
                className={`hidden sm:inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${item.statusColor}`}
              >
                {item.status}
              </span>

              <ChevronRight
                size={16}
                className="shrink-0 text-k-gray-400 group-hover:text-k-primary transition-colors"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
