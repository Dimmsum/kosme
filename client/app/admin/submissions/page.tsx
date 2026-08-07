"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Submission {
  id: string;
  name: string;
  category_id: string;
  status: "awaiting_client" | "awaiting_educator" | "verified" | "rejected";
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  client: { id: string; full_name: string | null } | null;
  verification: { status: string } | null;
  confirmation: { status: string } | null;
}

const statusColor: Record<Submission["status"], string> = {
  awaiting_client: "bg-blue-100 text-blue-700",
  awaiting_educator: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabel: Record<Submission["status"], string> = {
  awaiting_client: "Awaiting client",
  awaiting_educator: "Awaiting educator",
  verified: "Verified",
  rejected: "Rejected",
};

const FILTERS: { v: string; l: string }[] = [
  { v: "", l: "All" },
  { v: "awaiting_client", l: "Awaiting client" },
  { v: "awaiting_educator", l: "Awaiting educator" },
  { v: "verified", l: "Verified" },
  { v: "rejected", l: "Rejected" },
];

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const { submissions } = await apiGet<{ submissions: Submission[] }>(`/api/admin/submissions${qs}`);
      setSubmissions(submissions);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load submissions."));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Practical Submissions"
        subtitle="Every logged service across the platform with its confirmation and verification state."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              status === f.v ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingCard label="Loading submissions…" />
      ) : submissions.length === 0 ? (
        <EmptyCard label="No submissions match this filter." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-k-gray-200 bg-k-gray-100/50 text-xs uppercase tracking-wide text-k-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Confirmation</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-k-gray-200">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-k-gray-100/40">
                    <td className="px-5 py-3">
                      <span className="font-medium text-k-black">{s.name}</span>
                      <span className="ml-2 text-xs text-k-gray-400">{s.category_id}</span>
                      {s.is_demo && (
                        <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">Demo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-k-gray-600">{s.student?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-k-gray-600">{s.client?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-k-gray-600">{s.confirmation?.status ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[s.status]}`}>
                        {statusLabel[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-k-gray-400">
                      {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
