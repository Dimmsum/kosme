"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  UserCheck,
  Users,
  Briefcase,
  Building2,
  ClipboardList,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface Overview {
  students: number;
  educators: number;
  clients: number;
  employers: number;
  institutions: number;
  pending_verifications: number;
  verified_services: number;
}

const TILES: { key: keyof Overview; label: string; icon: typeof GraduationCap }[] = [
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "educators", label: "Educators", icon: UserCheck },
  { key: "clients", label: "Volunteer Clients", icon: Users },
  { key: "employers", label: "Employers", icon: Briefcase },
  { key: "institutions", label: "Institutions", icon: Building2 },
  { key: "pending_verifications", label: "Pending Verifications", icon: ClipboardList },
  { key: "verified_services", label: "Verified Services", icon: CheckCircle2 },
];

interface SettingRow {
  key: string;
  value: unknown;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [kaiEnabled, setKaiEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ stats: Overview }>("/api/admin/overview");
        setStats(data.stats);
      } catch {
        setError("Failed to load dashboard stats.");
      }
    })();
    // KAI insights surface is gated by the kai_enabled feature flag (roadmap Phase 7).
    apiGet<{ settings: SettingRow[] }>("/api/admin/settings")
      .then(({ settings }) => setKaiEnabled(settings.find((s) => s.key === "kai_enabled")?.value === true))
      .catch(() => {});
  }, []);

  return (
    <div className="px-6 py-10 sm:px-10">
      <h1 className="mb-1 font-serif text-3xl font-light text-k-black">Dashboard Overview</h1>
      <p className="mb-8 text-sm font-light text-k-gray-600">
        Real platform activity — demo accounts and data are excluded.
      </p>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-6 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-k-black">
                {stats ? stats[key] : "—"}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-k-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* KAI Insights placeholder (roadmap Phase 7 — assistive only, never verifies work) */}
      <div className="mt-8 flex items-start gap-4 rounded-2xl border border-dashed border-k-gray-200 bg-k-white px-6 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
          <Sparkles size={20} />
        </span>
        <div>
          <p className="text-sm font-medium text-k-black">KAI Insights</p>
          <p className="mt-0.5 text-sm font-light text-k-gray-600">
            {kaiEnabled
              ? "Cohort insights are enabled — assistive summaries will appear here as the KAI integration lands."
              : "Cohort insights coming soon. Enable the KAI feature flag in Settings to switch this surface on."}
          </p>
        </div>
      </div>
    </div>
  );
}
