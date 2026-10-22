export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface AvailabilityWindow {
  day: (typeof DAYS)[number];
  from: string;
  to: string;
}

/** Validate a weekly availability list, or return an error message. */
export function parseAvailability(value: unknown): AvailabilityWindow[] | string {
  if (!Array.isArray(value) || value.length > 21) {
    return "availability must be a list of at most 21 time windows";
  }
  const windows: AvailabilityWindow[] = [];
  for (const w of value) {
    const { day, from, to } = (w ?? {}) as Record<string, unknown>;
    if (
      typeof day !== "string" ||
      !(DAYS as readonly string[]).includes(day) ||
      typeof from !== "string" ||
      typeof to !== "string" ||
      !TIME_RE.test(from) ||
      !TIME_RE.test(to) ||
      from >= to
    ) {
      return "Each availability window needs a day and a start time before its end time";
    }
    windows.push({ day: day as AvailabilityWindow["day"], from, to });
  }
  return windows;
}
