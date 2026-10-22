export type AppointmentStatus =
  | "pending_student"
  | "pending_client"
  | "confirmed"
  | "reschedule_requested"
  | "cancelled"
  | "awaiting_client_confirmation"
  | "completed";

export interface Appointment {
  id: string;
  student_id: string;
  client_id: string | null;
  category_id: string;
  service_type_id: string | null;
  service_name: string;
  starts_at: string;
  est_duration_min: number;
  location: string;
  notes: string | null;
  status: AppointmentStatus;
  proposed_starts_at: string | null;
  proposed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  service_id: string | null;
  requested_by: string | null;
  student: { id: string; full_name: string | null } | null;
  client: { id: string; full_name: string | null } | null;
  /** "Add My Client": a client the student recorded, possibly without an account yet. */
  own_client?: boolean;
  student_client_id?: string | null;
  student_client?: { id: string; full_name: string | null; client_user_id: string | null } | null;
}

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  pending_student: { label: "Pending student response", className: "bg-amber-100 text-amber-700" },
  pending_client: { label: "Pending client response", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700" },
  reschedule_requested: { label: "Reschedule requested", className: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-600" },
  awaiting_client_confirmation: { label: "Awaiting client confirmation", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Service completed", className: "bg-slate-100 text-slate-700" },
};

/** Still live: needs a response, is booked, or is waiting on the client to confirm. */
export const UPCOMING_STATUSES: AppointmentStatus[] = [
  "pending_student",
  "pending_client",
  "confirmed",
  "reschedule_requested",
  "awaiting_client_confirmation",
];
export const PAST_STATUSES: AppointmentStatus[] = ["completed", "cancelled"];

export const isPendingStatus = (status: AppointmentStatus) => status === "pending_student" || status === "pending_client";

/** True when this person is the one a pending request or proposed time is waiting on. */
export function needsMyReply(a: Appointment, role: "student" | "client"): boolean {
  if (a.status === "pending_student") return role === "student";
  if (a.status === "pending_client") return role === "client";
  if (a.status === "reschedule_requested") return a.proposed_by !== (role === "student" ? a.student_id : a.client_id);
  return false;
}

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface AvailabilityWindow {
  day: Day;
  from: string;
  to: string;
}

export const DAYS: { key: Day; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export interface VolunteerProfile {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  willing_to_travel: boolean;
  services_willing: string[];
  availability: AvailabilityWindow[];
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

/** Value for an <input type="datetime-local"> min attribute: now, local time. */
export function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

const DAY_KEYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Whether a date/time falls inside someone's weekly windows. No windows means
 * "flexible", so anything fits. Used as a hint only: the other person can
 * always accept or suggest another time.
 */
export function withinAvailability(iso: string, windows: AvailabilityWindow[]): boolean {
  if (windows.length === 0) return true;
  const d = new Date(iso);
  const day = DAY_KEYS[d.getDay()];
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return windows.some((w) => w.day === day && hhmm >= w.from && hhmm < w.to);
}

/** A student as a client sees them when finding someone to book. */
export interface StudentListing {
  bio: string | null;
  location: string | null;
  willing_to_travel: boolean;
  services_offered: string[];
  availability: AvailabilityWindow[];
}

/** Reasons offered when a client reports an issue; keys match the server. */
export const ISSUE_REASONS: { key: string; label: string }[] = [
  { key: "service_cancelled", label: "Service was cancelled" },
  { key: "service_incomplete", label: "Service was incomplete" },
  { key: "not_received", label: "I did not receive this service" },
  { key: "details_incorrect", label: "Service details are incorrect" },
  { key: "other", label: "Other" },
];

export function issueReasonLabel(key: string | null | undefined) {
  return ISSUE_REASONS.find((r) => r.key === key)?.label ?? null;
}

/**
 * Where a service the client has dealt with sits on its way to the student's
 * verified record. Drives the History tracker (CLI-5).
 */
export function serviceStage(
  confirmation: "pending" | "confirmed" | "disputed",
  serviceStatus: string | null | undefined,
): { label: string; detail: string; className: string } {
  if (confirmation === "disputed" && serviceStatus === "awaiting_client") {
    return {
      label: "Issue reported",
      detail: "Flagged for review. The student can't submit it until it's sorted out.",
      className: "bg-amber-100 text-amber-700",
    };
  }
  switch (serviceStatus) {
    case "verified":
      return {
        label: "Verified",
        detail: "An educator verified it. It's now in the student's portfolio.",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "awaiting_educator":
      return {
        label: "With educator",
        detail: "The student submitted it. An educator is reviewing it.",
        className: "bg-blue-100 text-blue-700",
      };
    case "corrections_requested":
      return {
        label: "Corrections requested",
        detail: "The educator asked the student to fix something before verifying.",
        className: "bg-orange-100 text-orange-700",
      };
    case "rejected":
      return {
        label: "Not verified",
        detail: "This service was not verified.",
        className: "bg-red-100 text-red-700",
      };
    default:
      return {
        label: "Awaiting student",
        detail: "You've confirmed it. The student adds photos and notes, then submits it to an educator.",
        className: "bg-k-gray-100 text-k-gray-600",
      };
  }
}
