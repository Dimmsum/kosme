"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Trash2, UserCheck } from "lucide-react";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import RequestAppointmentForm from "@/components/appointments/RequestAppointmentForm";

interface MyClient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  invite_token: string;
  client_user_id: string | null;
}

const field =
  "w-full rounded-xl border border-k-gray-200 bg-k-white px-3 py-2 text-sm text-k-black focus:border-k-primary focus:outline-none";

// "Add My Client": students bring their own clients, then book them. The client
// receives the request and confirms the booking.
export default function MyClientsPage() {
  const [clients, setClients] = useState<MyClient[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<MyClient | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ clients: MyClient[] }>("/api/student-clients");
      setClients(r.clients);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load your clients."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/student-clients", { full_name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
      setName("");
      setEmail("");
      setPhone("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add this client."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: MyClient) {
    try {
      await apiDelete(`/api/student-clients/${c.id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not remove this client."));
    }
  }

  async function copyInvite(c: MyClient) {
    const link = `${window.location.origin}/invite?t=${c.invite_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice(`Invite link for ${c.full_name} copied — send it to them.`);
    } catch {
      setNotice(link);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">My Clients</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Bring your own client: add them, book a service, and they confirm the appointment. If they&apos;re new to Kosmè, send
          them the invite link.
        </p>
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      {notice && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

      <form onSubmit={add} className="mb-8 grid max-w-2xl grid-cols-1 gap-3 rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:grid-cols-3">
        <input className={field} placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required />
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        <p className="text-xs text-k-gray-400 sm:col-span-3">Email or phone is needed so they can be reached.</p>
        <button
          type="submit"
          disabled={saving || !name.trim() || (!email.trim() && !phone.trim())}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white disabled:opacity-50"
        >
          <Plus size={13} /> {saving ? "Adding…" : "Add client"}
        </button>
      </form>

      {booking && (
        <div className="mb-8 max-w-2xl">
          <RequestAppointmentForm
            studentClientId={booking.id}
            otherName={booking.full_name}
            preferredCategories={[]}
            onSent={() => {
              setBooking(null);
              setNotice(`Request sent. ${booking.full_name} confirms the booking${booking.client_user_id ? "" : " once they've joined"} — see it under Volunteers › Upcoming.`);
            }}
            onCancel={() => setBooking(null)}
          />
        </div>
      )}

      {!clients ? (
        <p className="text-sm text-k-gray-400">Loading…</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-k-gray-400">You haven&apos;t added any clients yet.</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-3">
          {clients.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-k-gray-200 bg-k-white p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-k-black">{c.full_name}</p>
                <p className="text-xs text-k-gray-400">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                <p className={`mt-1 inline-flex items-center gap-1 text-xs ${c.client_user_id ? "text-emerald-700" : "text-amber-700"}`}>
                  {c.client_user_id ? (
                    <>
                      <UserCheck size={12} /> On Kosmè
                    </>
                  ) : (
                    "Hasn't joined yet — send the invite link"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBooking(c)} className="rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-k-white">
                  Book a service
                </button>
                {!c.client_user_id && (
                  <button onClick={() => copyInvite(c)} className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-3 py-1.5 text-xs text-k-gray-600">
                    <Copy size={12} /> Invite link
                  </button>
                )}
                <button onClick={() => remove(c)} aria-label="Remove client" className="rounded-full p-1.5 text-k-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
