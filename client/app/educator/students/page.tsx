"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, GraduationCap } from "lucide-react";
import { apiGet } from "@/lib/api";

interface Student {
  id: string;
  full_name: string | null;
  institution_name: string | null;
  verified_count: number;
  total_count: number;
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
          filtered.map((student) => (
            <div
              key={student.id}
              className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20 cursor-pointer"
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
                  {student.verified_count}/{Math.max(student.total_count, 1)}{" "}
                  services
                </span>
                <span className="text-[10px] text-k-gray-400">
                  {student.total_count} total submissions
                </span>
              </div>

              {/* Mobile-only compact progress */}
              <div className="sm:hidden flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-k-primary">
                  {student.verified_count}/{Math.max(student.total_count, 1)}
                </span>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 text-k-gray-400 group-hover:text-k-primary transition-colors"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
