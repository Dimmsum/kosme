"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatHours } from "@/lib/hours";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

type Tag = "under" | "within" | "over";
type TagCounts = Record<Tag, number>;

interface CohortRow {
  cohort_id: string | null;
  cohort_name: string;
  programme_name: string | null;
  students: number;
  verified_services: number;
  verified_minutes: number;
  pending_verifications: number;
}

interface Reports {
  pipeline: Record<string, number>;
  totals: { verified_services: number; verified_minutes: number; untimed_verified: number };
  cohorts: CohortRow[];
  timing: {
    overall: TagCounts;
    untagged: number;
    weekly: ({ week_start: string } & TagCounts)[];
  };
}

// Same pipeline order + status colors as the student/admin submission views.
const PIPELINE: { key: string; label: string; badge: string }[] = [
  { key: "in_progress", label: "In progress", badge: "bg-blue-50 text-blue-700" },
  { key: "awaiting_client", label: "Awaiting client", badge: "bg-amber-50 text-amber-700" },
  { key: "awaiting_educator", label: "Awaiting educator", badge: "bg-amber-50 text-amber-700" },
  { key: "corrections_requested", label: "Corrections requested", badge: "bg-amber-50 text-amber-700" },
  { key: "verified", label: "Verified", badge: "bg-emerald-50 text-emerald-700" },
  { key: "rejected", label: "Rejected", badge: "bg-red-50 text-red-600" },
];

// Timing tags reuse the educator verify page's duration_tag colors
// (amber under / emerald within / red over), always paired with a label.
const TAGS: { key: Tag; label: string; fill: string }[] = [
  { key: "under", label: "Under range", fill: "bg-amber-600" },
  { key: "within", label: "Within range", fill: "bg-emerald-600" },
  { key: "over", label: "Over range", fill: "bg-red-600" },
];

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function weekLabel(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function AdminReportsPage() {
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [includeDemo, setIncludeDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeDemo ? "?include_demo=true" : "";
      setData(await apiGet<Reports>(`/api/admin/reports${qs}`));
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load reports."));
    } finally {
      setLoading(false);
    }
  }, [includeDemo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Reports & Analytics"
        subtitle="Verified hours by cohort, the verification pipeline, and timing against recommended durations."
        action={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-k-gray-600">
            <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} />
            Include demo
          </label>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading && !data ? (
        <LoadingCard label="Loading reports…" />
      ) : data ? (
        <div className={`flex flex-col gap-8 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
          <HeadlineTiles data={data} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <PipelineCard pipeline={data.pipeline} />
            <div className="lg:col-span-2">
              <TimingCard timing={data.timing} />
            </div>
          </div>
          <CohortTable cohorts={data.cohorts} />
        </div>
      ) : null}
    </div>
  );
}

function HeadlineTiles({ data }: { data: Reports }) {
  const tiles = [
    {
      label: "Verified hours",
      value: formatHours(data.totals.verified_minutes),
      note:
        data.totals.untimed_verified > 0
          ? `${data.totals.untimed_verified} verified service${data.totals.untimed_verified === 1 ? "" : "s"} untimed`
          : null,
      icon: Clock,
    },
    { label: "Verified services", value: data.totals.verified_services.toLocaleString(), note: null, icon: CheckCircle2 },
    {
      label: "Pending verification",
      value: (data.pipeline.awaiting_educator ?? 0).toLocaleString(),
      note: null,
      icon: ClipboardList,
    },
    {
      label: "Corrections requested",
      value: (data.pipeline.corrections_requested ?? 0).toLocaleString(),
      note: null,
      icon: RotateCcw,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ label, value, note, icon: Icon }) => (
        <div key={label} className="flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-6 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-semibold text-k-black">{value}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-k-gray-400">{label}</p>
            {note && <p className="mt-0.5 truncate text-xs text-k-gray-400">{note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineCard({ pipeline }: { pipeline: Record<string, number> }) {
  const max = Math.max(1, ...PIPELINE.map((p) => pipeline[p.key] ?? 0));

  return (
    <section className="h-full rounded-3xl border border-k-gray-200 bg-k-white p-6">
      <h2 className="mb-1 font-serif text-lg font-light text-k-black">Verification pipeline</h2>
      <p className="mb-5 text-xs text-k-gray-400">Services by current status.</p>
      <ul className="flex flex-col gap-3">
        {PIPELINE.map((p) => {
          const count = pipeline[p.key] ?? 0;
          return (
            <li key={p.key} title={`${p.label}: ${count}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.badge}`}>{p.label}</span>
                <span className="text-sm font-medium text-k-black">{count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-k-gray-100">
                <div
                  className="h-full rounded-full bg-k-primary transition-all duration-200"
                  style={{ width: count ? `${Math.max(2, (count / max) * 100)}%` : 0 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TimingCard({ timing }: { timing: Reports["timing"] }) {
  const total = TAGS.reduce((n, t) => n + timing.overall[t.key], 0);
  const weekMax = Math.max(1, ...timing.weekly.map((w) => w.under + w.within + w.over));
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="rounded-3xl border border-k-gray-200 bg-k-white p-6">
      <h2 className="mb-1 font-serif text-lg font-light text-k-black">Timing trends</h2>
      <p className="mb-5 text-xs text-k-gray-400">
        Timed services compared against their service type&apos;s recommended duration.
        {timing.untagged > 0 && ` ${timing.untagged} timed service${timing.untagged === 1 ? " has" : "s have"} no recommended range.`}
      </p>

      {total === 0 ? (
        <EmptyCard label="No timed services with a recommended range yet." />
      ) : (
        <>
          {/* Legend doubles as the all-time breakdown (counts + share). */}
          <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
            {TAGS.map((t) => (
              <li key={t.key} className="flex items-center gap-2 text-sm text-k-gray-600">
                <span className={`h-2.5 w-2.5 rounded-full ${t.fill}`} />
                {t.label}
                <span className="font-medium text-k-black">{timing.overall[t.key]}</span>
                <span className="text-xs text-k-gray-400">
                  {Math.round((timing.overall[t.key] / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>

          <div className="mb-8 flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
            {TAGS.filter((t) => timing.overall[t.key] > 0).map((t) => (
              <div
                key={t.key}
                className={t.fill}
                style={{ flexGrow: timing.overall[t.key] }}
                title={`${t.label}: ${timing.overall[t.key]}`}
              />
            ))}
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-k-gray-400">
            Last {timing.weekly.length} weeks · by week stopped
          </p>
          <div className="flex h-40 items-end gap-2 border-b border-k-gray-200 sm:gap-3">
            {timing.weekly.map((w, i) => {
              const weekTotal = w.under + w.within + w.over;
              return (
                <div
                  key={w.week_start}
                  tabIndex={0}
                  aria-label={`Week of ${weekLabel(w.week_start)}: ${w.under} under, ${w.within} within, ${w.over} over`}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className="relative flex h-full flex-1 flex-col justify-end outline-none"
                >
                  {hovered === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-2xl border border-k-gray-200 bg-k-white px-3 py-2 text-xs shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
                      <p className="mb-1 font-medium text-k-black">Week of {weekLabel(w.week_start)}</p>
                      {TAGS.map((t) => (
                        <p key={t.key} className="flex items-center justify-between gap-2 text-k-gray-600">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${t.fill}`} />
                            {t.label}
                          </span>
                          <span className="font-medium text-k-black">{w[t.key]}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {weekTotal > 0 && (
                    <>
                      <span className="mb-1 text-center text-xs text-k-gray-400">{weekTotal}</span>
                      <div
                        className={`flex w-full flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] transition-opacity duration-200 ${
                          hovered !== null && hovered !== i ? "opacity-50" : ""
                        }`}
                        style={{ height: `${(weekTotal / weekMax) * 100}%` }}
                      >
                        {TAGS.filter((t) => w[t.key] > 0).map((t) => (
                          <div key={t.key} className={t.fill} style={{ flexGrow: w[t.key] }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">
            {timing.weekly.map((w) => (
              <span key={w.week_start} className="flex-1 truncate text-center text-[0.65rem] text-k-gray-400">
                {weekLabel(w.week_start)}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CohortTable({ cohorts }: { cohorts: CohortRow[] }) {
  const maxMinutes = Math.max(1, ...cohorts.map((c) => c.verified_minutes));

  return (
    <section>
      <h2 className="mb-1 font-serif text-lg font-light text-k-black">Verified hours by cohort</h2>
      <p className="mb-4 text-xs text-k-gray-400">
        Educator-adjusted duration where set, otherwise the student&apos;s timed duration.
      </p>
      {cohorts.length === 0 ? (
        <EmptyCard label="No cohorts yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-k-gray-200 bg-k-gray-100/50 text-xs uppercase tracking-wide text-k-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Cohort</th>
                  <th className="px-5 py-3 text-right font-medium">Students</th>
                  <th className="px-5 py-3 font-medium">Verified hours</th>
                  <th className="px-5 py-3 text-right font-medium">Verified services</th>
                  <th className="px-5 py-3 text-right font-medium">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-k-gray-200">
                {cohorts.map((c) => (
                  <tr key={c.cohort_id ?? "none"} className="hover:bg-k-gray-100/40">
                    <td className="px-5 py-3">
                      <p className={c.cohort_id ? "font-medium text-k-black" : "italic text-k-gray-600"}>
                        {c.cohort_name}
                      </p>
                      {c.programme_name && <p className="text-xs text-k-gray-400">{c.programme_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-right text-k-gray-600">{c.students}</td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-[160px] items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-k-gray-100">
                          <div
                            className="h-full rounded-full bg-k-primary"
                            style={{ width: c.verified_minutes ? `${Math.max(2, (c.verified_minutes / maxMinutes) * 100)}%` : 0 }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium text-k-black">{formatHours(c.verified_minutes)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-k-gray-600">{c.verified_services}</td>
                    <td className="px-5 py-3 text-right">
                      {c.pending_verifications > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          {c.pending_verifications}
                        </span>
                      ) : (
                        <span className="text-k-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
