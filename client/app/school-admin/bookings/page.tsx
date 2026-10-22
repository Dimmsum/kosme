"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Booking {
  id: string;
  category_id: string;
  status: string;
  starts_at: string;
  student: { full_name: string | null } | null;
  client: { full_name: string | null } | null;
}

export default function SchoolAdminBookings() {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ bookings: Booking[] }>("/api/school-admin/bookings")
      .then((r) => setRows(r.bookings))
      .catch(() => setError("Failed to load bookings."));
  }, []);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title="Bookings" subtitle="Appointments between your students and clients." />
      {error && <ErrorBanner message={error} />}
      {!rows && !error ? (
        <LoadingCard label="Loading…" />
      ) : rows && rows.length === 0 ? (
        <EmptyCard label="No bookings yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-k-gray-200 bg-k-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-k-gray-200 text-xs uppercase tracking-wide text-k-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-k-gray-200">
              {rows?.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3 text-k-gray-600">{new Date(b.starts_at).toLocaleString("en-GB")}</td>
                  <td className="px-5 py-3 font-medium text-k-black">{b.student?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-k-gray-600">{b.client?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-k-gray-600">{b.category_id}</td>
                  <td className="px-5 py-3 capitalize text-k-gray-600">{b.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
