"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ImageOff, Loader2, MapPin, Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { AvailabilityWindow, DAYS, Day } from "@/lib/appointments";

interface FeedPhoto {
  id: string;
  type: "before" | "after";
  url: string;
}

interface FeedItem {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  service_photos: FeedPhoto[];
}

interface FeedResponse {
  feed: FeedItem[];
  nextCursor: string | null;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ServiceCard({ item }: { item: FeedItem }) {
  const before = item.service_photos.filter((p) => p.type === "before");
  const after = item.service_photos.filter((p) => p.type === "after");
  const hasPhotos = item.service_photos.length > 0;
  const canViewPortfolio = Boolean(item.student?.id);
  const portfolioHref = canViewPortfolio
    ? `/volunteer/browse/${item.student!.id}`
    : "/volunteer/browse";

  return (
    <div className="overflow-hidden rounded-3xl border border-k-gray-200 bg-k-white">
      {/* Card header — student identity */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link
          href={portfolioHref}
          className="flex items-center gap-3 no-underline group"
          aria-disabled={!canViewPortfolio}
          onClick={(e) => {
            if (!canViewPortfolio) e.preventDefault();
          }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10 ring-2 ring-transparent transition-all group-hover:ring-k-primary/30">
            <span className="text-sm font-semibold text-k-primary">
              {initials(item.student?.full_name)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-k-black group-hover:text-k-primary transition-colors leading-tight">
              {item.student?.full_name ?? "Student"}
            </p>
            <p className="text-xs text-k-gray-400">
              {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </Link>
        <span className="rounded-full bg-k-gray-100 px-3 py-1 text-xs font-medium text-k-gray-600">
          {item.category_id}
        </span>
      </div>

      {/* Service name */}
      <div className="px-5 pb-3">
        <p className="font-serif text-lg font-light text-k-black leading-snug">
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={12} />
          <span>Verified</span>
        </div>
      </div>

      {/* Photos */}
      {hasPhotos ? (
        <div className="px-5 pb-5">
          {before.length > 0 && after.length > 0 ? (
            /* Before & after side by side */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  Before
                </p>
                <div className="flex flex-col gap-1.5">
                  {before.slice(0, 2).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={p.url}
                        alt="Before"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  After
                </p>
                <div className="flex flex-col gap-1.5">
                  {after.slice(0, 2).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={p.url}
                        alt="After"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Only one type — grid */
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {item.service_photos.slice(0, 6).map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-xl"
                >
                  <img
                    src={p.url}
                    alt={p.type}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-5 pb-5 text-k-gray-300">
          <ImageOff size={18} />
          <span className="text-xs">No photos</span>
        </div>
      )}

      {/* Footer — view full portfolio */}
      <div className="border-t border-k-gray-100 px-5 py-3">
        {canViewPortfolio ? (
          <Link
            href={portfolioHref}
            className="text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View {item.student?.full_name?.split(" ")[0] ?? "student"}'s full
            portfolio →
          </Link>
        ) : (
          <p className="text-xs font-medium text-k-gray-400">
            Portfolio details unavailable for this entry
          </p>
        )}
      </div>
    </div>
  );
}

function PortfolioFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (cursor?: string) => {
    const path = cursor
      ? `/api/portfolio/feed?cursor=${encodeURIComponent(cursor)}`
      : "/api/portfolio/feed";

    const res = await apiGet<FeedResponse>(path);
    return res;
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage()
      .then((res) => {
        setItems(res.feed);
        setNextCursor(res.nextCursor);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load feed.");
      })
      .finally(() => setLoading(false));
  }, [fetchPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!nextCursor || loadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setLoadingMore(true);
        fetchPage(nextCursor)
          .then((res) => {
            setItems((prev) => [...prev, ...res.feed]);
            setNextCursor(res.nextCursor);
          })
          .catch((err: unknown) => {
            setError(
              err instanceof Error ? err.message : "Failed to load more.",
            );
          })
          .finally(() => setLoadingMore(false));
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchPage]);

  return (
    <div>
      {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl bg-k-gray-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-20 text-center">
          <p className="text-sm text-k-gray-400">
            No verified work to display yet.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-5 max-w-xl mx-auto">
            {items.map((item) => (
              <ServiceCard key={item.id} item={item} />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          <div
            ref={sentinelRef}
            className="h-16 flex items-center justify-center"
          >
            {loadingMore && (
              <Loader2 size={20} className="animate-spin text-k-gray-400" />
            )}
            {!nextCursor && !loadingMore && items.length > 0 && (
              <p className="text-xs text-k-gray-400">You've seen everything.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface DirectoryStudent {
  id: string;
  full_name: string | null;
  institution_id: string | null;
  institution_name: string | null;
  verified_count: number;
  categories: string[];
  location: string | null;
  willing_to_travel: boolean;
  availability: AvailabilityWindow[];
}

interface DirectoryResponse {
  students: DirectoryStudent[];
  filters: { institutions: { id: string; name: string }[]; categories: string[] };
}

function availabilitySummary(windows: AvailabilityWindow[]) {
  const days = DAYS.filter((d) => windows.some((w) => w.day === d.key)).map((d) => d.label.slice(0, 3));
  return days.length ? days.join(", ") : "Flexible";
}

function StudentCard({ student }: { student: DirectoryStudent }) {
  return (
    <Link
      href={`/volunteer/browse/${student.id}`}
      className="block rounded-3xl border border-k-gray-200 bg-k-white p-5 no-underline transition-colors hover:border-k-primary/30"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
          <span className="text-sm font-semibold text-k-primary">{initials(student.full_name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-k-black">{student.full_name ?? "Student"}</p>
              {student.institution_name && (
                <p className="truncate text-xs text-k-gray-400">{student.institution_name}</p>
              )}
            </div>
            {student.verified_count > 0 ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 size={11} />
                {student.verified_count} verified
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-k-gray-600">
                New
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-k-gray-600">
            {student.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-k-gray-400" />
                {student.location}
                {student.willing_to_travel ? " · will travel" : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarClock size={12} className="text-k-gray-400" />
              {availabilitySummary(student.availability)}
            </span>
          </div>

          {student.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {student.categories.slice(0, 6).map((c) => (
                <span key={c} className="rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[11px] text-k-gray-600">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Steps 1-2 of the journey: pick a service, then browse the students who offer it. */
function StudentDirectory() {
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [options, setOptions] = useState<DirectoryResponse["filters"]>({ institutions: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [institution, setInstitution] = useState("");
  const [day, setDay] = useState<"" | Day>("");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  // Text boxes are debounced so we don't hit the API on every keystroke.
  const [typed, setTyped] = useState({ location: "", query: "" });

  useEffect(() => {
    const t = setTimeout(() => {
      setLocation(typed.location);
      setQuery(typed.query);
    }, 300);
    return () => clearTimeout(t);
  }, [typed]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (institution) params.set("institution_id", institution);
    if (day) params.set("day", day);
    if (location.trim()) params.set("location", location.trim());
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();

    let current = true;
    apiGet<DirectoryResponse>(`/api/portfolio/students${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!current) return;
        setStudents(res.students);
        setOptions(res.filters);
        setError(null);
      })
      .catch(() => current && setError("Could not load students."))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [category, institution, day, location, query]);

  const field =
    "rounded-xl border border-k-gray-200 bg-k-white px-3 py-2 text-sm text-k-black outline-none transition-colors focus:border-k-primary";
  const filtered = !!(category || institution || day || location.trim() || query.trim());

  return (
    <div>
      {/* 1. Which service? */}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
        What service would you like?
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {["", ...options.categories].map((c) => (
          <button
            key={c || "all"}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              category === c
                ? "border-k-primary bg-k-primary text-k-white"
                : "border-k-gray-200 bg-k-white text-k-gray-600 hover:border-k-primary/30"
            }`}
          >
            {c || "Any service"}
          </button>
        ))}
      </div>

      {/* 2. Narrow down the students */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-k-gray-400" />
          <input
            value={typed.query}
            onChange={(e) => setTyped((t) => ({ ...t, query: e.target.value }))}
            placeholder="Search by name"
            aria-label="Search by name"
            className={`${field} w-full pl-9`}
          />
        </div>
        <input
          value={typed.location}
          onChange={(e) => setTyped((t) => ({ ...t, location: e.target.value }))}
          placeholder="Location"
          aria-label="Location"
          className={field}
        />
        <select value={day} onChange={(e) => setDay(e.target.value as "" | Day)} aria-label="Available on" className={field}>
          <option value="">Any day</option>
          {DAYS.map((d) => (
            <option key={d.key} value={d.key}>
              Available {d.label}
            </option>
          ))}
        </select>
        <select
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          aria-label="Institution"
          className={field}
        >
          <option value="">Any institution</option>
          {options.institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-k-gray-100" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <p className="text-sm text-k-gray-400">
            {filtered ? "No students match those filters. Try widening your search." : "No students are listed yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

type View = "students" | "work";

export default function FindServicePage() {
  const [view, setView] = useState<View>("students");

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Find a Service</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Choose a service, find a student, check their verified portfolio, then request an appointment.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2" role="tablist">
        {(
          [
            ["students", "Find a student"],
            ["work", "Recent verified work"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              view === key
                ? "bg-k-primary text-k-white"
                : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "students" ? <StudentDirectory /> : <PortfolioFeed />}
    </div>
  );
}
