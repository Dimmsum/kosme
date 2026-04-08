"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Camera, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ServiceStatus = "awaiting_client" | "awaiting_educator" | "verified" | "rejected";

interface Service {
  id: string;
  name: string;
  category_id: string;
  status: ServiceStatus;
  created_at: string;
  client: { id: string; full_name: string | null } | null;
}

interface DashboardStats {
  total: number;
  verified: number;
  awaiting_educator: number;
  awaiting_client: number;
  by_category: Record<string, number>;
}

interface Profile {
  full_name: string | null;
  institution_id: string | null;
  institutions: { name: string } | null;
}

interface CategoryTarget {
  id: string;
  max_required: number;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  awaiting_educator: { label: "Awaiting Educator", color: "bg-blue-100 text-blue-700", Icon: Clock },
  awaiting_client: { label: "Awaiting Client", color: "bg-amber-100 text-amber-700", Icon: AlertCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", Icon: AlertCircle },
};

function ProgressRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(value / max, 1) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#E4E1DA" strokeWidth="5" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-lg text-k-black">{value}/{max}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-k-gray-600">{label}</span>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [categoryTargets, setCategoryTargets] = useState<CategoryTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, dashboardRes, servicesRes, categoriesRes] = await Promise.all([
          apiGet<{ profile: Profile }>("/api/profile"),
          apiGet<{ stats: DashboardStats }>("/api/dashboard"),
          apiGet<{ services: Service[] }>("/api/services"),
          supabase
            .from("service_categories")
            .select("id, max_required")
            .order("id")
            .then(({ data }) => data ?? []),
        ]);
        setProfile(profileRes.profile);
        setStats(dashboardRes.stats);
        setRecentServices(servicesRes.services.slice(0, 4));
        setCategoryTargets(categoriesRes);
      } catch {
        // silently keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const byCategory = stats?.by_category ?? {};
  const ringColors = ["#ee0384", "#3B0A2A", "#551840", "#9B9690"];
  const progressRings = categoryTargets
    .filter((cat) => byCategory[cat.id] !== undefined || Object.keys(byCategory).length === 0)
    .slice(0, 4)
    .map((cat, i) => ({
      label: cat.id,
      value: byCategory[cat.id] ?? 0,
      max: cat.max_required,
      color: ringColors[i % ringColors.length],
    }));

  const totalVerified = stats?.verified ?? 0;
  const totalNeeded = categoryTargets.reduce((a, b) => a + b.max_required, 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-k-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {profile?.institutions?.name ?? "Your institution"}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Link href="/student/services"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <Plus size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">New Service</span>
        </Link>
        <Link href="/student/portfolio"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Camera size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">Portfolio</span>
        </Link>
      </div>

      <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-k-black">My Progress</h2>
            <p className="text-xs text-k-gray-400 mt-0.5">Required practicals</p>
          </div>
          <span className="rounded-full bg-k-primary/10 px-3 py-1 text-xs font-medium text-k-primary">
            {totalVerified}/{totalNeeded} completed
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-around gap-4">
          {progressRings.length > 0 ? (
            progressRings.map((ring) => <ProgressRing key={ring.label} {...ring} />)
          ) : (
            <p className="text-sm text-k-gray-400 py-4">No services logged yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">Recent Services</h2>
          <Link href="/student/services"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recentServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-k-gray-100">
              <Clock size={20} className="text-k-gray-400" />
            </div>
            <p className="text-sm font-medium text-k-gray-600">No services yet</p>
            <p className="mt-1 text-xs text-k-gray-400">Log your first practical to get started.</p>
            <Link href="/student/services" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white no-underline hover:bg-k-primary-light">
              <Plus size={14} /> Log a Service
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentServices.map((service) => {
              const cfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.rejected;
              const Icon = cfg.Icon;
              return (
                <Link key={service.id} href={`/student/services/${service.id}`}
                  className="group flex gap-3.5 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-all hover:border-k-primary/20 hover:shadow-[0_2px_12px_rgba(59,10,42,0.06)]">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.color.split(" ")[0]}`}>
                    <Icon size={16} className={cfg.color.split(" ")[1]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-k-black truncate group-hover:text-k-primary transition-colors">{service.name}</p>
                    <p className="text-xs text-k-gray-400 mt-0.5 truncate">
                      {service.category_id} &middot; {new Date(service.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
