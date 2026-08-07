"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Employer {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "suspended";
  is_demo: boolean;
  created_at: string;
  shortlist_count: number;
}

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { employers } = await apiGet<{ employers: Employer[] }>("/api/admin/employers");
      setEmployers(employers);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load employers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Employer Management"
        subtitle="Registered employers and how many students each has shortlisted. Manage account status in User Management."
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading employers…" />
      ) : employers.length === 0 ? (
        <EmptyCard label="No employer accounts yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employers.map((e) => (
            <div key={e.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                  <Briefcase size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-k-black">{e.full_name ?? "Unnamed employer"}</p>
                  <p className="text-xs text-k-gray-400">{e.phone ?? "no phone"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-k-gray-600">
                  <span className="text-lg font-semibold text-k-black">{e.shortlist_count}</span> shortlisted
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    e.status === "suspended" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {e.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
