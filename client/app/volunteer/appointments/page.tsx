"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Appointment, PAST_STATUSES, UPCOMING_STATUSES, needsMyReply } from "@/lib/appointments";
import AppointmentList from "@/components/appointments/AppointmentList";

export default function VolunteerAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    apiGet<{ appointments: Appointment[] }>("/api/appointments")
      .then((res) => setAppointments(res.appointments))
      .catch(() => setError("Could not load appointments."))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Waiting on me: a request awaiting the client, a new time they were sent, or
  // a finished service they need to confirm.
  const needsReply = (a: Appointment) => needsMyReply(a, "client") || a.status === "awaiting_client_confirmation";
  const upcoming = appointments.filter((a) => UPCOMING_STATUSES.includes(a.status));
  const past = appointments.filter((a) => PAST_STATUSES.includes(a.status));
  const waiting = upcoming.filter(needsReply).length;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Upcoming Services</h1>
          {waiting > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
              {waiting} need a reply
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-k-gray-400">
          Services you&apos;ve requested or been asked to confirm. Accept, decline, suggest another time, reschedule or
          message the student.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-k-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length === 0 && (
            <Link
              href="/volunteer/browse"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white no-underline transition-colors hover:bg-k-primary-light"
            >
              <Compass size={14} /> Find a service
            </Link>
          )}
          <AppointmentList
            role="client"
            appointments={upcoming}
            onChanged={load}
            onMessage={(id) => router.push(`/volunteer/messages?with=${id}`)}
            emptyLabel="Nothing booked yet. Find a service to request your first appointment."
          />
          {past.length > 0 && (
            <div>
              <h2 className="mb-3 font-serif text-lg text-k-black">Past</h2>
              <AppointmentList
                role="client"
                appointments={past}
                onChanged={load}
                onMessage={(id) => router.push(`/volunteer/messages?with=${id}`)}
                emptyLabel=""
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
