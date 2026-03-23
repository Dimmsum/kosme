"use client";

import { useState } from "react";
import { Search, Filter, CheckCircle2, Clock, ChevronRight } from "lucide-react";

type HistoryStatus = "All" | "Confirmed" | "Verified";

const allHistory = [
  {
    id: 1,
    service: "Full Colour Application",
    student: "Maya Thompson",
    date: "20 Mar 2026",
    status: "Confirmed" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 2,
    service: "Blow-dry & Style",
    student: "Priya Mehta",
    date: "18 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    service: "Scalp Treatment",
    student: "Jade Patterson",
    date: "15 Mar 2026",
    status: "Confirmed" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 4,
    service: "Cut & Finish",
    student: "Amina Rahman",
    date: "12 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 5,
    service: "Highlights (Full Head)",
    student: "Maya Thompson",
    date: "5 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 6,
    service: "Updo / Occasion Style",
    student: "Emma Wright",
    date: "28 Feb 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 7,
    service: "Root Touch-up",
    student: "Fatima Begum",
    date: "20 Feb 2026",
    status: "Confirmed" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 8,
    service: "Men's Cut",
    student: "David Lee",
    date: "15 Feb 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 9,
    service: "Deep Conditioning Treatment",
    student: "Priya Mehta",
    date: "10 Feb 2026",
    status: "Verified" as const,
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 10,
    service: "Blow-dry & Curl",
    student: "Lena Kowalski",
    date: "3 Feb 2026",
    status: "Confirmed" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
  },
];

const filters: HistoryStatus[] = ["All", "Confirmed", "Verified"];

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<HistoryStatus>("All");
  const [search, setSearch] = useState("");

  const filtered = allHistory.filter((s) => {
    const matchesFilter = activeFilter === "All" || s.status === activeFilter;
    const matchesSearch =
      search === "" ||
      s.service.toLowerCase().includes(search.toLowerCase()) ||
      s.student.toLowerCase().includes(search.toLowerCase());
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
      </div>

      {/* Search & filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
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
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">No services match your search.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  item.status === "Verified" ? "bg-blue-100" : "bg-emerald-100"
                }`}
              >
                {item.status === "Verified" ? (
                  <CheckCircle2 size={18} className="text-blue-600" />
                ) : (
                  <Clock size={18} className="text-emerald-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-k-black">{item.service}</p>
                <p className="text-xs text-k-gray-400 mt-0.5">
                  {item.student} &middot; {item.date}
                </p>
              </div>

              <span
                className={`hidden sm:inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${item.statusColor}`}
              >
                {item.status}
              </span>

              <ChevronRight size={16} className="shrink-0 text-k-gray-400 group-hover:text-k-primary transition-colors" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
