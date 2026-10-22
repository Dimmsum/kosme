"use client";

import { useState } from "react";
import { CalendarClock, MapPin, MessageSquare, Play, Timer } from "lucide-react";
import { apiErrorMessage, apiPost } from "@/lib/api";
import {
  APPOINTMENT_STATUS,
  Appointment,
  formatDuration,
  formatWhen,
  isToday,
  nowLocalInput,
} from "@/lib/appointments";

type Role = "student" | "client";

const BTN =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";
const PRIMARY = `${BTN} bg-k-primary text-k-white hover:bg-k-primary-light`;
const OUTLINE = `${BTN} border border-k-gray-200 bg-k-white text-k-gray-600 hover:border-k-primary/30 hover:text-k-primary`;

/**
 * Appointments for either side of a booking. The same card drives both: the
 * available buttons depend on the status and on who proposed the last time.
 */
export default function AppointmentList({
  role,
  appointments,
  onChanged,
  onMessage,
  onStart,
  emptyLabel,
}: {
  role: Role;
  appointments: Appointment[];
  onChanged: () => void;
  onMessage: (otherId: string, otherName: string | null) => void;
  /** Student only: start the timer from a confirmed booking. */
  onStart?: (appt: Appointment) => Promise<void>;
  emptyLabel: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [suggestAt, setSuggestAt] = useState("");

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await action();
      setSuggesting(null);
      setSuggestAt("");
      onChanged();
    } catch (err) {
      setError({ id, message: apiErrorMessage(err, "Something went wrong. Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  const act = (id: string, path: string, body?: unknown) =>
    run(id, () => apiPost(`/api/appointments/${id}/${path}`, body ?? {}));

  if (appointments.length === 0) {
    return (
      <div className="max-w-2xl rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
        <CalendarClock size={28} className="mx-auto mb-3 text-k-gray-300" />
        <p className="text-sm text-k-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="flex max-w-2xl flex-col gap-4">
      {appointments.map((a) => {
        const status = APPOINTMENT_STATUS[a.status];
        const other = role === "student" ? a.client : a.student;
        const myId = role === "student" ? a.student_id : a.client_id;
        const iProposed = a.proposed_by === myId;
        // Either side can open a request; the other one answers it. Rows from
        // before client-led booking have no requested_by and were the student's.
        const iRequested = (a.requested_by ?? a.student_id) === myId;
        const open = ["pending", "confirmed", "reschedule_requested"].includes(a.status);
        const disabled = busy === a.id;
        const canStart =
          role === "student" &&
          a.status === "confirmed" &&
          !a.service_id &&
          isToday(a.starts_at) &&
          !!onStart;

        return (
          <li key={a.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-k-black">{a.service_name}</p>
                <p className="mt-0.5 text-xs text-k-gray-400">
                  {role === "student" ? "with" : "for"} {other?.full_name ?? "Unknown"} · {a.category_id}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 text-xs text-k-gray-600">
              <p className="flex items-center gap-2">
                <CalendarClock size={13} className="shrink-0 text-k-gray-400" />
                <span className={a.status === "reschedule_requested" ? "line-through" : ""}>
                  {formatWhen(a.starts_at)}
                </span>
                <span className="text-k-gray-400">· {formatDuration(a.est_duration_min)}</span>
              </p>
              {a.status === "reschedule_requested" && a.proposed_starts_at && (
                <p className="flex items-center gap-2 font-medium text-orange-700">
                  <CalendarClock size={13} className="shrink-0" />
                  {iProposed ? "You suggested" : `${other?.full_name ?? "They"} suggested`}{" "}
                  {formatWhen(a.proposed_starts_at)}
                </p>
              )}
              <p className="flex items-center gap-2">
                <MapPin size={13} className="shrink-0 text-k-gray-400" />
                {a.location}
              </p>
              {a.notes && <p className="rounded-xl bg-k-gray-100 px-3 py-2 leading-relaxed">{a.notes}</p>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canStart && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    run(a.id, async () => {
                      await onStart!(a);
                    })
                  }
                  className={PRIMARY}
                >
                  <Play size={12} /> Start Service
                </button>
              )}
              {a.status === "pending" && !iRequested && (
                <>
                  <button type="button" disabled={disabled} onClick={() => act(a.id, "accept")} className={PRIMARY}>
                    Accept
                  </button>
                  <button type="button" disabled={disabled} onClick={() => act(a.id, "decline")} className={OUTLINE}>
                    Decline
                  </button>
                </>
              )}
              {a.status === "reschedule_requested" && !iProposed && (
                <>
                  <button type="button" disabled={disabled} onClick={() => act(a.id, "accept")} className={PRIMARY}>
                    Accept new time
                  </button>
                  <button type="button" disabled={disabled} onClick={() => act(a.id, "decline")} className={OUTLINE}>
                    Decline
                  </button>
                </>
              )}
              {((a.status === "reschedule_requested" && iProposed) ||
                (a.status === "pending" && iRequested)) && (
                <span className="text-xs text-k-gray-400">
                  Waiting for {other?.full_name?.split(" ")[0] ?? "a reply"}…
                </span>
              )}
              {open && !a.service_id && (a.status !== "pending" || !iRequested) && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setSuggesting(suggesting === a.id ? null : a.id)}
                  className={OUTLINE}
                >
                  {a.status === "confirmed" ? "Reschedule" : "Suggest another time"}
                </button>
              )}
              {open && other && (
                <button
                  type="button"
                  onClick={() => onMessage(other.id, other.full_name)}
                  className={OUTLINE}
                >
                  <MessageSquare size={12} /> Message
                </button>
              )}
              {open && !a.service_id && !(a.status === "pending" && !iRequested) && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => act(a.id, "cancel")}
                  className={`${BTN} text-red-600 hover:bg-red-50`}
                >
                  {a.status === "pending" ? "Cancel request" : "Cancel appointment"}
                </button>
              )}
              {a.service_id && a.status !== "completed" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-k-primary">
                  <Timer size={12} /> Service started
                </span>
              )}
            </div>

            {suggesting === a.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={suggestAt}
                  min={nowLocalInput()}
                  onChange={(e) => setSuggestAt(e.target.value)}
                  aria-label="New date and time"
                  className="rounded-xl border border-k-gray-200 bg-k-white px-3 py-1.5 text-sm text-k-black focus:border-k-primary focus:outline-none"
                />
                <button
                  type="button"
                  disabled={disabled || !suggestAt}
                  onClick={() =>
                    act(a.id, "suggest", { starts_at: new Date(suggestAt).toISOString() })
                  }
                  className={PRIMARY}
                >
                  Send new time
                </button>
              </div>
            )}

            {error?.id === a.id && <p className="mt-2 text-xs text-red-600">{error.message}</p>}
          </li>
        );
      })}
    </ul>
  );
}
