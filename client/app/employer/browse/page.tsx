"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Heart, CheckCircle2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface Graduate {
  id: string;
  full_name: string | null;
  institution_name: string | null;
  verified_count: number;
  specialisations: string[];
}

function initialsFromName(name: string | null): string {
  const safe = (name ?? "Graduate").trim();
  return safe
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpecialisation, setActiveSpecialisation] = useState("All");
  const [activeInstitution, setActiveInstitution] =
    useState("All Institutions");
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [pendingShortlistIds, setPendingShortlistIds] = useState<Set<string>>(
    new Set(),
  );
  const [specialisations, setSpecialisations] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const institutions = useMemo(() => {
    const unique = new Set<string>();
    graduates.forEach((g) => {
      if (g.institution_name) unique.add(g.institution_name);
    });
    return ["All Institutions", ...Array.from(unique).sort()];
  }, [graduates]);

  useEffect(() => {
    Promise.all([
      apiGet<{ graduates: Graduate[] }>("/api/portfolio/browse"),
      apiGet<{ shortlist: Array<{ student: { id: string } }> }>(
        "/api/shortlist",
      ),
      supabase
        .from("service_categories")
        .select("id")
        .order("id")
        .then(({ data }) => data ?? []),
    ])
      .then(([browseRes, shortlistRes, categories]) => {
        setGraduates(browseRes.graduates ?? []);
        setShortlisted(
          new Set(shortlistRes.shortlist.map((item) => item.student.id)),
        );
        setSpecialisations(["All", ...categories.map((c) => c.id)]);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load graduates.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleShortlist = async (studentId: string) => {
    if (pendingShortlistIds.has(studentId)) return;

    setPendingShortlistIds((prev) => new Set(prev).add(studentId));
    const isSaved = shortlisted.has(studentId);

    try {
      if (isSaved) {
        await apiDelete(`/api/shortlist/${encodeURIComponent(studentId)}`);
        setShortlisted((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      } else {
        await apiPost<{ entry: { id: string } }>("/api/shortlist", {
          studentId,
        });
        setShortlisted((prev) => new Set(prev).add(studentId));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update shortlist.";
      setError(message);
    } finally {
      setPendingShortlistIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const filtered = graduates.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      (s.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.institution_name ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesSpec =
      activeSpecialisation === "All" ||
      s.specialisations.includes(activeSpecialisation);
    const matchesInst =
      activeInstitution === "All Institutions" ||
      s.institution_name === activeInstitution;
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
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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
        {filtered.length} {filtered.length === 1 ? "graduate" : "graduates"}{" "}
        found
      </p>

      {loading && (
        <div className="mb-4 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-12 text-center">
          <p className="text-sm text-k-gray-400">Loading graduates...</p>
        </div>
      )}

      {/* Student cards grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="group flex flex-col rounded-2xl border border-k-gray-200 bg-k-white p-5 transition-all hover:border-k-primary/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {initialsFromName(student.full_name)}
                  </span>
                </div>
                <button
                  onClick={() => toggleShortlist(student.id)}
                  disabled={pendingShortlistIds.has(student.id)}
                  className="rounded-full p-2 transition-colors hover:bg-k-gray-100"
                  aria-label={
                    shortlisted.has(student.id)
                      ? `Remove ${student.full_name ?? "graduate"} from shortlist`
                      : `Add ${student.full_name ?? "graduate"} to shortlist`
                  }
                >
                  <Heart
                    size={18}
                    className={
                      shortlisted.has(student.id)
                        ? "fill-k-accent text-k-accent"
                        : "text-k-gray-400"
                    }
                  />
                </button>
              </div>

              <h3 className="text-sm font-medium text-k-black">
                {student.full_name ?? "Unnamed Graduate"}
              </h3>
              <p className="text-xs text-k-gray-400 mt-0.5">
                {student.institution_name ?? "No institution listed"}
              </p>

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
                  {student.verified_count} verified services
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-k-gray-200 bg-k-white py-16 px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-k-gray-100">
            <Search size={24} className="text-k-gray-400" />
          </div>
          <h3 className="font-serif text-lg text-k-black">
            No graduates found
          </h3>
          <p className="mt-1 text-sm text-k-gray-400 max-w-xs">
            Try adjusting your search or filters to find more talent.
          </p>
        </div>
      )}
    </div>
  );
}
