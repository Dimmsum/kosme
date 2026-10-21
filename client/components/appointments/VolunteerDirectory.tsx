"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, MapPin, MessageSquare, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { DAYS, VolunteerProfile } from "@/lib/appointments";
import RequestAppointmentForm from "./RequestAppointmentForm";

function summary(v: VolunteerProfile) {
  const days = DAYS.filter((d) => v.availability.some((w) => w.day === d.key)).map((d) =>
    d.label.slice(0, 3),
  );
  return days.length ? days.join(", ") : "Flexible";
}

/** Student-facing list of volunteer clients, with a profile view per person. */
export default function VolunteerDirectory({
  onMessage,
  onRequested,
}: {
  onMessage: (otherId: string, otherName: string | null) => void;
  onRequested: () => void;
}) {
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VolunteerProfile | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    apiGet<{ volunteers: VolunteerProfile[] }>("/api/client-profile/directory")
      .then((res) => setVolunteers(res.volunteers))
      .catch(() => setError("Could not load volunteers."))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    const v = selected;
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setRequesting(false);
          }}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-k-gray-600 hover:text-k-black"
        >
          <ArrowLeft size={14} /> All volunteers
        </button>

        <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
          <h2 className="font-serif text-xl text-k-black">{v.full_name ?? "Volunteer"}</h2>
          {v.location && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-k-gray-400">
              <MapPin size={12} /> {v.location}
              {v.willing_to_travel ? " · willing to travel" : ""}
            </p>
          )}
          {v.bio && <p className="mt-3 text-sm leading-relaxed text-k-gray-600">{v.bio}</p>}

          <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
            Happy to receive
          </h3>
          {v.services_willing.length === 0 ? (
            <p className="text-sm text-k-gray-400">Not specified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {v.services_willing.map((s) => (
                <span key={s} className="rounded-full bg-k-primary/10 px-3 py-1 text-xs font-medium text-k-primary">
                  {s}
                </span>
              ))}
            </div>
          )}

          <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
            Available
          </h3>
          {v.availability.length === 0 ? (
            <p className="text-sm text-k-gray-400">No set times — message to arrange.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-k-black">
              {DAYS.flatMap((d) =>
                v.availability
                  .filter((w) => w.day === d.key)
                  .map((w, i) => (
                    <li key={`${d.key}-${i}`} className="flex gap-3">
                      <span className="w-24 text-k-gray-600">{d.label}</span>
                      <span>
                        {w.from}–{w.to}
                      </span>
                    </li>
                  )),
              )}
            </ul>
          )}

          {!requesting && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRequesting(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white hover:bg-k-primary-light"
              >
                <CalendarClock size={13} /> Request appointment
              </button>
              <button
                type="button"
                onClick={() => onMessage(v.id, v.full_name)}
                className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-5 py-2 text-xs font-medium text-k-gray-600 hover:border-k-primary/30 hover:text-k-primary"
              >
                <MessageSquare size={13} /> Message
              </button>
            </div>
          )}
        </div>

        {requesting && (
          <RequestAppointmentForm
            clientId={v.id}
            preferredCategories={v.services_willing}
            onCancel={() => setRequesting(false)}
            onSent={() => {
              setRequesting(false);
              setSelected(null);
              onRequested();
            }}
          />
        )}
      </div>
    );
  }

  if (loading) return <p className="py-10 text-center text-sm text-k-gray-400">Loading…</p>;
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (volunteers.length === 0) {
    return (
      <div className="max-w-2xl rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
        <Users size={28} className="mx-auto mb-3 text-k-gray-300" />
        <p className="text-sm text-k-gray-400">No volunteers have set up a profile yet.</p>
      </div>
    );
  }
  return (
    <ul className="flex max-w-2xl flex-col gap-3">
      {volunteers.map((v) => (
        <li key={v.id}>
          <button
            type="button"
            onClick={() => setSelected(v)}
            className="w-full rounded-2xl border border-k-gray-200 bg-k-white p-4 text-left transition-colors hover:border-k-primary/30"
          >
            <p className="text-sm font-medium text-k-black">{v.full_name ?? "Volunteer"}</p>
            <p className="mt-0.5 text-xs text-k-gray-400">
              {v.location ? `${v.location} · ` : ""}Available: {summary(v)}
            </p>
            {v.services_willing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {v.services_willing.slice(0, 5).map((s) => (
                  <span key={s} className="rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[11px] text-k-gray-600">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
