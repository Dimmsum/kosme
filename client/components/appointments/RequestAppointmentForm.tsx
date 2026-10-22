"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { AvailabilityWindow, nowLocalInput, withinAvailability } from "@/lib/appointments";

interface Category {
  id: string;
  label: string;
}
interface ServiceType {
  id: string;
  category_id: string;
  name: string;
}

const DURATIONS = [30, 45, 60, 90, 120, 180, 240];

/**
 * Books an appointment from either side. A student passes `clientId` (booking a
 * volunteer); a client passes `studentId` (booking a student).
 */
export default function RequestAppointmentForm({
  clientId,
  studentId,
  otherName,
  availability = [],
  preferredCategories,
  onSent,
  onCancel,
}: {
  clientId?: string;
  studentId?: string;
  otherName?: string | null;
  /** The other person's weekly windows; used to warn about a poor fit. */
  availability?: AvailabilityWindow[];
  /** Categories to list first (what the other person offers or will receive). */
  preferredCategories: string[];
  onSent: () => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [category, setCategory] = useState("");
  const [typeId, setTypeId] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id, label")
      .order("label")
      .then(({ data }) => {
        const all = data ?? [];
        // Volunteer's preferred categories first, the rest after.
        setCategories([
          ...all.filter((c) => preferredCategories.includes(c.id)),
          ...all.filter((c) => !preferredCategories.includes(c.id)),
        ]);
      });
    apiGet<{ serviceTypes: ServiceType[] }>("/api/services/service-types")
      .then((res) => setTypes(res.serviceTypes))
      .catch(() => {});
  }, [preferredCategories]);

  const typesForCategory = types.filter((t) => t.category_id === category);
  const outsideHours = !!startsAt && !withinAvailability(new Date(startsAt).toISOString(), availability);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !name.trim() || !startsAt || !location.trim()) {
      setError("Choose a service, a date and time, and a location.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPost("/api/appointments", {
        client_id: clientId,
        student_id: studentId,
        category_id: category,
        service_type_id: typeId || undefined,
        service_name: name.trim(),
        starts_at: new Date(startsAt).toISOString(),
        est_duration_min: duration,
        location: location.trim(),
        notes: notes.trim() || undefined,
      });
      onSent();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send your request. Please try again."));
    } finally {
      setSending(false);
    }
  }

  const field =
    "w-full rounded-xl border border-k-gray-200 bg-k-white px-3 py-2 text-sm font-normal text-k-black focus:border-k-primary focus:outline-none";
  const label = "flex flex-col gap-1 text-xs font-medium text-k-gray-600";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-k-primary/20 bg-k-white p-5">
      <h3 className="font-serif text-base text-k-black">Request an appointment</h3>
      <label className={label}>
        Category
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setTypeId("");
          }}
          className={field}
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
              {preferredCategories.includes(c.id) ? " ✓" : ""}
            </option>
          ))}
        </select>
      </label>
      {category && (
        <label className={label}>
          Required practical
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              const t = types.find((x) => x.id === e.target.value);
              if (t) setName(t.name);
            }}
            className={field}
          >
            <option value="">Other (type the name below)</option>
            {typesForCategory.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={label}>
        Service name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} className={field} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          Date and time
          <input
            type="datetime-local"
            value={startsAt}
            min={nowLocalInput()}
            onChange={(e) => setStartsAt(e.target.value)}
            className={field}
          />
          {outsideHours && (
            <span className="font-normal text-amber-700">
              That&apos;s outside {otherName ?? "their"} listed availability. You can still send it; they may suggest
              another time.
            </span>
          )}
        </label>
        <label className={label}>
          Estimated duration
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d >= 60 ? `${d / 60} hr${d % 60 ? ` ${d % 60} min` : ""}` : `${d} min`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        Location
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={200}
          placeholder={studentId ? "e.g. Your home, or the training salon" : "e.g. Training salon, or the volunteer's home"}
          className={field}
        />
      </label>
      <label className={label}>
        Note (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={2}
          className={`${field} resize-none`}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white transition-opacity disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-k-gray-600 hover:text-k-black">
          Cancel
        </button>
      </div>
    </form>
  );
}
