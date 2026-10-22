"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Compass, MapPin } from "lucide-react";
import { apiGet } from "@/lib/api";
import {
  APPOINTMENT_STATUS,
  Appointment,
  formatDuration,
  formatWhen,
  needsMyReply,
} from "@/lib/appointments";

interface ProfileRes {
  profile: { full_name: string | null };
}

interface PendingRes {
  confirmations: Array<{
    id: string;
    name: string;
    created_at: string;
    student: { full_name: string | null } | null;
  }>;
}

const JOURNEY = ["Find a service", "Choose a student", "View portfolio", "Request a time", "Receive & confirm"];

export default function VolunteerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("there");
  const [pending, setPending] = useState<PendingRes["confirmations"]>([]);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<ProfileRes>("/api/profile"),
      apiGet<PendingRes>("/api/confirmations/pending"),
      apiGet<{ appointments: Appointment[] }>("/api/appointments"),
    ])
      .then(([profileRes, pendingRes, apptRes]) => {
        setName(profileRes.profile.full_name?.split(" ")[0] ?? "there");
        setPending(pendingRes.confirmations ?? []);
        setUpcoming(
          (apptRes.appointments ?? []).filter((a) =>
            ["pending_student", "pending_client", "confirmed", "reschedule_requested"].includes(a.status),
          ),
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Waiting on me: the student asked for a time, or suggested a new one.
  const needsReply = (a: Appointment) => needsMyReply(a, "client");
  const waiting = upcoming.filter(needsReply).length;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-k-gray-400">Thank you for supporting our cosmetology students.</p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* 1. Find a service: the main thing a client comes here to do */}
      <div className="mb-8 rounded-3xl bg-k-primary p-6 text-k-white sm:p-8">
        <h2 className="font-serif text-xl font-light sm:text-2xl">Find a service</h2>
        <p className="mt-1 max-w-xl text-sm text-k-white/80">
          Pick a service you&apos;d like, choose a student, look through their verified portfolio and request a time
          that suits you both.
        </p>
        <Link
          href="/volunteer/browse"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-k-white px-6 py-2.5 text-sm font-medium text-k-primary no-underline transition-all duration-200 hover:-translate-y-px"
        >
          <Compass size={16} />
          Find a service or student
        </Link>
        <ol className="mt-6 hidden flex-wrap gap-x-2 gap-y-1 text-[11px] text-k-white/70 sm:flex">
          {JOURNEY.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              {step}
              {i < JOURNEY.length - 1 && <ArrowRight size={11} />}
            </li>
          ))}
        </ol>
      </div>

      {/* 3. A finished service that needs the client's word */}
      {pending.length > 0 && (
        <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg text-k-black">
              {pending.length === 1 ? "A service is waiting for your confirmation" : `${pending.length} services are waiting for your confirmation`}
            </h2>
            <Link
              href="/volunteer/confirmations"
              className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
            >
              Review <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {pending.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-k-white px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-k-black">{item.name}</p>
                  <p className="mt-0.5 text-xs text-k-gray-400">{item.student?.full_name ?? "Student"}</p>
                </div>
                <Link
                  href="/volunteer/confirmations"
                  className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white no-underline transition-all duration-200 hover:-translate-y-px hover:bg-k-primary-light"
                >
                  <CheckCircle2 size={14} />
                  Confirm Service
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Upcoming services */}
      <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-lg text-k-black">Upcoming Services</h2>
            {waiting > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
                {waiting} need a reply
              </span>
            )}
          </div>
          <Link
            href="/volunteer/appointments"
            className="flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-k-gray-400">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl bg-k-gray-100 px-4 py-8 text-center">
            <p className="text-sm text-k-gray-400">No upcoming services. Find a student to request one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.slice(0, 3).map((a) => {
              const status = APPOINTMENT_STATUS[a.status];
              return (
                <Link
                  key={a.id}
                  href="/volunteer/appointments"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-k-gray-100 px-4 py-3.5 no-underline transition-colors hover:bg-k-gray-200/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
                      <CalendarClock size={18} className="text-k-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-k-black">{a.service_name}</p>
                      <p className="mt-0.5 truncate text-xs text-k-gray-400">
                        {a.student?.full_name ?? "Student"} &middot; {formatWhen(a.starts_at)} &middot;{" "}
                        {formatDuration(a.est_duration_min)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-k-gray-400">
                        <MapPin size={11} /> {a.location}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-k-gray-400">
        Services you&apos;ve already received are kept in{" "}
        <Link href="/volunteer/history" className="font-medium text-k-primary no-underline hover:underline">
          History
        </Link>
        .
      </p>
    </div>
  );
}
