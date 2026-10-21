// Appointments are booked for a wall-clock time at a place, so "today" has to
// be judged in the volunteers' timezone, not the server's (UTC on most hosts).
const APPOINTMENT_TZ = "America/Jamaica";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APPOINTMENT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isSameAppointmentDay(a: Date, b: Date): boolean {
  return dayFormat.format(a) === dayFormat.format(b);
}
