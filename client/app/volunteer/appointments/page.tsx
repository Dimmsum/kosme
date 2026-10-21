"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Appointment } from "@/lib/appointments";
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

  const needsReply = (a: Appointment) =>
    a.status === "pending" ||
    (a.status === "reschedule_requested" && a.proposed_by !== a.client_id);
  const upcoming = appointments.filter((a) =>
    ["pending", "confirmed", "reschedule_requested"].includes(a.status),
  );
  const past = appointments.filter((a) => ["completed", "cancelled"].includes(a.status));
  const waiting = upcoming.filter(needsReply).length;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Appointments</h1>
          {waiting > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
              {waiting} need a reply
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-k-gray-400">
          Students request a time with you. Accept, decline, or suggest another time.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-k-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          <AppointmentList
            role="client"
            appointments={upcoming}
            onChanged={load}
            onMessage={(id) => router.push(`/volunteer/messages?with=${id}`)}
            emptyLabel="No appointment requests yet."
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
