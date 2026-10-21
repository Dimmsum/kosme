"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Timer,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { ErrorBanner, LoadingCard } from "@/components/admin/DataStates";

type RowStatus =
  | "outstanding"
  | "in_progress"
  | "corrections_requested"
  | "awaiting_client"
  | "awaiting_educator"
  | "verified"
  | "rejected";

interface PracticalRow {
  key: string;
  name: string;
  generic: boolean;
  status: RowStatus;
  service_id: string | null;
}

interface CategoryProgress {
  id: string;
  label: string;
  max_required: number;
  completed: number;
  rows: PracticalRow[];
}

interface ProgressResponse {
  total_required: number;
  total_completed: number;
  categories: CategoryProgress[];
}

type Filter = "all" | "outstanding" | "in_progress" | "awaiting_verification" | "completed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "outstanding", label: "Outstanding" },
  { key: "in_progress", label: "In Progress" },
  { key: "awaiting_verification", label: "Awaiting Verification" },
  { key: "completed", label: "Completed" },
];

// Awaiting-client, corrections and rejected all still need the student's
// attention, so they sit under "In Progress" but keep their own badge.
const FILTER_STATUSES: Record<Exclude<Filter, "all">, RowStatus[]> = {
  outstanding: ["outstanding"],
  in_progress: ["in_progress", "corrections_requested", "awaiting_client", "rejected"],
  awaiting_verification: ["awaiting_educator"],
  completed: ["verified"],
};

const STATUS_BADGE: Record<
  RowStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  verified: { label: "Completed", className: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  awaiting_educator: { label: "Awaiting educator", className: "bg-blue-100 text-blue-700", Icon: Clock },
  awaiting_client: { label: "Awaiting client", className: "bg-amber-100 text-amber-700", Icon: AlertCircle },
  corrections_requested: { label: "Corrections requested", className: "bg-orange-100 text-orange-700", Icon: AlertCircle },
  in_progress: { label: "In progress", className: "bg-k-primary/10 text-k-primary", Icon: Timer },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700", Icon: AlertCircle },
  outstanding: { label: "Outstanding", className: "bg-k-gray-100 text-k-gray-600", Icon: Circle },
};

// Category ids are free text ("Scalp Treatments"), so slug them for DOM ids.
const anchorId = (id: string) => `category-${id.replace(/[^\w-]/g, "-")}`;

function matchesFilter(row: PracticalRow, filter: Filter) {
  return filter === "all" || FILTER_STATUSES[filter].includes(row.status);
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    apiGet<ProgressResponse>("/api/progress")
      .then((res) => {
        setData(res);
        // Deep link from a dashboard ring: /student/progress#category-<id>
        const hash = decodeURIComponent(window.location.hash.replace(/^#category-/, ""));
        if (hash && res.categories.some((c) => c.id === hash)) {
          setExpanded(new Set([hash]));
          requestAnimationFrame(() =>
            document.getElementById(anchorId(hash))?.scrollIntoView({ block: "start" }),
          );
        }
      })
      .catch(() => setError("Could not load your progress. Please try again."));
  }, []);

  const counts = useMemo(() => {
    const all = data?.categories.flatMap((c) => c.rows) ?? [];
    const result = { all: all.length } as Record<Filter, number>;
    for (const f of FILTERS) {
      if (f.key !== "all") result[f.key] = all.filter((r) => matchesFilter(r, f.key)).length;
    }
    return result;
  }, [data]);

  function toggleCategory(id: string) {
    const opening = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    if (opening) {
      // Wait a frame so the section has expanded before scrolling to it.
      requestAnimationFrame(() =>
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link
        href="/student/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline transition-colors hover:text-k-black"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light tracking-tight3 text-k-black sm:text-3xl">
          Required practicals
        </h1>
        <p className="mt-1.5 text-sm text-k-gray-400">
          {data
            ? `${data.total_completed} of ${data.total_required} completed`
            : "Every practical you need to complete, and where each one stands"}
        </p>
      </div>

      {error && <ErrorBanner message={error} />}
      {!data && !error && <LoadingCard label="Loading your practicals…" />}

      {data && (
        <>
          {/* Category cards */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.categories.map((cat) => {
              const open = expanded.has(cat.id);
              const pct = cat.max_required
                ? Math.min(100, Math.round((cat.completed / cat.max_required) * 100))
                : 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  aria-controls={anchorId(cat.id)}
                  className={`rounded-2xl border bg-k-white p-4 text-left transition-all hover:shadow-[0_2px_12px_rgba(59,10,42,0.06)] ${
                    open ? "border-k-primary/40" : "border-k-gray-200"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-k-black">{cat.label}</p>
                  <p className="mt-1 font-serif text-xl text-k-black">
                    {cat.completed}/{cat.max_required}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-k-gray-100">
                    <div className="h-full rounded-full bg-k-primary" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter practicals">
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-k-primary bg-k-primary text-k-white"
                      : "border-k-gray-200 bg-k-white text-k-gray-600 hover:border-k-primary/30"
                  }`}
                >
                  {label}
                  <span className={active ? "text-k-white/70" : "text-k-gray-400"}>{counts[key]}</span>
                </button>
              );
            })}
          </div>

          {/* Category lists */}
          <div className="flex flex-col gap-3">
            {data.categories.map((cat) => {
              const rows = cat.rows.filter((r) => matchesFilter(r, filter));
              // A filter is a cross-category search, so matching categories
              // open themselves; "All" leaves it to the student.
              const filtering = filter !== "all";
              if (filtering && rows.length === 0) return null;
              const open = filtering || expanded.has(cat.id);
              return (
                <section
                  key={cat.id}
                  id={anchorId(cat.id)}
                  ref={(el) => {
                    sectionRefs.current[cat.id] = el;
                  }}
                  className="scroll-mt-4 rounded-3xl border border-k-gray-200 bg-k-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
                  >
                    <h2 className="font-serif text-lg font-light text-k-black">
                      {cat.label}{" "}
                      <span className="text-k-gray-400">
                        — {cat.completed}/{cat.max_required}
                      </span>
                    </h2>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-k-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <ul className="flex flex-col gap-2 px-4 pb-4 sm:px-6 sm:pb-6">
                      {rows.map((row) => {
                        const badge = STATUS_BADGE[row.status];
                        const BadgeIcon = badge.Icon;
                        const inner = (
                          <>
                            <span
                              className={`min-w-0 flex-1 truncate text-sm ${
                                row.generic ? "text-k-gray-600" : "font-medium text-k-black"
                              }`}
                            >
                              {row.name}
                            </span>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}
                            >
                              <BadgeIcon size={11} />
                              {badge.label}
                            </span>
                          </>
                        );
                        return (
                          <li key={row.key}>
                            {row.service_id ? (
                              <Link
                                href={`/student/services/${row.service_id}`}
                                className="flex items-center gap-3 rounded-2xl border border-k-gray-200 px-4 py-3 no-underline transition-colors hover:border-k-primary/30"
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex items-center gap-3 rounded-2xl border border-k-gray-200 px-4 py-3">
                                {inner}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
            {filter !== "all" && counts[filter] === 0 && (
              <p className="py-10 text-center text-sm text-k-gray-400">
                Nothing here yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
