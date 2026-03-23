"use client";

import Link from "next/link";
import { ArrowRight, Plus, Camera, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const progressRings = [
  { label: "Haircuts", value: 12, max: 15, color: "#ee0384" },
  { label: "Colour", value: 6, max: 10, color: "#3B0A2A" },
  { label: "Styling", value: 8, max: 10, color: "#551840" },
  { label: "Scalp", value: 3, max: 5, color: "#9B9690" },
];

const recentServices = [
  {
    id: 1,
    name: "Full Colour Application",
    client: "Sarah J.",
    date: "18 Mar 2026",
    status: "Verified",
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  {
    id: 2,
    name: "Blow-dry & Style",
    client: "Priya M.",
    date: "15 Mar 2026",
    status: "Awaiting Educator",
    statusColor: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  {
    id: 3,
    name: "Scalp Treatment",
    client: "Lena K.",
    date: "12 Mar 2026",
    status: "Awaiting Client",
    statusColor: "bg-amber-100 text-amber-700",
    icon: AlertCircle,
  },
  {
    id: 4,
    name: "Cut & Finish",
    client: "Amina R.",
    date: "10 Mar 2026",
    status: "Verified",
    statusColor: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
];

function ProgressRing({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const filled = (value / max) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#E4E1DA" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-lg text-k-black">
            {value}/{max}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-k-gray-600">{label}</span>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, Maya
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Academic Year 2025-26 &middot; Level 3 Cosmetology
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Link
          href="/student/services/new"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <Plus size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">New Service</span>
        </Link>
        <Link
          href="/student/portfolio"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Camera size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">Portfolio</span>
        </Link>
      </div>

      {/* Progress section */}
      <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-k-black">My Progress</h2>
            <p className="text-xs text-k-gray-400 mt-0.5">Required practicals</p>
          </div>
          <span className="rounded-full bg-k-primary/10 px-3 py-1 text-xs font-medium text-k-primary">
            29/40 completed
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-around gap-4">
          {progressRings.map((ring) => (
            <ProgressRing key={ring.label} {...ring} />
          ))}
        </div>
      </div>

      {/* Recent services */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">Recent Services</h2>
          <Link
            href="/student/services"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recentServices.map((service) => (
            <Link
              key={service.id}
              href={`/student/services`}
              className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-200/60"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-k-black truncate">{service.name}</p>
                <p className="text-xs text-k-gray-400 mt-0.5">
                  {service.client} &middot; {service.date}
                </p>
              </div>
              <span className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${service.statusColor}`}>
                {service.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
