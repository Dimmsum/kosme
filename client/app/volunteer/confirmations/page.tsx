"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, ClipboardCheck } from "lucide-react";

type ConfirmationStatus = "pending" | "confirmed" | "disputed";

interface Confirmation {
  id: number;
  service: string;
  student: string;
  date: string;
  description: string;
  notes: string;
  status: ConfirmationStatus;
}

const initialConfirmations: Confirmation[] = [
  {
    id: 1,
    service: "Full Colour Application",
    student: "Maya Thompson",
    date: "20 Mar 2026",
    description: "Full head permanent colour application using Wella Koleston.",
    notes: "Warm auburn tones, strand test completed prior to service.",
    status: "pending",
  },
  {
    id: 2,
    service: "Blow-dry & Style",
    student: "Priya Mehta",
    date: "18 Mar 2026",
    description: "Blow-dry with round brush technique for volume and movement.",
    notes: "Loose waves finishing style, heat protectant applied.",
    status: "pending",
  },
  {
    id: 3,
    service: "Scalp Treatment",
    student: "Jade Patterson",
    date: "15 Mar 2026",
    description: "Scalp analysis and exfoliating treatment followed by deep conditioning.",
    notes: "Dry scalp condition noted, recommended follow-up in 4 weeks.",
    status: "pending",
  },
  {
    id: 4,
    service: "Cut & Finish",
    student: "Amina Rahman",
    date: "12 Mar 2026",
    description: "Layered haircut with texturising, blow-dry and straighten finish.",
    notes: "Removed approximately 2 inches of length, point-cut layers.",
    status: "pending",
  },
];

export default function ConfirmationsPage() {
  const [confirmations, setConfirmations] = useState<Confirmation[]>(initialConfirmations);

  const handleConfirm = (id: number) => {
    setConfirmations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "confirmed" } : c))
    );
  };

  const handleDispute = (id: number) => {
    setConfirmations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "disputed" } : c))
    );
  };

  const pending = confirmations.filter((c) => c.status === "pending");
  const resolved = confirmations.filter((c) => c.status !== "pending");

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Pending Confirmations
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Please confirm or dispute services performed by students.
        </p>
      </div>

      {/* Pending items */}
      {pending.length === 0 && resolved.length > 0 ? (
        <div className="mb-8 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-k-black">All caught up!</p>
          <p className="mt-1 text-xs text-k-gray-400">No pending confirmations right now.</p>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-4">
          {pending.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-k-black">{item.service}</h3>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {item.student} &middot; {item.date}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Pending
                </span>
              </div>

              <div className="mb-4 rounded-xl bg-k-gray-100 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400 mb-1">
                  Service Description
                </p>
                <p className="text-sm text-k-black">{item.description}</p>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400 mt-3 mb-1">
                  Notes
                </p>
                <p className="text-sm text-k-gray-600">{item.notes}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirm(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
                >
                  <CheckCircle2 size={16} />
                  Confirm Service
                </button>
                <button
                  onClick={() => handleDispute(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                >
                  <AlertTriangle size={16} />
                  Dispute
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved items */}
      {resolved.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-k-black mb-4">Recently Resolved</h2>
          <div className="flex flex-col gap-3">
            {resolved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-k-gray-200 bg-k-white px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      item.status === "confirmed" ? "bg-emerald-100" : "bg-red-100"
                    }`}
                  >
                    {item.status === "confirmed" ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-k-black">{item.service}</p>
                    <p className="text-xs text-k-gray-400 mt-0.5">
                      {item.student} &middot; {item.date}
                    </p>
                  </div>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.status === "confirmed" ? "Confirmed" : "Disputed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
