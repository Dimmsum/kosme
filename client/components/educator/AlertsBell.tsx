"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface AlertEvent {
  id: string;
  event_type: "duration_over" | "duration_under" | "confirmation_completed" | "ready_for_verification";
  message: string;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  service: { id: string; name: string } | null;
}

const POLL_MS = 60_000;

export default function AlertsBell() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { events } = await apiGet<{ events: AlertEvent[] }>(
        "/api/events/priority?unacknowledged=true",
      );
      setAlerts(events);
    } catch {
      // Silent — the bell is a convenience surface, not a critical path.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/events/${id}/acknowledge`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // leave it in the list — user can retry
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Priority alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-k-gray-600 transition-colors hover:bg-k-gray-100 hover:text-k-black"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-k-gray-200 bg-k-white p-2 shadow-lg">
          <p className="px-2 py-1.5 text-xs font-medium text-k-gray-400">Priority alerts</p>
          {alerts.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-k-gray-400">No priority alerts.</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-k-gray-100">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-k-black">{a.message}</p>
                    <p className="mt-0.5 text-xs text-k-gray-400">
                      {a.student?.full_name ?? "Student"} &middot;{" "}
                      {new Date(a.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledge(a.id)}
                    disabled={busyId === a.id}
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-k-primary hover:bg-k-primary/10 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
