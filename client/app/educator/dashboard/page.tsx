"use client";

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

const stats = [
  {
    label: "Pending Verifications",
    value: 5,
    icon: Clock,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Students Assigned",
    value: 12,
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Verified This Week",
    value: 8,
    icon: TrendingUp,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "Total Verified",
    value: 142,
    icon: Award,
    iconBg: "bg-k-primary/10",
    iconColor: "text-k-primary",
  },
];

const recentActivity = [
  {
    id: 1,
    student: "Maya Thompson",
    service: "Full Colour Application",
    date: "20 Mar 2026",
    status: "Verified by you",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 2,
    student: "Aisha Patel",
    service: "Blow-dry & Style",
    date: "19 Mar 2026",
    status: "Pending Review",
    statusColor: "bg-amber-100 text-amber-700",
  },
  {
    id: 3,
    student: "Jade Foster",
    service: "Men's Cut",
    date: "18 Mar 2026",
    status: "Verified by you",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 4,
    student: "Lena Kim",
    service: "Scalp Treatment",
    date: "17 Mar 2026",
    status: "Pending Review",
    statusColor: "bg-amber-100 text-amber-700",
  },
  {
    id: 5,
    student: "Priya Mehta",
    service: "Highlights (Full Head)",
    date: "16 Mar 2026",
    status: "Verified by you",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
];

export default function EducatorDashboard() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, Claire
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Hair & Colour Department &middot; London College of Beauty
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-5"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}>
                <Icon size={18} className={stat.iconColor} />
              </div>
              <p className="font-serif text-2xl text-k-black">{stat.value}</p>
              <p className="mt-0.5 text-xs text-k-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Link
          href="/educator/verify"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <ClipboardCheck size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">Verify Services</span>
        </Link>
        <Link
          href="/educator/students"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Users size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">View Students</span>
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
          {recentActivity.map((item) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
