"use client";

import { useState } from "react";
import { Search, ChevronRight, GraduationCap } from "lucide-react";

const students = [
  {
    id: 1,
    name: "Maya Thompson",
    initials: "MT",
    programme: "Level 3 Cosmetology",
    progress: "29/40",
    progressPercent: 73,
    lastActive: "20 Mar 2026",
  },
  {
    id: 2,
    name: "Aisha Patel",
    initials: "AP",
    programme: "Level 3 Cosmetology",
    progress: "34/40",
    progressPercent: 85,
    lastActive: "19 Mar 2026",
  },
  {
    id: 3,
    name: "Jade Foster",
    initials: "JF",
    programme: "Level 2 Hairdressing",
    progress: "18/30",
    progressPercent: 60,
    lastActive: "18 Mar 2026",
  },
  {
    id: 4,
    name: "Lena Kim",
    initials: "LK",
    programme: "Level 3 Cosmetology",
    progress: "22/40",
    progressPercent: 55,
    lastActive: "17 Mar 2026",
  },
  {
    id: 5,
    name: "Priya Mehta",
    initials: "PM",
    programme: "Level 2 Hairdressing",
    progress: "26/30",
    progressPercent: 87,
    lastActive: "16 Mar 2026",
  },
  {
    id: 6,
    name: "Sophie Clarke",
    initials: "SC",
    programme: "Level 3 Cosmetology",
    progress: "15/40",
    progressPercent: 38,
    lastActive: "15 Mar 2026",
  },
  {
    id: 7,
    name: "Fatima Begum",
    initials: "FB",
    programme: "Level 2 Hairdressing",
    progress: "28/30",
    progressPercent: 93,
    lastActive: "14 Mar 2026",
  },
  {
    id: 8,
    name: "Emma Watson",
    initials: "EW",
    programme: "Level 3 Cosmetology",
    progress: "10/40",
    progressPercent: 25,
    lastActive: "12 Mar 2026",
  },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (s) =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.programme.toLowerCase().includes(search.toLowerCase())
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
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">No students match your search.</p>
          </div>
        ) : (
          filtered.map((student) => (
            <div
              key={student.id}
              className="group flex items-center gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4 transition-colors hover:border-k-primary/20 cursor-pointer"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                <span className="text-sm font-semibold text-k-primary">
                  {student.initials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-k-black">{student.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-k-gray-400">
                  <GraduationCap size={12} />
                  {student.programme}
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1.5">
                <span className="rounded-full bg-k-primary/10 px-3 py-0.5 text-xs font-medium text-k-primary">
                  {student.progress} services
                </span>
                <span className="text-[10px] text-k-gray-400">
                  Active {student.lastActive}
                </span>
              </div>

              {/* Mobile-only compact progress */}
              <div className="sm:hidden flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-k-primary">
                  {student.progress}
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
