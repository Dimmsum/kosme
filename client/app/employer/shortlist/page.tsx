"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, MessageCircle, HeartOff } from "lucide-react";
import { apiDelete, apiGet } from "@/lib/api";

interface ShortlistedStudent {
  id: string;
  name: string | null;
  institution: string | null;
  specialisations: string[];
  verifiedCount: number;
  dateAdded: string;
}

interface ShortlistResponse {
  shortlist: Array<{
    shortlist_id: string;
    date_added: string;
    student: {
      id: string;
      full_name: string | null;
      institution_name: string | null;
      verified_count: number;
      specialisations: string[];
    };
  }>;
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

export default function ShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    apiGet<ShortlistResponse>("/api/shortlist")
      .then((res) => {
        const mapped = (res.shortlist ?? []).map((item) => ({
          id: item.student.id,
          name: item.student.full_name,
          institution: item.student.institution_name,
          specialisations: item.student.specialisations,
          verifiedCount: item.student.verified_count,
          dateAdded: item.date_added,
        }));
        setShortlist(mapped);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load shortlist.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const removeFromShortlist = async (studentId: string) => {
    if (pendingRemoveIds.has(studentId)) return;

    setPendingRemoveIds((prev) => new Set(prev).add(studentId));
    try {
      await apiDelete(`/api/shortlist/${encodeURIComponent(studentId)}`);
      setShortlist((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to remove graduate from shortlist.";
      setError(message);
    } finally {
      setPendingRemoveIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          My Shortlist
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {shortlist.length} {shortlist.length === 1 ? "graduate" : "graduates"}{" "}
          saved
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Shortlisted students */}
      {loading ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <p className="text-sm text-k-gray-400">Loading shortlist...</p>
        </div>
      ) : shortlist.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortlist.map((student) => (
            <div
              key={student.id}
              className="flex flex-col rounded-2xl border border-k-gray-200 bg-k-white p-5 transition-all hover:border-k-primary/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {initialsFromName(student.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-k-black truncate">
                      {student.name ?? "Unnamed Graduate"}
                    </h3>
                    <p className="text-xs text-k-gray-400 mt-0.5 truncate">
                      {student.institution ?? "No institution listed"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFromShortlist(student.id)}
                  disabled={pendingRemoveIds.has(student.id)}
                  className="shrink-0 rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${student.name ?? "graduate"} from shortlist`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {student.specialisations.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full bg-k-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-k-primary"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="text-xs font-medium text-k-gray-600">
                  {student.verifiedCount} verified services
                </span>
              </div>

              <p className="mt-2 text-[10px] text-k-gray-400">
                Added{" "}
                {new Date(student.dateAdded).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>

              <div className="mt-4 flex gap-2 pt-3 border-t border-k-gray-200">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-k-primary px-4 py-2.5 text-xs font-medium text-k-white transition-colors hover:bg-k-primary-light">
                  <MessageCircle size={14} />
                  Contact
                </button>
                <button
                  onClick={() => removeFromShortlist(student.id)}
                  disabled={pendingRemoveIds.has(student.id)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-k-gray-200 px-4 py-2.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-k-gray-200 bg-k-white py-16 px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-k-gray-100">
            <HeartOff size={24} className="text-k-gray-400" />
          </div>
          <h3 className="font-serif text-lg text-k-black">
            No shortlisted graduates
          </h3>
          <p className="mt-1 text-sm text-k-gray-400 max-w-xs">
            Browse talent and save graduates you are interested in hiring.
          </p>
          <a
            href="/employer/browse"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white no-underline transition-colors hover:bg-k-primary-light"
          >
            Browse Talent
          </a>
        </div>
      )}
    </div>
  );
}
