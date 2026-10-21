"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Square, Timer } from "lucide-react";
import { formatElapsed } from "@/lib/timer";
import { useTimer } from "./TimerProvider";

/**
 * Sticky bar shown on every student page while a service is being timed.
 * The services list already shows a full timer card, so the bar skips it.
 */
export default function ActiveTimerBar() {
  const { active, elapsedSec, stopping, stop } = useTimer();
  const pathname = usePathname();

  if (!active || pathname === "/student/services") return null;

  return (
    <div
      role="timer"
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-k-primary/20 bg-k-primary px-4 py-2.5 text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.18)] sm:px-6"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-k-white/60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-k-white" />
      </span>
      <Timer size={16} className="hidden shrink-0 sm:block" />
      <Link
        href={`/student/services/${active.id}`}
        className="min-w-0 flex-1 truncate text-sm text-k-white no-underline hover:underline"
      >
        <span className="font-medium">Service in progress</span>
        <span className="hidden sm:inline"> — {active.name}</span>
        <span className="tabular-nums"> — {formatElapsed(elapsedSec)}</span>
      </Link>
      <button
        onClick={stop}
        disabled={stopping}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-k-white px-4 py-1.5 text-xs font-medium text-k-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Square size={12} className="fill-current" />
        {stopping ? "Stopping…" : "Stop Service"}
      </button>
    </div>
  );
}
