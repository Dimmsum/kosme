"use client";

import { useState } from "react";
import { Heart, CheckCircle2, X, MessageCircle, HeartOff } from "lucide-react";

interface ShortlistedStudent {
  id: number;
  name: string;
  initials: string;
  institution: string;
  specialisations: string[];
  verifiedCount: number;
  dateAdded: string;
}

const initialShortlist: ShortlistedStudent[] = [
  {
    id: 1,
    name: "Maya Thompson",
    initials: "MT",
    institution: "London College of Beauty",
    specialisations: ["Colour", "Styling"],
    verifiedCount: 29,
    dateAdded: "20 Mar 2026",
  },
  {
    id: 2,
    name: "Priya Sharma",
    initials: "PS",
    institution: "Manchester Beauty Academy",
    specialisations: ["Styling", "Haircuts"],
    verifiedCount: 34,
    dateAdded: "18 Mar 2026",
  },
  {
    id: 6,
    name: "Fatima Al-Rashid",
    initials: "FA",
    institution: "Manchester Beauty Academy",
    specialisations: ["Styling", "Scalp"],
    verifiedCount: 31,
    dateAdded: "15 Mar 2026",
  },
  {
    id: 8,
    name: "Sophie Chen",
    initials: "SC",
    institution: "Birmingham Institute of Hair",
    specialisations: ["Styling"],
    verifiedCount: 27,
    dateAdded: "12 Mar 2026",
  },
];

export default function ShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistedStudent[]>(initialShortlist);

  const removeFromShortlist = (id: number) => {
    setShortlist((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          My Shortlist
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          {shortlist.length} {shortlist.length === 1 ? "graduate" : "graduates"} saved
        </p>
      </div>

      {/* Shortlisted students */}
      {shortlist.length > 0 ? (
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
                      {student.initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-k-black truncate">
                      {student.name}
                    </h3>
                    <p className="text-xs text-k-gray-400 mt-0.5 truncate">
                      {student.institution}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFromShortlist(student.id)}
                  className="shrink-0 rounded-full p-1.5 text-k-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${student.name} from shortlist`}
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
                Added {student.dateAdded}
              </p>

              <div className="mt-4 flex gap-2 pt-3 border-t border-k-gray-200">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-k-primary px-4 py-2.5 text-xs font-medium text-k-white transition-colors hover:bg-k-primary-light">
                  <MessageCircle size={14} />
                  Contact
                </button>
                <button
                  onClick={() => removeFromShortlist(student.id)}
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
          <h3 className="font-serif text-lg text-k-black">No shortlisted graduates</h3>
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
