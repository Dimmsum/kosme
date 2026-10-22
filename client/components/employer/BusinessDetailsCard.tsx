"use client";

import { useEffect, useState } from "react";
import { Store, Save, Edit3 } from "lucide-react";
import { apiGet, apiPut, apiErrorMessage } from "@/lib/api";

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  salon: "Salon",
  spa: "Spa",
  barbershop: "Barbershop",
  mobile_service: "Mobile service",
  school_academy: "School / academy",
  agency: "Agency",
  other: "Other",
};

interface Business {
  business_name: string | null;
  contact_person: string | null;
  location: string | null;
  business_type: string | null;
  verification_status: "pending" | "verified" | "rejected";
}

const inputClass =
  "w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-2.5 text-sm text-k-black outline-none transition-colors focus:border-k-primary";

// The employer's own business details (SFB-6). Verification status is set by
// Super Admin and shown read-only here.
export default function BusinessDetailsCard() {
  const [b, setB] = useState<Business | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ business: Business }>("/api/employer-profile")
      .then((r) => setB(r.business))
      .catch((e) => setError(apiErrorMessage(e, "Failed to load business details.")));
  }, []);

  async function toggle() {
    if (!editing) return setEditing(true);
    if (!b) return;
    setSaving(true);
    setError("");
    try {
      const r = await apiPut<{ business: Business }>("/api/employer-profile", {
        business_name: b.business_name,
        contact_person: b.contact_person,
        location: b.location,
        business_type: b.business_type,
      });
      setB(r.business);
      setEditing(false);
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to save business details."));
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof Business, value: string) => setB((cur) => (cur ? { ...cur, [field]: value || null } : cur));

  const fields: { key: "business_name" | "contact_person" | "location"; label: string }[] = [
    { key: "business_name", label: "Business name" },
    { key: "contact_person", label: "Contact person" },
    { key: "location", label: "Location" },
  ];

  return (
    <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-serif text-lg text-k-black">
          <Store size={16} /> Business details
        </h3>
        <button
          onClick={toggle}
          disabled={saving || !b}
          className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-4 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
        >
          {editing ? <Save size={12} /> : <Edit3 size={12} />}
          {saving ? "Saving..." : editing ? "Save" : "Edit"}
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      {b && (
        <div className="flex flex-col gap-4">
          {fields.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-k-gray-400">{label}</span>
              {editing ? (
                <input className={inputClass} value={b[key] ?? ""} maxLength={255} onChange={(e) => set(key, e.target.value)} />
              ) : (
                <span className="text-sm text-k-black">{b[key] ?? "—"}</span>
              )}
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-k-gray-400">Business type</span>
            {editing ? (
              <select className={inputClass} value={b.business_type ?? ""} onChange={(e) => set("business_type", e.target.value)}>
                <option value="">— not set —</option>
                {Object.entries(BUSINESS_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-k-black">{b.business_type ? BUSINESS_TYPE_LABELS[b.business_type] : "—"}</span>
            )}
          </label>
          <p className="text-xs text-k-gray-400">
            Verification: <span className="font-medium capitalize text-k-gray-600">{b.verification_status}</span>
          </p>
        </div>
      )}
    </div>
  );
}
