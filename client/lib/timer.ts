/** Elapsed seconds → "HH:MM:SS" (or "MM:SS" under an hour). */
export function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

// How often (in minutes of elapsed time) to nudge the student with a
// checkpoint reminder while a service is running.
export const CHECKPOINT_INTERVAL_MIN = 15;
