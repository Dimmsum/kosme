"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  GraduationCap,
  ChevronDown,
  Sparkles,
  BookOpen,
  BadgeCheck,
  Clock3,
  ClipboardCheck,
  Briefcase,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface Student {
  id: string;
  full_name: string | null;
  institution_name: string | null;
  verified_count: number;
  total_count: number;
  awaiting_educator_count: number;
  awaiting_client_count: number;
}

interface ConfirmationRow {
  status: "pending" | "confirmed" | "disputed";
  created_at: string;
  updated_at: string | null;
}

// confirmations.service_id is UNIQUE, so PostgREST may embed one object or an array.
type ConfirmationEmbed = ConfirmationRow | ConfirmationRow[] | null;

function confirmationOf(value: ConfirmationEmbed): ConfirmationRow | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

interface QueueItem {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  ended_at: string | null;
  actual_duration_min: number | null;
  adjusted_duration_min: number | null;
  student: { id: string; full_name: string | null } | null;
  client: { id: string; full_name: string | null } | null;
  confirmations: ConfirmationEmbed;
  service_photos: Array<{ id: string }>;
}

interface AwaitingClientItem {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  ended_at: string | null;
  student: { id: string; full_name: string | null } | null;
  client: { id: string; full_name: string | null } | null;
  confirmations: ConfirmationEmbed;
}

interface StudentDetailService {
  id: string;
  name: string;
  category_id: string;
  notes: string | null;
  status: string;
  created_at: string;
  client: { id: string; full_name: string | null } | null;
  service_photos: Array<{ id: string; type: "before" | "after"; url: string }>;
}

interface StudentDetailResponse {
  student: {
    id: string;
    full_name: string | null;
    institution_id: string | null;
    institutions: { name: string } | null;
  };
  services: StudentDetailService[];
}

type FilterMode = "all" | "attention" | "complete";

function initialsFromName(name: string | null): string {
  const safe = (name ?? "Student").trim();
  return safe
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  awaiting_client: "Awaiting client",
  awaiting_educator: "Ready for verification",
  corrections_requested: "Corrections requested",
  verified: "Verified",
  rejected: "Rejected",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function formatMinutes(min: number | null): string {
  if (min === null) return "Not timed";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("awaiting_client") || normalized.includes("in_progress")) {
    return "bg-k-gray-100 text-k-gray-600";
  }
  if (normalized.includes("corrections")) {
    return "bg-orange-100 text-orange-700";
  }
  if (normalized.includes("verified") || normalized.includes("approved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("pending") || normalized.includes("awaiting")) {
    return "bg-amber-100 text-amber-700";
  }
  if (normalized.includes("rejected")) {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-k-primary/10 text-k-primary";
}

function PhotoStrip({
  photos,
}: {
  photos: Array<{ id: string; type: "before" | "after"; url: string }>;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-k-gray-400">
        Images
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block aspect-square overflow-hidden rounded-xl border border-k-gray-200 bg-k-white"
          >
            <img
              src={photo.url}
              alt={`${photo.type} photo`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [awaitingClient, setAwaitingClient] = useState<AwaitingClientItem[]>([]);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<
    Record<string, StudentDetailService[]>
  >({});

  useEffect(() => {
    Promise.all([
      apiGet<{ students: Student[] }>("/api/verifications/students"),
      apiGet<{ pending: QueueItem[] }>("/api/verifications/pending"),
      apiGet<{ awaiting: AwaitingClientItem[] }>(
        "/api/verifications/awaiting-client",
      ),
    ])
      .then(([studentsRes, pendingRes, awaitingRes]) => {
        setStudents(studentsRes.students ?? []);
        setQueue(pendingRes.pending ?? []);
        setAwaitingClient(awaitingRes.awaiting ?? []);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load students.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        search === "" ||
        (s.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.institution_name ?? "").toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filterMode === "attention") return s.awaiting_educator_count > 0;
      if (filterMode === "complete") {
        return s.total_count > 0 && s.verified_count >= s.total_count;
      }
      return true;
    });
  }, [students, search, filterMode]);

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const totalServices = students.reduce((acc, s) => acc + s.total_count, 0);
    const totalVerified = students.reduce(
      (acc, s) => acc + s.verified_count,
      0,
    );
    // Only services ready for an educator decision count as pending reviews;
    // awaiting-client work is still with the student/client.
    const pendingCount = students.reduce(
      (acc, s) => acc + s.awaiting_educator_count,
      0,
    );
    const completionRate =
      totalServices === 0
        ? 0
        : Math.round((totalVerified / Math.max(totalServices, 1)) * 100);

    return {
      totalStudents,
      totalServices,
      totalVerified,
      pendingCount,
      completionRate,
    };
  }, [students]);

  const toggleStudent = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(studentId);
    if (studentDetails[studentId]) return;

    setDetailLoadingId(studentId);
    try {
      const detail = await apiGet<StudentDetailResponse>(
        `/api/verifications/students/${studentId}`,
      );
      setStudentDetails((prev) => ({
        ...prev,
        [studentId]: detail.services ?? [],
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load student details.";
      setError(message);
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <div className="relative overflow-hidden px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-[#f5efe8] via-[#faf8f4] to-transparent" />
      <div className="pointer-events-none absolute -right-20 top-8 -z-10 h-52 w-52 rounded-full bg-[#f2dfc9]/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-16 -z-10 h-44 w-44 rounded-full bg-[#ffd7ea]/40 blur-3xl" />

      <section className="animate-fade-up rounded-3xl border border-k-gray-200 bg-k-white/85 p-5 backdrop-blur sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-k-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-k-primary">
              <Sparkles size={12} />
              Educator Workspace
            </p>
            <h1 className="mt-3 font-serif text-3xl font-light leading-tight text-k-black sm:text-4xl">
              Student Verification Studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-k-gray-400 sm:text-base">
              Track progress, review submissions, and focus on students who need
              your guidance next.
            </p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <div className="w-full rounded-2xl border border-k-gray-200 bg-k-gray-100/60 p-4 sm:w-auto sm:min-w-[220px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-k-gray-400">
              Completion Rate
            </p>
            <p className="mt-1 font-serif text-3xl text-k-black">
              {summary.completionRate}%
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-k-gray-200">
              <div
                className="h-full rounded-full bg-k-primary transition-all duration-700"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-k-gray-400">
              {summary.totalVerified}/{summary.totalServices} services verified
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="animate-fade-up rounded-2xl border border-k-gray-200 bg-k-white p-4 [animation-delay:120ms]">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
            <GraduationCap size={16} />
          </div>
          <p className="font-serif text-2xl text-k-black">
            {summary.totalStudents}
          </p>
          <p className="text-xs text-k-gray-400">Assigned Students</p>
        </div>

        <div className="animate-fade-up rounded-2xl border border-k-gray-200 bg-k-white p-4 [animation-delay:200ms]">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <BookOpen size={16} />
          </div>
          <p className="font-serif text-2xl text-k-black">
            {summary.totalServices}
          </p>
          <p className="text-xs text-k-gray-400">Total Submissions</p>
        </div>

        <div className="animate-fade-up rounded-2xl border border-k-gray-200 bg-k-white p-4 [animation-delay:280ms]">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <BadgeCheck size={16} />
          </div>
          <p className="font-serif text-2xl text-k-black">
            {summary.totalVerified}
          </p>
          <p className="text-xs text-k-gray-400">Verified Services</p>
        </div>

        <div className="animate-fade-up rounded-2xl border border-k-gray-200 bg-k-white p-4 [animation-delay:360ms]">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock3 size={16} />
          </div>
          <p className="font-serif text-2xl text-k-black">
            {summary.pendingCount}
          </p>
          <p className="text-xs text-k-gray-400">Pending Reviews</p>
        </div>
      </section>

      {/* Verification queue — only services at "Ready for Educator Verification".
          Everything listed here needs an educator decision. */}
      <section className="mt-5 overflow-hidden rounded-3xl border border-k-gray-200 bg-k-white">
        <div className="flex items-center justify-between gap-3 border-b border-k-gray-200 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ClipboardCheck size={15} />
            </div>
            <div>
              <h2 className="font-serif text-lg text-k-black">
                Ready for Educator Verification
              </h2>
              <p className="text-xs text-k-gray-400">
                Client-confirmed work waiting on your decision.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
            {queue.length}
          </span>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-k-gray-400">
            Loading verification queue...
          </p>
        ) : queue.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-k-gray-400">
            Nothing is waiting for verification.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-k-gray-200 text-[10px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Date Completed</th>
                  <th className="px-3 py-3">Client Confirmed</th>
                  <th className="px-3 py-3">Evidence</th>
                  <th className="px-3 py-3">Logged Time</th>
                  <th className="px-3 py-3">Verification Status</th>
                  <th className="px-5 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const confirmation = confirmationOf(item.confirmations);
                  const confirmedOn =
                    confirmation?.status === "confirmed"
                      ? formatDate(confirmation.updated_at ?? confirmation.created_at)
                      : null;
                  const minutes =
                    item.adjusted_duration_min ?? item.actual_duration_min;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-k-gray-200 last:border-0"
                    >
                      <td className="px-5 py-3.5 font-medium text-k-black">
                        {item.student?.full_name ?? "Unknown student"}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-k-black">{item.name}</p>
                        <p className="text-xs text-k-gray-400">
                          {item.category_id}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-k-gray-600">
                        {formatDate(item.ended_at ?? item.created_at)}
                      </td>
                      <td className="px-3 py-3.5 text-k-gray-600">
                        {!item.client
                          ? "No client"
                          : confirmedOn
                            ? `Yes · ${confirmedOn}`
                            : "—"}
                      </td>
                      <td className="px-3 py-3.5 text-k-gray-600">
                        {item.service_photos.length} photo
                        {item.service_photos.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-3 py-3.5 text-k-gray-600">
                        {formatMinutes(minutes)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                          Ready for review
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/educator/verify?service=${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-k-white no-underline transition-colors hover:bg-k-primary-light"
                        >
                          Review <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Monitoring only: still with the client, so deliberately outside the queue. */}
      {awaitingClient.length > 0 && (
        <section className="mt-4 rounded-3xl border border-k-gray-200 bg-k-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-k-black">
                Pending Client Confirmation
              </h2>
              <p className="text-xs text-k-gray-400">
                For visibility only. These move into the queue once the client
                confirms and the student submits.
              </p>
            </div>
            <span className="rounded-full bg-k-gray-100 px-3 py-0.5 text-xs font-medium text-k-gray-600">
              {awaitingClient.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {awaitingClient.map((item) => {
              const confirmed =
                confirmationOf(item.confirmations)?.status === "confirmed";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-k-gray-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-k-gray-400">
                      {item.student?.full_name ?? "Student"} &middot;{" "}
                      {item.client?.full_name ?? "Client"} &middot;{" "}
                      {formatDate(item.ended_at ?? item.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-k-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-k-gray-600">
                    {confirmed ? "Awaiting student submission" : "Awaiting client"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <h2 className="mt-8 font-serif text-xl text-k-black">Student Activity</h2>

      <section className="mt-5 rounded-3xl border border-k-gray-200 bg-k-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400"
            />
            <input
              type="text"
              placeholder="Search by student or institution..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-k-gray-200 bg-k-white py-2.5 pl-10 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterMode === "all"
                  ? "bg-k-primary text-k-white"
                  : "bg-k-gray-100 text-k-gray-600 hover:bg-k-gray-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("attention")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterMode === "attention"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              Needs Attention
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("complete")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterMode === "complete"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              Fully Verified
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading students...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              No students match this search or filter.
            </p>
          </div>
        ) : (
          filtered.map((student, idx) => {
            const isExpanded = expandedStudentId === student.id;
            const services = studentDetails[student.id] ?? [];
            const total = Math.max(student.total_count, 1);
            const completion = Math.round(
              (student.verified_count / total) * 100,
            );

            return (
              <article
                key={student.id}
                className="animate-fade-up overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <button
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className="group w-full px-4 py-4 text-left transition-colors hover:bg-k-gray-100/40 sm:px-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                      <span className="text-sm font-semibold">
                        {initialsFromName(student.full_name)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-k-black sm:text-base">
                          {student.full_name ?? "Unnamed Student"}
                        </p>
                        <span className="rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-k-gray-500">
                          {student.verified_count}/{student.total_count}{" "}
                          verified
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-k-gray-400">
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap size={12} />
                          {student.institution_name ?? "No institution listed"}
                        </span>
                        <span>{student.total_count} submissions</span>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-k-gray-200">
                        <div
                          className="h-full rounded-full bg-k-primary transition-all duration-700"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-1 shrink-0">
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-k-primary" />
                      ) : (
                        <ChevronRight
                          size={18}
                          className="text-k-gray-400 transition-colors group-hover:text-k-primary"
                        />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-k-gray-200 bg-k-gray-100/40 px-4 py-4 sm:px-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-k-gray-600">
                        {student.verified_count}/{student.total_count} verified
                        {student.awaiting_educator_count > 0 &&
                          ` · ${student.awaiting_educator_count} ready for review`}
                        {student.awaiting_client_count > 0 &&
                          ` · ${student.awaiting_client_count} awaiting client`}
                      </p>
                      <Link
                        href={`/educator/students/${student.id}/portfolio`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-k-white no-underline transition-colors hover:bg-k-primary-light"
                      >
                        <Briefcase size={12} />
                        View Portfolio
                      </Link>
                    </div>
                    {detailLoadingId === student.id ? (
                      <p className="text-xs text-k-gray-400">
                        Loading student details...
                      </p>
                    ) : services.length === 0 ? (
                      <p className="text-xs text-k-gray-400">
                        No services submitted yet.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className="rounded-2xl border border-k-gray-200 bg-k-white p-3 sm:p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-k-black sm:text-base">
                                  {service.name}
                                </p>
                                <p className="mt-0.5 text-xs text-k-gray-400">
                                  {service.category_id} •{" "}
                                  {formatDate(service.created_at)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(service.status)}`}
                              >
                                {statusLabel(service.status)}
                              </span>
                            </div>

                            {service.notes && (
                              <p className="mt-2 rounded-xl bg-k-gray-100 px-3 py-2 text-xs text-k-gray-600">
                                {service.notes}
                              </p>
                            )}

                            <div className="mt-2 flex flex-col gap-1.5 text-xs text-k-gray-400 sm:flex-row sm:items-center sm:justify-between">
                              <p className="truncate">
                                Client:{" "}
                                {service.client?.full_name ?? "Not assigned"}
                              </p>
                              <p>
                                {service.service_photos.length} image
                                {service.service_photos.length === 1 ? "" : "s"}
                              </p>
                            </div>

                            <PhotoStrip photos={service.service_photos} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
