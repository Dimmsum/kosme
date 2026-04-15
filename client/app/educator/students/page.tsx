"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  GraduationCap,
  ChevronDown,
  Sparkles,
  BookOpen,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import { apiGet } from "@/lib/api";

interface Student {
  id: string;
  full_name: string | null;
  institution_name: string | null;
  verified_count: number;
  total_count: number;
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

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("verified") || normalized.includes("approved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("pending")) {
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
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<
    Record<string, StudentDetailService[]>
  >({});

  useEffect(() => {
    apiGet<{ students: Student[] }>("/api/verifications/students")
      .then((res) => setStudents(res.students ?? []))
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
      if (filterMode === "attention") return s.verified_count < s.total_count;
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
    const pendingCount = Math.max(totalServices - totalVerified, 0);
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
                                {service.status}
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
