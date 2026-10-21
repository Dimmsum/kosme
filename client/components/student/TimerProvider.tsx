"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Timer, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { CHECKPOINT_INTERVAL_MIN } from "@/lib/timer";

export interface ActiveService {
  id: string;
  name: string;
  started_at: string | null;
  service_type_id: string | null;
}

interface Toast {
  key: number;
  title: string;
  body?: string;
  icon: "timer" | "bell";
}

interface TimerContextValue {
  /** The running service, restored from the server's `started_at`. */
  active: ActiveService | null;
  /** Seconds elapsed on the running service (ticks every second). */
  elapsedSec: number;
  stopping: boolean;
  /** Bumps whenever a timer starts or stops so list pages can reload. */
  version: number;
  /** Re-read the running timer from the server. */
  refresh: () => Promise<void>;
  /** Call after a service was started so the bar and toast appear at once. */
  started: (service: ActiveService) => void;
  stop: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>");
  return ctx;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveService | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stopping, setStopping] = useState(false);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastKey = useRef(0);
  const shownCheckpoints = useRef<Set<number>>(new Set());
  const checkpointServiceId = useRef<string | null>(null);

  const showToast = useCallback((t: Omit<Toast, "key">) => {
    toastKey.current += 1;
    setToast({ ...t, key: toastKey.current });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await apiGet<{ service: ActiveService | null }>("/api/services/active");
      setActive(res.service);
      setNow(Date.now());
    } catch {
      /* keep whatever we last knew; the next focus/refresh retries */
    }
  }, []);

  // Restore on mount (reload, new tab, re-login) and when the tab regains
  // focus, so a timer started or stopped elsewhere is picked up.
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = active?.started_at
    ? Math.max(0, (now - new Date(active.started_at).getTime()) / 1000)
    : 0;

  // Reset fired checkpoints whenever the running service changes.
  useEffect(() => {
    if ((active?.id ?? null) !== checkpointServiceId.current) {
      checkpointServiceId.current = active?.id ?? null;
      shownCheckpoints.current = new Set();
    }
  }, [active?.id]);

  // Checkpoint reminder every CHECKPOINT_INTERVAL_MIN of elapsed time, on any
  // student page (not just the services list).
  useEffect(() => {
    if (!active?.started_at) return;
    const elapsedMin = elapsedSec / 60;
    const checkpoint =
      Math.floor(elapsedMin / CHECKPOINT_INTERVAL_MIN) * CHECKPOINT_INTERVAL_MIN;
    if (checkpoint > 0 && !shownCheckpoints.current.has(checkpoint)) {
      shownCheckpoints.current.add(checkpoint);
      showToast({
        icon: "bell",
        title: `${checkpoint}-minute checkpoint`,
        body: `"${active.name}" has been running ${checkpoint} min — a good moment for a progress photo or a quick check-in with your client.`,
      });
    }
  }, [elapsedSec, active, showToast]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.icon === "bell" ? 12000 : 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const started = useCallback(
    (service: ActiveService) => {
      setActive(service);
      setNow(Date.now());
      setVersion((v) => v + 1);
      showToast({
        icon: "timer",
        title: `Timer started — ${service.name} is now being recorded.`,
      });
    },
    [showToast],
  );

  const stop = useCallback(async () => {
    if (!active) return;
    setStopping(true);
    try {
      await apiPost(`/api/services/${active.id}/stop`, {});
      setActive(null);
      setVersion((v) => v + 1);
      showToast({ icon: "timer", title: `Timer stopped — ${active.name} has been recorded.` });
    } catch {
      showToast({ icon: "bell", title: "Could not stop the timer. Please try again." });
      await refresh();
    } finally {
      setStopping(false);
    }
  }, [active, refresh, showToast]);

  const value = useMemo(
    () => ({ active, elapsedSec, stopping, version, refresh, started, stop }),
    [active, elapsedSec, stopping, version, refresh, started, stop],
  );

  return (
    <TimerContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-24 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-k-primary/20 bg-k-white px-5 py-4 shadow-[0_12px_40px_rgba(59,10,42,0.18)] md:bottom-6 md:right-6"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-k-primary/10">
              {toast.icon === "timer" ? (
                <Timer size={16} className="text-k-primary" />
              ) : (
                <Bell size={16} className="text-k-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-k-black">{toast.title}</p>
              {toast.body && (
                <p className="mt-0.5 text-xs leading-relaxed text-k-gray-400">{toast.body}</p>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </TimerContext.Provider>
  );
}
