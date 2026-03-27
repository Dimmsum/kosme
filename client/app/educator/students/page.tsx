"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, GraduationCap, ChevronDown } from "lucide-react";
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
  status: string;
  created_at: string;
  client: { id: string; full_name: string | null } | null;
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

export default function StudentsPage() {
  const [search, setSearch] = useState("");
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

  const filtered = students.filter(
    (s) =>
      search === "" ||
      (s.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.institution_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

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
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          My Students
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {students.length} students assigned
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400"
          />
          <input
            type="text"
            placeholder="Search students or programmes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-k-gray-200 bg-k-white py-2.5 pl-10 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary"
          />
        </div>
      </div>

      {/* Students list */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading students...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              No students match your search.
            </p>
          </div>
        ) : (
          filtered.map((student) => {
            const isExpanded = expandedStudentId === student.id;
            const services = studentDetails[student.id] ?? [];

            return (
              <div
                key={student.id}
                className="rounded-2xl border border-k-gray-200 bg-k-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-k-gray-100/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                    <span className="text-sm font-semibold text-k-primary">
                      {initialsFromName(student.full_name)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-k-black">
                      {student.full_name ?? "Unnamed Student"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-k-gray-400">
                      <GraduationCap size={12} />
                      {student.institution_name ?? "No institution listed"}
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1.5">
                    <span className="rounded-full bg-k-primary/10 px-3 py-0.5 text-xs font-medium text-k-primary">
                      {student.verified_count}/
                      {Math.max(student.total_count, 1)} services
                    </span>
                    <span className="text-[10px] text-k-gray-400">
                      {student.total_count} total submissions
                    </span>
                  </div>

                  <div className="sm:hidden flex flex-col items-end gap-0.5">
                    <span className="text-xs font-medium text-k-primary">
                      {student.verified_count}/
                      {Math.max(student.total_count, 1)}
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-k-primary transition-colors"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-k-gray-400 group-hover:text-k-primary transition-colors"
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-k-gray-200 bg-k-gray-100/40 px-5 py-4">
                    {detailLoadingId === student.id ? (
                      <p className="text-xs text-k-gray-400">
                        Loading student details...
                      </p>
                    ) : services.length === 0 ? (
                      <p className="text-xs text-k-gray-400">
                        No services submitted yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center justify-between rounded-xl border border-k-gray-200 bg-k-white px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-k-black truncate">
                                {service.name}
                              </p>
                              <p className="text-xs text-k-gray-400 mt-0.5">
                                {service.category_id} ·{" "}
                                {new Date(
                                  service.created_at,
                                ).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                            <span className="ml-3 shrink-0 rounded-full bg-k-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-k-primary">
                              {service.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
