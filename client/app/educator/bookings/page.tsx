"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { APPOINTMENT_STATUS, AppointmentStatus, formatWhen } from "@/lib/appointments";

interface Booking {
  id: string;
  service_name: string;
  category_id: string;
  starts_at: string;
  location: string;
  status: AppointmentStatus;
  own_client: boolean;
  flagged: boolean;
  student: { full_name: string | null } | null;
  client: { full_name: string | null } | null;
  student_client: { full_name: string | null } | null;
}

// Educators see bookings for the students in their cohorts and can flag a
// problem for the Super Admin. Accepting and rescheduling stay between the
// student and the client.
export default function EducatorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [flagging, setFlagging] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ bookings: Booking[] }>("/api/educator-bookings");
      setBookings(r.bookings);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load bookings."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function flag(id: string) {
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/educator-bookings/${id}/flag`, { reason: reason.trim() });
      setFlagging(null);
      setReason("");
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not flag this booking."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Bookings</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Appointments your students have with clients. Flag anything that looks wrong and an admin will follow up.
        </p>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      {!bookings ? (
        <p className="text-sm text-k-gray-400">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-k-gray-400">No bookings for your students yet.</p>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {bookings.map((b) => {
            const status = APPOINTMENT_STATUS[b.status];
            const clientName = b.client?.full_name ?? b.student_client?.full_name ?? "Unknown client";
            return (
              <li key={b.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">{b.service_name}</p>
                    <p className="text-xs text-k-gray-400">
                      {b.student?.full_name ?? "Student"} with {clientName}
                      {b.own_client ? " (student's own client)" : ""} · {b.category_id}
                    </p>
                    <p className="mt-1 text-xs text-k-gray-600">
                      {formatWhen(b.starts_at)} · {b.location}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {b.flagged ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <Flag size={12} /> Flagged for admin
                    </span>
                  ) : (
                    <button onClick={() => setFlagging(flagging === b.id ? null : b.id)} className="inline-flex items-center gap-1 text-xs font-medium text-k-gray-600 hover:text-k-primary">
                      <Flag size={12} /> Flag an issue
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
                      onClick={() => flag(b.id)}
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
