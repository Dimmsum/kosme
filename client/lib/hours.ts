// Verified-hours display helpers. The server totals minutes with the rule in
// server/src/lib/verified-hours.ts; untimed verified services are counted
// separately, never as 0 hours.

export interface VerifiedHours {
  verified_minutes: number;
  timed_services: number;
  untimed_services: number;
}

export function formatHours(minutes: number) {
  const h = minutes / 60;
  return h === 0 ? "0" : h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString();
}

export function untimedNote(untimed: number) {
  return untimed > 0 ? `+ ${untimed} untimed service${untimed === 1 ? "" : "s"}` : null;
}
