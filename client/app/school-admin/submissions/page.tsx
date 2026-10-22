"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Submission {
  id: string;
  name: string;
  category_id: string;
  status: string;
  created_at: string;
  student: { full_name: string | null } | null;
}

export default function SchoolAdminSubmissions() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ submissions: Submission[] }>("/api/school-admin/submissions")
      .then((r) => setRows(r.submissions))
      .catch(() => setError("Failed to load submissions."));
  }, []);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title="Submissions" subtitle="Practical submissions from your students." />
      {error && <ErrorBanner message={error} />}
      {!rows && !error ? (
        <LoadingCard label="Loading…" />
      ) : rows && rows.length === 0 ? (
        <EmptyCard label="No submissions yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-k-gray-200 bg-k-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-k-gray-200 text-xs uppercase tracking-wide text-k-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-k-gray-200">
              {rows?.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium text-k-black">{s.name}</td>
                  <td className="px-5 py-3 text-k-gray-600">{s.student?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 capitalize text-k-gray-600">{s.status.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 text-k-gray-400">{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
