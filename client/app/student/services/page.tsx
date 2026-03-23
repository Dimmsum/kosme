"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";

type ServiceStatus = "All" | "Verified" | "Awaiting Educator" | "Awaiting Client";

const allServices = [
  {
    id: 1,
    name: "Full Colour Application",
    category: "Colour",
    client: "Sarah J.",
    date: "18 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  {
    id: 2,
    name: "Blow-dry & Style",
    category: "Styling",
    client: "Priya M.",
    date: "15 Mar 2026",
    status: "Awaiting Educator" as const,
    statusColor: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  {
    id: 3,
    name: "Scalp Treatment",
    category: "Scalp",
    client: "Lena K.",
    date: "12 Mar 2026",
    status: "Awaiting Client" as const,
    statusColor: "bg-amber-100 text-amber-700",
    icon: AlertCircle,
  },
  {
    id: 4,
    name: "Cut & Finish",
    category: "Haircuts",
    client: "Amina R.",
    date: "10 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  {
    id: 5,
    name: "Highlights (Full Head)",
    category: "Colour",
    client: "Jade P.",
    date: "7 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  {
    id: 6,
    name: "Men's Cut",
    category: "Haircuts",
    client: "David L.",
    date: "5 Mar 2026",
    status: "Awaiting Educator" as const,
    statusColor: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  {
    id: 7,
    name: "Updo / Occasion Style",
    category: "Styling",
    client: "Emma W.",
    date: "2 Mar 2026",
    status: "Verified" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  {
    id: 8,
    name: "Root Touch-up",
    category: "Colour",
    client: "Fatima B.",
    date: "28 Feb 2026",
    status: "Verified" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
];

const filters: ServiceStatus[] = ["All", "Verified", "Awaiting Educator", "Awaiting Client"];

export default function ServicesPage() {
  const [activeFilter, setActiveFilter] = useState<ServiceStatus>("All");
  const [search, setSearch] = useState("");

  const filtered = allServices.filter((s) => {
    const matchesFilter = activeFilter === "All" || s.status === activeFilter;
    const matchesSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.client.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            My Services
          </h1>
          <p className="mt-1 text-sm text-k-gray-400">
            {allServices.length} services logged
          </p>
        </div>
        <Link
          href="/student/services/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white no-underline transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
        >
          <Plus size={16} />
          Log New Service
        </Link>
      </div>

      {/* Search & filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
          <input
            type="text"
            placeholder="Search services or clients..."
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

      {/* Services list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">No services match your search.</p>
          </div>
        ) : (
          filtered.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    service.status === "Verified"
                      ? "bg-emerald-100"
                      : service.status === "Awaiting Educator"
                      ? "bg-blue-100"
                      : "bg-amber-100"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      service.status === "Verified"
                        ? "text-emerald-600"
                        : service.status === "Awaiting Educator"
                        ? "text-blue-600"
                        : "text-amber-600"
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-k-black">{service.name}</p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {service.category} &middot; {service.client} &middot; {service.date}
                  </p>
                </div>

                <span
                  className={`hidden sm:inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${service.statusColor}`}
                >
                  {service.status}
                </span>

                <ChevronRight size={16} className="shrink-0 text-k-gray-400 group-hover:text-k-primary transition-colors" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
