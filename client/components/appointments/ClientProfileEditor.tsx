"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage, apiGet, apiPut } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { AvailabilityWindow } from "@/lib/appointments";
import AvailabilityEditor from "./AvailabilityEditor";

interface ProfileData {
  bio: string | null;
  location: string | null;
  willing_to_travel: boolean;
  services_willing: string[];
  availability: AvailabilityWindow[];
  is_listed: boolean;
}

/** What students see on a volunteer's profile: bio, services, and weekly times. */
export default function ClientProfileEditor() {
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [travel, setTravel] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [listed, setListed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id, label")
      .order("label")
      .then(({ data }) => setCategories(data ?? []));
    apiGet<{ profile: ProfileData }>("/api/client-profile/me")
      .then(({ profile }) => {
        setBio(profile.bio ?? "");
        setLocation(profile.location ?? "");
        setTravel(profile.willing_to_travel);
        setServices(profile.services_willing);
        setAvailability(profile.availability);
        setListed(profile.is_listed);
      })
      .catch(() => setError("Could not load your volunteer profile."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiPut("/api/client-profile/me", {
        bio: bio.trim() || null,
        location: location.trim() || null,
        willing_to_travel: travel,
        services_willing: services,
        availability,
        is_listed: listed,
      });
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-k-gray-200 bg-k-white px-3 py-2 text-sm text-k-black focus:border-k-primary focus:outline-none";
  const heading = "mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-k-gray-400";

  return (
    <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
      <h3 className="font-serif text-lg text-k-black">Student-facing profile</h3>
      <p className="mb-5 mt-0.5 text-xs text-k-gray-400">
        Students use this to decide who to book. Your phone number is never shown.
      </p>

      {loading ? (
        <p className="text-sm text-k-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className={heading}>About you</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="A few words for students — e.g. hair type, what you usually have done."
              className={`${field} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={heading}>Area</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
              placeholder="e.g. Kingston"
              className={field}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-k-gray-600">
            <input
              type="checkbox"
              checked={travel}
              onChange={(e) => setTravel(e.target.checked)}
              className="h-4 w-4 accent-k-primary"
            />
            I&apos;m willing to travel to the student
          </label>

          <div>
            <p className={heading}>Services I&apos;m happy to receive</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = services.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setServices((prev) => (on ? prev.filter((s) => s !== c.id) : [...prev, c.id]))
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? "border-k-primary bg-k-primary text-k-white"
                        : "border-k-gray-200 text-k-gray-600 hover:border-k-primary/30"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className={heading}>When I&apos;m available</p>
            <AvailabilityEditor value={availability} onChange={setAvailability} />
          </div>

          <label className="flex items-center gap-2 text-sm text-k-gray-600">
            <input
              type="checkbox"
              checked={listed}
              onChange={(e) => setListed(e.target.checked)}
              className="h-4 w-4 accent-k-primary"
            />
            Show me to students looking for a practice client
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {saved && <span className="text-xs text-emerald-600">Saved</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
