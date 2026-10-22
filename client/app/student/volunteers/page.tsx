"use client";

import { useEffect, useState } from "react";
import {
  HandHeart,
  CheckCircle2,
  X,
  MessageSquare,
  Clock,
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { Appointment, PAST_STATUSES, UPCOMING_STATUSES, needsMyReply } from "@/lib/appointments";
import { useTimer } from "@/components/student/TimerProvider";
import AppointmentList from "@/components/appointments/AppointmentList";
import MessagesPanel from "@/components/appointments/MessagesPanel";
import VolunteerDirectory from "@/components/appointments/VolunteerDirectory";

type RequestStatus = "pending" | "accepted" | "declined";

interface VolunteerRequest {
  id: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  volunteer: {
    id: string;
    full_name: string | null;
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

type Section = "find" | "schedule" | "messages" | "requests";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "find", label: "Find volunteers" },
  { key: "schedule", label: "Schedule" },
  { key: "messages", label: "Messages" },
  { key: "requests", label: "Requests" },
];

export default function VolunteersPage() {
  const timer = useTimer();
  const [section, setSection] = useState<Section>("find");
  const [thread, setThread] = useState<{ id: string; name: string | null } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = () =>
    apiGet<{ appointments: Appointment[] }>("/api/appointments")
      .then((res) => setAppointments(res.appointments))
      .catch(() => {});

  useEffect(() => {
    loadAppointments();
  }, []);

  function openThread(id: string, name: string | null) {
    setThread({ id, name });
    setSection("messages");
  }

  // CON-6: begin the timer from a confirmed booking. The server checks the
  // booking is today's and links it to the new service.
  async function startFromBooking(a: Appointment) {
    const { service } = await apiPost<{
      service: { id: string; name: string; started_at: string | null; service_type_id: string | null };
    }>("/api/services", {
      name: a.service_name,
      category_id: a.category_id,
      service_type_id: a.service_type_id ?? undefined,
      client_id: a.client_id,
      client_source: "kosme_volunteer",
      photo_consent: false,
      start_now: true,
      appointment_id: a.id,
    });
    timer.started(service);
  }

  const upcoming = appointments.filter((a) => UPCOMING_STATUSES.includes(a.status));
  const past = appointments.filter((a) => PAST_STATUSES.includes(a.status));

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
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Volunteers</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Find a practice client, agree a time, and run the service — all in one place.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto" role="tablist">
        {SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              section === key
                ? "bg-k-primary text-k-white"
                : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {label}
            {key === "requests" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {section === "find" && (
        <VolunteerDirectory
          onMessage={openThread}
          onRequested={() => {
            loadAppointments();
            setSection("schedule");
          }}
        />
      )}

      {section === "schedule" && (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 font-serif text-lg text-k-black">Upcoming appointments</h2>
            <AppointmentList
              role="student"
              appointments={upcoming}
              onChanged={loadAppointments}
              onMessage={openThread}
              onStart={startFromBooking}
              emptyLabel="No upcoming appointments. Find a volunteer to request one."
            />
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="mb-3 font-serif text-lg text-k-black">Past</h2>
              <AppointmentList
                role="student"
                appointments={past}
                onChanged={loadAppointments}
                onMessage={openThread}
                emptyLabel=""
              />
            </div>
          )}
        </div>
      )}

      {section === "messages" && (
        <MessagesPanel
          openWith={thread?.id}
          openWithName={thread?.name}
          onClose={() => setThread(null)}
        />
      )}

      {section === "requests" && (
      <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl font-light text-k-black sm:text-2xl">
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

                  {/* Contact stays inside Kosmè — message instead of sharing a number */}
                  {req.status === "accepted" && req.volunteer && (
                    <button
                      onClick={() => openThread(req.volunteer!.id, req.volunteer!.full_name)}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <MessageSquare size={13} />
                      Message {req.volunteer.full_name?.split(" ")[0] ?? "volunteer"}
                    </button>
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
      </>
      )}
    </div>
  );
}
