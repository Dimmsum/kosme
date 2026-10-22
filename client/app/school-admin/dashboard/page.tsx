"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, ErrorBanner } from "@/components/admin/DataStates";

interface Overview {
  institution: { name: string } | null;
  students: number;
  educators: number;
  submissions_by_status: Record<string, number>;
}

export default function SchoolAdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Overview>("/api/school-admin/overview")
      .then(setData)
      .catch(() => setError("Failed to load overview."));
  }, []);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title={data?.institution?.name ?? "School overview"} subtitle="Students, educators and submissions at your institution." />
      {error && <ErrorBanner message={error} />}
      {!data && !error && <LoadingCard label="Loading…" />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Students" value={data.students} />
          <Stat label="Educators" value={data.educators} />
          {Object.entries(data.submissions_by_status).map(([k, v]) => (
            <Stat key={k} label={k.replace(/_/g, " ")} value={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-k-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-k-black">{value}</p>
    </div>
  );
}
