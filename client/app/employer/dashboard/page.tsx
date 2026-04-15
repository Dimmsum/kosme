"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Heart,
  Users,
  Eye,
  GraduationCap,
  CheckCircle2,
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
    shortlisted: number;
    new_graduates: number;
  };
}

interface BrowseRes {
  graduates: Array<{
    id: string;
    full_name: string | null;
    institution_name: string | null;
    specialisations: string[];
    verified_count: number;
  }>;
}

function initialsFromName(name: string | null): string {
  const safe = (name ?? "Graduate").trim();
  return safe
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EmployerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Employer");
  const [institution, setInstitution] = useState("Your organisation");
  const [stats, setStats] = useState([
    { label: "Shortlisted", value: 0, icon: Heart, color: "text-k-accent" },
    {
      label: "Available Graduates",
      value: 0,
      icon: Eye,
      color: "text-k-primary",
    },
    {
      label: "New Graduates",
      value: 0,
      icon: GraduationCap,
      color: "text-emerald-600",
    },
  ]);
  const [featuredGraduates, setFeaturedGraduates] = useState<
    Array<{
      id: string;
      name: string | null;
      initials: string;
      institution: string | null;
      specialisation: string;
      verifiedCount: number;
    }>
  >([]);

  useEffect(() => {
    Promise.all([
      apiGet<ProfileRes>("/api/profile"),
      apiGet<DashboardRes>("/api/dashboard"),
      apiGet<BrowseRes>("/api/portfolio/browse"),
    ])
      .then(([profileRes, dashboardRes, browseRes]) => {
        const grads = browseRes.graduates ?? [];
        setName(profileRes.profile.full_name?.split(" ")[0] ?? "Employer");
        setInstitution(
          profileRes.profile.institutions?.name ?? "Your organisation",
        );
        setStats([
          {
            label: "Shortlisted",
            value: dashboardRes.stats.shortlisted ?? 0,
            icon: Heart,
            color: "text-k-accent",
          },
          {
            label: "Available Graduates",
            value: grads.length,
            icon: Eye,
            color: "text-k-primary",
          },
          {
            label: "New Graduates",
            value: dashboardRes.stats.new_graduates ?? 0,
            icon: GraduationCap,
            color: "text-emerald-600",
          },
        ]);
        setFeaturedGraduates(
          grads.slice(0, 4).map((grad) => ({
            id: grad.id,
            name: grad.full_name,
            initials: initialsFromName(grad.full_name),
            institution: grad.institution_name,
            specialisation: grad.specialisations[0] ?? "General",
            verifiedCount: grad.verified_count,
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
        <p className="mt-1 text-sm text-k-gray-400">{institution}</p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {loading && (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-10 text-center">
          <p className="text-sm text-k-gray-400">Loading dashboard...</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/employer/browse"
          className="flex items-center gap-3 rounded-2xl border border-k-accent/20 bg-k-accent/5 px-4 py-3.5 no-underline transition-colors hover:bg-k-accent/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-accent/10">
            <Search size={18} className="text-k-accent" />
          </div>
          <span className="text-sm font-medium text-k-black">
            Browse Talent
          </span>
        </Link>
        <Link
          href="/employer/shortlist"
          className="flex items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10">
            <Heart size={18} className="text-k-primary" />
          </div>
          <span className="text-sm font-medium text-k-black">
            View Shortlist
          </span>
        </Link>
      </div>

      {/* Featured graduates */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-k-black">
            Featured Graduates
          </h2>
          <Link
            href="/employer/browse"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {featuredGraduates.length === 0 ? (
            <div className="rounded-2xl bg-k-gray-100 px-4 py-8 text-center">
              <p className="text-sm text-k-gray-400">
                No featured graduates yet.
              </p>
            </div>
          ) : (
            featuredGraduates.map((grad) => (
              <div
                key={grad.id}
                className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3.5 transition-colors hover:bg-k-gray-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {grad.initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-k-black truncate">
                      {grad.name ?? "Unnamed Graduate"}
                    </p>
                    <p className="text-xs text-k-gray-400 mt-0.5 truncate">
                      {grad.institution ?? "No institution listed"}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
