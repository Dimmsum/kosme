"use client";

import { useEffect, useState } from "react";
import {
  HandHeart,
  CheckCircle2,
  X,
  Phone,
  MessageSquare,
  Clock,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

type RequestStatus = "pending" | "accepted" | "declined";

interface VolunteerRequest {
  id: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  volunteer: {
    id: string;
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface IncomingResponse {
  requests: VolunteerRequest[];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_TABS = ["All", "Pending", "Accepted", "Declined"] as const;
type Tab = (typeof STATUS_TABS)[number];

export default function VolunteersPage() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [actioning, setActioning] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet<IncomingResponse>("/api/volunteer-requests/incoming")
      .then((res) => setRequests(res.requests ?? []))
      .catch(() => setError("Could not load volunteer requests."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(id: string, status: "accepted" | "declined") {
    setActioning((prev) => new Set(prev).add(id));
    try {
      await apiPatch(`/api/volunteer-requests/${id}`, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch {
      setError("Failed to update request.");
    } finally {
      setActioning((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const filtered = requests.filter((r) => {
    if (activeTab === "All") return true;
    return r.status === activeTab.toLowerCase();
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            Volunteer Requests
          </h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
              {pendingCount} new
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-k-gray-400">
          Volunteers who want to be a model for your services.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-k-primary text-k-white"
                : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-4 max-w-2xl">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <HandHeart size={28} className="mx-auto mb-3 text-k-gray-300" />
            <p className="text-sm text-k-gray-400">
              {activeTab === "All"
                ? "No volunteers have expressed interest yet."
                : `No ${activeTab.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-k-gray-200 bg-k-white p-5"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                  <span className="text-sm font-semibold text-k-primary">
                    {initials(req.volunteer?.full_name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-k-black">
                        {req.volunteer?.full_name ?? "Volunteer"}
                      </p>
                      <p className="flex items-center gap-1 mt-0.5 text-xs text-k-gray-400">
                        <Clock size={11} />
                        {new Date(req.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {/* Status badge */}
                    {req.status === "pending" && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                        Pending
                      </span>
                    )}
                    {req.status === "accepted" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 size={10} /> Accepted
                      </span>
                    )}
                    {req.status === "declined" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                        <X size={10} /> Declined
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  {req.message && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-k-gray-100 px-3.5 py-2.5">
                      <MessageSquare size={13} className="mt-0.5 shrink-0 text-k-gray-400" />
                      <p className="text-xs leading-relaxed text-k-gray-600">{req.message}</p>
                    </div>
                  )}

                  {/* Contact info — shown once accepted */}
                  {req.status === "accepted" && req.volunteer?.phone && (
                    <a
                      href={`tel:${req.volunteer.phone}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-medium text-emerald-700 no-underline hover:bg-emerald-100 transition-colors"
                    >
                      <Phone size={13} />
                      {req.volunteer.phone}
                    </a>
                  )}

                  {/* Actions — pending only */}
                  {req.status === "pending" && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleAction(req.id, "accepted")}
                        disabled={actioning.has(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white transition-all hover:bg-k-primary-light hover:-translate-y-px disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "declined")}
                        disabled={actioning.has(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-xs font-medium text-k-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-60"
                      >
                        <X size={13} />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
