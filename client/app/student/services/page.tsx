"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api";

type ServiceStatus = "awaiting_client" | "awaiting_educator" | "verified" | "rejected";
type FilterOption = "All" | "Verified" | "Awaiting Educator" | "Awaiting Client";

interface Service {
  id: string;
  name: string;
  category_id: string;
  status: ServiceStatus;
  created_at: string;
  client: { id: string; full_name: string | null } | null;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bgColor: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: "Verified", color: "text-emerald-600", bgColor: "bg-emerald-100", Icon: CheckCircle2 },
  awaiting_educator: { label: "Awaiting Educator", color: "text-blue-600", bgColor: "bg-blue-100", Icon: Clock },
  awaiting_client: { label: "Awaiting Client", color: "text-amber-600", bgColor: "bg-amber-100", Icon: AlertCircle },
  rejected: { label: "Rejected", color: "text-red-600", bgColor: "bg-red-100", Icon: AlertCircle },
};

const FILTER_MAP: Record<FilterOption, ServiceStatus | null> = {
  All: null,
  Verified: "verified",
  "Awaiting Educator": "awaiting_educator",
  "Awaiting Client": "awaiting_client",
};

const filters: FilterOption[] = ["All", "Verified", "Awaiting Educator", "Awaiting Client"];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiGet<{ services: Service[] }>("/api/services")
      .then((res) => setServices(res.services))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((s) => {
    const matchesFilter = FILTER_MAP[activeFilter] === null || s.status === FILTER_MAP[activeFilter];
    const matchesSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.client?.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">My Services</h1>
          <p className="mt-1 text-sm text-k-gray-400">{services.length} services logged</p>
        </div>
        <Link href="/student/services/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white no-underline transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px">
          <Plus size={16} />
          Log New Service
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
          <input type="text" placeholder="Search services or clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-k-gray-200 bg-k-white py-2.5 pl-10 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={14} className="shrink-0 text-k-gray-400" />
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeFilter === f ? "bg-k-primary text-k-white" : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">No services match your search.</p>
          </div>
        ) : (
          filtered.map((service) => {
            const cfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.rejected;
            const Icon = cfg.Icon;
            return (
              <div key={service.id}
                className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.bgColor}`}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-k-black">{service.name}</p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {service.category_id} &middot; {service.client?.full_name ?? "No client"} &middot;{" "}
                    {new Date(service.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`hidden sm:inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
                  {cfg.label}
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
