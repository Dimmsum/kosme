"use client";

import Link from "next/link";
import { ArrowRight, Search, Heart, Users, Eye, GraduationCap, CheckCircle2 } from "lucide-react";

const stats = [
  { label: "Shortlisted", value: 4, icon: Heart, color: "text-k-accent" },
  { label: "Portfolios Viewed", value: 23, icon: Eye, color: "text-k-primary" },
  { label: "New Graduates", value: 8, icon: GraduationCap, color: "text-emerald-600" },
];

const featuredGraduates = [
  {
    id: 1,
    name: "Maya Thompson",
    initials: "MT",
    institution: "London College of Beauty",
    specialisation: "Colour",
    verifiedCount: 29,
  },
  {
    id: 2,
    name: "Priya Sharma",
    initials: "PS",
    institution: "Manchester Beauty Academy",
    specialisation: "Styling",
    verifiedCount: 34,
  },
  {
    id: 3,
    name: "Jade Williams",
    initials: "JW",
    institution: "London College of Beauty",
    specialisation: "Haircuts",
    verifiedCount: 22,
  },
  {
    id: 4,
    name: "Amina Osei",
    initials: "AO",
    institution: "Birmingham Institute of Hair",
    specialisation: "Scalp",
    verifiedCount: 18,
  },
];

export default function EmployerDashboard() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Welcome back, Rachel
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Glamour Salon &middot; London
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center"
          >
            <div className="mb-2 flex justify-center">
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="font-serif text-2xl text-k-black">{stat.value}</p>
            <p className="text-xs text-k-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/employer/browse"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <Search size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">Browse Talent</span>
        </Link>
        <Link
          href="/employer/shortlist"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Heart size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">View Shortlist</span>
        </Link>
      </div>

      {/* Featured graduates */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">Featured Graduates</h2>
          <Link
            href="/employer/browse"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {featuredGraduates.map((grad) => (
            <div
              key={grad.id}
              className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5 transition-colors hover:bg-k-gray-200/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">{grad.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-k-black truncate">{grad.name}</p>
                  <p className="text-xs text-k-gray-400 mt-0.5 truncate">
                    {grad.institution}
                  </p>
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2 shrink-0">
                <span className="rounded-full bg-k-primary/10 px-3 py-1 text-xs font-medium text-k-primary">
                  {grad.specialisation}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={12} /> {grad.verifiedCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
