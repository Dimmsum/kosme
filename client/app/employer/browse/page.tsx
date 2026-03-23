"use client";

import { useState } from "react";
import { Search, Heart, CheckCircle2, SlidersHorizontal } from "lucide-react";

const specialisations = ["All", "Colour", "Haircuts", "Styling", "Scalp"];
const institutions = ["All Institutions", "London College of Beauty", "Manchester Beauty Academy", "Birmingham Institute of Hair", "Leeds School of Cosmetology"];

const students = [
  {
    id: 1,
    name: "Maya Thompson",
    initials: "MT",
    institution: "London College of Beauty",
    specialisations: ["Colour", "Styling"],
    verifiedCount: 29,
  },
  {
    id: 2,
    name: "Priya Sharma",
    initials: "PS",
    institution: "Manchester Beauty Academy",
    specialisations: ["Styling", "Haircuts"],
    verifiedCount: 34,
  },
  {
    id: 3,
    name: "Jade Williams",
    initials: "JW",
    institution: "London College of Beauty",
    specialisations: ["Haircuts"],
    verifiedCount: 22,
  },
  {
    id: 4,
    name: "Amina Osei",
    initials: "AO",
    institution: "Birmingham Institute of Hair",
    specialisations: ["Scalp", "Colour"],
    verifiedCount: 18,
  },
  {
    id: 5,
    name: "Chloe Bennett",
    initials: "CB",
    institution: "Leeds School of Cosmetology",
    specialisations: ["Colour"],
    verifiedCount: 26,
  },
  {
    id: 6,
    name: "Fatima Al-Rashid",
    initials: "FA",
    institution: "Manchester Beauty Academy",
    specialisations: ["Styling", "Scalp"],
    verifiedCount: 31,
  },
  {
    id: 7,
    name: "Grace Okafor",
    initials: "GO",
    institution: "London College of Beauty",
    specialisations: ["Haircuts", "Colour"],
    verifiedCount: 20,
  },
  {
    id: 8,
    name: "Sophie Chen",
    initials: "SC",
    institution: "Birmingham Institute of Hair",
    specialisations: ["Styling"],
    verifiedCount: 27,
  },
];

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpecialisation, setActiveSpecialisation] = useState("All");
  const [activeInstitution, setActiveInstitution] = useState("All Institutions");
  const [shortlisted, setShortlisted] = useState<number[]>([]);

  const toggleShortlist = (id: number) => {
    setShortlisted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institution.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec =
      activeSpecialisation === "All" ||
      s.specialisations.includes(activeSpecialisation);
    const matchesInst =
      activeInstitution === "All Institutions" ||
      s.institution === activeInstitution;
    return matchesSearch && matchesSpec && matchesInst;
  });

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Browse Talent
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Discover verified graduates ready to join your team
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-k-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name or institution..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-k-gray-200 bg-k-white py-3 pl-11 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none focus:border-k-primary/40 transition-colors"
        />
      </div>

      {/* Institution filter */}
      <div className="mb-4">
        <select
          value={activeInstitution}
          onChange={(e) => setActiveInstitution(e.target.value)}
          className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-2.5 text-sm text-k-black outline-none focus:border-k-primary/40 transition-colors sm:w-auto"
        >
          {institutions.map((inst) => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>
      </div>

      {/* Specialisation filters */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {specialisations.map((spec) => (
          <button
            key={spec}
            onClick={() => setActiveSpecialisation(spec)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeSpecialisation === spec
                ? "bg-k-primary text-k-white"
                : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="mb-4 text-xs text-k-gray-400">
        {filtered.length} {filtered.length === 1 ? "graduate" : "graduates"} found
      </p>

      {/* Student cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((student) => (
          <div
            key={student.id}
            className="group flex flex-col rounded-2xl border border-k-gray-200 bg-k-white p-5 transition-all hover:border-k-primary/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {student.initials}
                </span>
              </div>
              <button
                onClick={() => toggleShortlist(student.id)}
                className="rounded-full p-2 transition-colors hover:bg-k-gray-100"
                aria-label={
                  shortlisted.includes(student.id)
                    ? `Remove ${student.name} from shortlist`
                    : `Add ${student.name} to shortlist`
                }
              >
                <Heart
                  size={18}
                  className={
                    shortlisted.includes(student.id)
                      ? "fill-k-accent text-k-accent"
                      : "text-k-gray-400"
                  }
                />
              </button>
            </div>

            <h3 className="text-sm font-medium text-k-black">{student.name}</h3>
            <p className="text-xs text-k-gray-400 mt-0.5">{student.institution}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {student.specialisations.map((spec) => (
                <span
                  key={spec}
                  className="rounded-full bg-k-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-k-primary"
                >
                  {spec}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-k-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-k-gray-600">
                {student.verifiedCount} verified services
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-k-gray-200 bg-k-white py-16 px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-k-gray-100">
            <Search size={24} className="text-k-gray-400" />
          </div>
          <h3 className="font-serif text-lg text-k-black">No graduates found</h3>
          <p className="mt-1 text-sm text-k-gray-400 max-w-xs">
            Try adjusting your search or filters to find more talent.
          </p>
        </div>
      )}
    </div>
  );
}
