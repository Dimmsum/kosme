"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import { APPOINTMENT_STATUS, AppointmentStatus, formatWhen } from "@/lib/appointments";

interface Booking {
  id: string;
  category_id: string;
  service_name: string;
  status: AppointmentStatus;
  starts_at: string;
  own_client: boolean;
  flagged: boolean;
  student: { full_name: string | null } | null;
  client: { full_name: string | null } | null;
  student_client: { full_name: string | null } | null;
}

const CANCELLABLE: AppointmentStatus[] = ["pending_student", "pending_client", "confirmed", "reschedule_requested"];

// Routine acceptance stays between student and client. School admins can see
// every booking at their institution, flag issues for the Super Admin, and —
// with Manage access — cancel a booking that hasn't started.
export default function SchoolAdminBookings() {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [flagging, setFlagging] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ bookings: Booking[] }>(`/api/school-admin/bookings${status ? `?status=${status}` : ""}`);
      setRows(r.bookings);
      setError("");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to load bookings."));
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, path: "flag" | "cancel", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/school-admin/bookings/${id}/${path}`, body ?? {});
      setFlagging(null);
      setReason("");
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "That didn't work."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title="Bookings" subtitle="Appointments between your students and clients." />
      {error && <ErrorBanner message={error} />}
      <div className="mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none"
        >
          <option value="">All statuses</option>
          {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      {!rows && !error ? (
        <LoadingCard label="Loading…" />
      ) : rows && rows.length === 0 ? (
        <EmptyCard label="No bookings match." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows?.map((b) => {
            const st = APPOINTMENT_STATUS[b.status];
            const clientName = b.client?.full_name ?? b.student_client?.full_name ?? "—";
            return (
              <li key={b.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">{b.service_name}</p>
                    <p className="text-xs text-k-gray-400">
                      {b.student?.full_name ?? "—"} with {clientName}
                      {b.own_client ? " (student's own client)" : ""} · {b.category_id} · {formatWhen(b.starts_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.className}`}>{st.label}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  {b.flagged ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <Flag size={12} /> Flagged for Super Admin
                    </span>
                  ) : (
                    <button onClick={() => setFlagging(flagging === b.id ? null : b.id)} className="inline-flex items-center gap-1 font-medium text-k-gray-600 hover:text-k-primary">
                      <Flag size={12} /> Flag an issue
                    </button>
                  )}
                  {CANCELLABLE.includes(b.status) && (
                    <button onClick={() => act(b.id, "cancel")} disabled={busy} className="font-medium text-red-600 hover:underline disabled:opacity-50">
                      Cancel booking
                    </button>
                  )}
                </div>
                {flagging === b.id && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1000}
                      rows={2}
                      placeholder="What's the concern?"
                      className="w-full rounded-xl border border-k-gray-200 px-3 py-2 text-sm focus:border-k-primary focus:outline-none"
                    />
                    <button
                      onClick={() => act(b.id, "flag", { reason: reason.trim() })}
                      disabled={busy || !reason.trim()}
                      className="w-fit rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-k-white disabled:opacity-50"
                    >
                      Send flag
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
