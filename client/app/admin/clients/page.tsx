"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, MapPin, Phone, Check, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Signup {
  id: string;
  full_name: string;
  gender: string;
  whatsapp: string;
  email: string;
  parish: string;
  service_preferences: string[];
  availability: string[];
  preferred_time: string[];
  willing_to_travel: boolean;
  photo_consent: boolean;
  trainee_acknowledgement: boolean;
  created_at: string;
}
interface VolunteerRequest {
  id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  volunteer: { id: string; full_name: string | null } | null;
}

const reqColor: Record<VolunteerRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminClientsPage() {
  const [tab, setTab] = useState<"signups" | "requests">("signups");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        apiGet<{ signups: Signup[] }>("/api/admin/clients/signups"),
        apiGet<{ requests: VolunteerRequest[] }>("/api/admin/clients/volunteer-requests"),
      ]);
      setSignups(s.signups);
      setRequests(r.requests);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load client data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Volunteer Client Management"
        subtitle="Public sign-ups and volunteer↔student requests across the platform."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("signups")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "signups" ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
          }`}
        >
          Sign-ups ({signups.length})
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "requests" ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
          }`}
        >
          Volunteer Requests ({requests.length})
        </button>
      </div>

      {loading ? (
        <LoadingCard label="Loading…" />
      ) : tab === "signups" ? (
        signups.length === 0 ? (
          <EmptyCard label="No client sign-ups yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {signups.map((s) => (
              <div key={s.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">{s.full_name}</p>
                    <p className="text-xs text-k-gray-400">{s.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-k-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-k-gray-400" /> {s.parish}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="text-k-gray-400" /> {s.whatsapp}
                  </span>
                </div>
                {s.service_preferences.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.service_preferences.map((p) => (
                      <span key={p} className="rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[11px] text-k-gray-600">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-k-gray-400">
                  <Consent label="Photo consent" ok={s.photo_consent} />
                  <Consent label="Willing to travel" ok={s.willing_to_travel} />
                  <Consent label="Trainee acknowledged" ok={s.trainee_acknowledgement} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <EmptyCard label="No volunteer requests yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white divide-y divide-k-gray-200">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-k-black">
                  <span className="font-medium">{r.volunteer?.full_name ?? "Volunteer"}</span>
                  <span className="text-k-gray-400"> → </span>
                  <span className="font-medium">{r.student?.full_name ?? "Student"}</span>
                </p>
                {r.message && <p className="mt-0.5 truncate text-xs text-k-gray-400">{r.message}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${reqColor[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Consent({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {ok ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
      {label}
    </span>
  );
}
