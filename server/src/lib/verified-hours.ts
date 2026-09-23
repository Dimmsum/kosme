// Verified-hours rule shared by admin reports (RPT-1), the student dashboard
// and portfolio reads (POR-6). Only call these on services already filtered to
// status = 'verified' (the VER-9 source of truth).
//
// A verified service's minutes are the educator's adjusted_duration_min when
// set, else the student's timed actual_duration_min. Services logged without
// the timer have neither and are counted as untimed, never as 0 minutes.

export interface TimedRow {
  actual_duration_min: number | null;
  adjusted_duration_min: number | null;
}

export interface VerifiedHours {
  verified_minutes: number;
  timed_services: number;
  untimed_services: number;
}

export function verifiedMinutes(row: TimedRow): number | null {
  return row.adjusted_duration_min ?? row.actual_duration_min;
}

export function summariseVerifiedHours(rows: TimedRow[]): VerifiedHours {
  const totals: VerifiedHours = { verified_minutes: 0, timed_services: 0, untimed_services: 0 };
  for (const row of rows) {
    const minutes = verifiedMinutes(row);
    if (minutes == null) {
      totals.untimed_services += 1;
    } else {
      totals.verified_minutes += minutes;
      totals.timed_services += 1;
    }
  }
  return totals;
}
