"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface ProfileRes {
  profile: {
    full_name: string | null;
    institutions: { name: string } | null;
  };
}

interface DashboardRes {
  stats: {
    pending_verifications: number;
    total_verified: number;
    verified_this_week: number;
  };
}

interface StudentsRes {
  students: Array<{ id: string }>;
}

interface PendingRes {
  pending: Array<{
    id: string;
    name: string;
    created_at: string;
    student: { full_name: string | null } | null;
  }>;
}

export default function EducatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Educator");
  const [institution, setInstitution] = useState("Your institution");
  const [stats, setStats] = useState({
    pending_verifications: 0,
    students_assigned: 0,
    verified_this_week: 0,
    total_verified: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      student: string;
      service: string;
      date: string;
      status: string;
      statusColor: string;
    }>
  >([]);

  useEffect(() => {
    Promise.all([
      apiGet<ProfileRes>("/api/profile"),
      apiGet<DashboardRes>("/api/dashboard"),
      apiGet<StudentsRes>("/api/verifications/students"),
      apiGet<PendingRes>("/api/verifications/pending"),
    ])
      .then(([profileRes, dashboardRes, studentsRes, pendingRes]) => {
        setName(profileRes.profile.full_name?.split(" ")[0] ?? "Educator");
        setInstitution(
          profileRes.profile.institutions?.name ?? "Your institution",
        );
        setStats({
          pending_verifications: dashboardRes.stats.pending_verifications ?? 0,
          students_assigned: studentsRes.students.length,
          verified_this_week: dashboardRes.stats.verified_this_week ?? 0,
          total_verified: dashboardRes.stats.total_verified ?? 0,
        });

        setRecentActivity(
          (pendingRes.pending ?? []).slice(0, 5).map((item) => ({
            id: item.id,
            student: item.student?.full_name ?? "Student",
            service: item.name,
            date: new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            status: "Pending Review",
            statusColor: "bg-amber-100 text-amber-700",
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

  const statsCards = [
    {
      label: "Pending Verifications",
      value: stats.pending_verifications,
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Students Assigned",
      value: stats.students_assigned,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Verified This Week",
      value: stats.verified_this_week,
      icon: TrendingUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Total Verified",
      value: stats.total_verified,
      icon: Award,
      iconBg: "bg-k-primary/10",
      iconColor: "text-k-primary",
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">{institution}</p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-5"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}
              >
                <Icon size={18} className={stat.iconColor} />
              </div>
              <p className="font-serif text-2xl text-k-black">{stat.value}</p>
              <p className="mt-0.5 text-xs text-k-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-10 text-center">
          <p className="text-sm text-k-gray-400">Loading dashboard...</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Link
          href="/educator/verify"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <ClipboardCheck size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">
            Verify Services
          </span>
        </Link>
        <Link
          href="/educator/students"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Users size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">
            View Students
          </span>
        </Link>
      </div>

      {/* Recent verification activity */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">Recent Activity</h2>
          <Link
            href="/educator/verify"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl bg-k-gray-100 px-4 py-8 text-center">
              <p className="text-sm text-k-gray-400">
                No pending verification activity.
              </p>
            </div>
          ) : (
            recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-k-black truncate">
                    {item.service}
                  </p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {item.student} &middot; {item.date}
                  </p>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${item.statusColor}`}
                >
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
