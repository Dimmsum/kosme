"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, CheckCircle2, Calendar, AlertTriangle } from "lucide-react";

const quickStats = [
  { label: "Pending Confirmations", value: 2, color: "bg-amber-100 text-amber-700" },
  { label: "Services Received", value: 14, color: "bg-emerald-100 text-emerald-700" },
  { label: "This Month", value: 3, color: "bg-blue-100 text-blue-700" },
];

const pendingConfirmations = [
  {
    id: 1,
    service: "Full Colour Application",
    student: "Maya Thompson",
    date: "20 Mar 2026",
    notes: "Full head colour, warm auburn tones",
  },
  {
    id: 2,
    service: "Blow-dry & Style",
    student: "Priya Mehta",
    date: "18 Mar 2026",
    notes: "Blow-dry with volume and loose waves",
  },
];

const upcomingAppointments = [
  {
    id: 1,
    service: "Cut & Finish",
    student: "Amina Rahman",
    date: "25 Mar 2026",
    time: "10:30 AM",
  },
  {
    id: 2,
    service: "Scalp Treatment",
    student: "Jade Patterson",
    date: "28 Mar 2026",
    time: "2:00 PM",
  },
  {
    id: 3,
    service: "Highlights (Half Head)",
    student: "Maya Thompson",
    date: "1 Apr 2026",
    time: "11:00 AM",
  },
];

export default function VolunteerDashboard() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, Sarah
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Thank you for supporting our cosmetology students.
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-k-gray-200 bg-k-white p-6"
          >
            <p className="text-xs font-medium text-k-gray-400">{stat.label}</p>
            <p className="mt-2 font-serif text-3xl text-k-black">{stat.value}</p>
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
          <h2 className="font-serif text-lg text-k-black">Pending Confirmations</h2>
          <Link
            href="/volunteer/confirmations"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {pendingConfirmations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-k-gray-100 px-4 py-4 sm:px-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-k-black">{item.service}</p>
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
                <button className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px">
                  <CheckCircle2 size={14} />
                  Confirm
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100">
                  <AlertTriangle size={14} />
                  Dispute
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <h2 className="font-serif text-lg text-k-black mb-5">Upcoming Appointments</h2>

        <div className="flex flex-col gap-3">
          {upcomingAppointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                  <Calendar size={18} className="text-k-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-k-black truncate">{apt.service}</p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {apt.student} &middot; {apt.date}
                  </p>
                </div>
              </div>
              <span className="ml-3 shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {apt.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
