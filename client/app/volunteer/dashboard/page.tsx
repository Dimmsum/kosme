"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface DashboardRes {
  stats: {
    pending_confirmations: number;
    total_services_received: number;
    this_month: number;
  };
}

interface ProfileRes {
  profile: {
    full_name: string | null;
  };
}

interface PendingRes {
  confirmations: Array<{
    id: string;
    name: string;
    created_at: string;
    notes: string | null;
    student: { full_name: string | null } | null;
  }>;
}

interface HistoryRes {
  history: Array<{
    id: string;
    status: "confirmed" | "disputed" | "pending";
    created_at: string;
    service: {
      id: string;
      name: string;
      student: { full_name: string | null } | null;
    };
  }>;
}

export default function VolunteerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Volunteer");
  const [quickStats, setQuickStats] = useState([
    {
      label: "Pending Confirmations",
      value: 0,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Services Received",
      value: 0,
      color: "bg-emerald-100 text-emerald-700",
    },
    { label: "This Month", value: 0, color: "bg-blue-100 text-blue-700" },
  ]);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    Array<{
      id: string;
      service: string;
      student: string;
      date: string;
      notes: string;
    }>
  >([]);
  const [recentlyResolved, setRecentlyResolved] = useState<
    Array<{
      id: string;
      service: string;
      student: string;
      date: string;
      status: "Confirmed" | "Disputed";
    }>
  >([]);

  useEffect(() => {
    Promise.all([
      apiGet<ProfileRes>("/api/profile"),
      apiGet<DashboardRes>("/api/dashboard"),
      apiGet<PendingRes>("/api/confirmations/pending"),
      apiGet<HistoryRes>("/api/confirmations/history"),
    ])
      .then(([profileRes, dashboardRes, pendingRes, historyRes]) => {
        setName(profileRes.profile.full_name?.split(" ")[0] ?? "Volunteer");
        setQuickStats([
          {
            label: "Pending Confirmations",
            value: dashboardRes.stats.pending_confirmations ?? 0,
            color: "bg-amber-100 text-amber-700",
          },
          {
            label: "Services Received",
            value: dashboardRes.stats.total_services_received ?? 0,
            color: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "This Month",
            value: dashboardRes.stats.this_month ?? 0,
            color: "bg-blue-100 text-blue-700",
          },
        ]);

        setPendingConfirmations(
          (pendingRes.confirmations ?? []).slice(0, 3).map((item) => ({
            id: item.id,
            service: item.name,
            student: item.student?.full_name ?? "Student",
            date: new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            notes: item.notes ?? "No notes provided.",
          })),
        );

        setRecentlyResolved(
          (historyRes.history ?? [])
            .filter(
              (item) =>
                item.status === "confirmed" || item.status === "disputed",
            )
            .slice(0, 3)
            .map((item) => ({
              id: item.id,
              service: item.service.name,
              student: item.service.student?.full_name ?? "Student",
              date: new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              status: item.status === "confirmed" ? "Confirmed" : "Disputed",
            })),
        );
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Thank you for supporting our cosmetology students.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {loading && (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-10 text-center">
          <p className="text-sm text-k-gray-400">Loading dashboard...</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-k-gray-200 bg-k-white p-6"
          >
            <p className="text-xs font-medium text-k-gray-400">{stat.label}</p>
            <p className="mt-2 font-serif text-3xl text-k-black">
              {stat.value}
            </p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${stat.color}`}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Pending confirmations */}
      <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">
            Pending Confirmations
          </h2>
          <Link
            href="/volunteer/confirmations"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {pendingConfirmations.length === 0 ? (
            <div className="rounded-2xl bg-k-gray-100 px-4 py-8 text-center">
              <p className="text-sm text-k-gray-400">
                No pending confirmations.
              </p>
            </div>
          ) : (
            pendingConfirmations.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-k-gray-100 px-4 py-4 sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-k-black">
                      {item.service}
                    </p>
                    <p className="text-xs text-k-gray-400 mt-0.5">
                      {item.student} &middot; {item.date}
                    </p>
                    <p className="text-xs text-k-gray-600 mt-1">{item.notes}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Pending
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/volunteer/confirmations"
                    className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white no-underline transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
                  >
                    <CheckCircle2 size={14} />
                    Review
                  </Link>
                  <Link
                    href="/volunteer/confirmations"
                    className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-xs font-medium text-k-gray-600 no-underline transition-colors hover:bg-k-gray-100"
                  >
                    <AlertTriangle size={14} />
                    Open
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recently resolved */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <h2 className="font-serif text-lg text-k-black mb-5">
          Recently Resolved
        </h2>

        <div className="flex flex-col gap-3">
          {recentlyResolved.length === 0 ? (
            <div className="rounded-2xl bg-k-gray-100 px-4 py-8 text-center">
              <p className="text-sm text-k-gray-400">
                No resolved confirmations yet.
              </p>
            </div>
          ) : (
            recentlyResolved.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                    <Calendar size={18} className="text-k-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-k-black truncate">
                      {apt.service}
                    </p>
                    <p className="text-xs text-k-gray-400 mt-0.5">
                      {apt.student} &middot; {apt.date}
                    </p>
                  </div>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${apt.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                >
                  {apt.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
