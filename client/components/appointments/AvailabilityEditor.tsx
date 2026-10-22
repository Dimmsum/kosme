"use client";

import { Plus, Trash2 } from "lucide-react";
import { AvailabilityWindow, DAYS, Day } from "@/lib/appointments";

/** Weekly windows when someone can give or receive a service. */
export default function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityWindow[];
  onChange: (next: AvailabilityWindow[]) => void;
}) {
  const update = (i: number, patch: Partial<AvailabilityWindow>) =>
    onChange(value.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

  const input =
    "rounded-xl border border-k-gray-200 bg-k-white px-2.5 py-1.5 text-sm text-k-black focus:border-k-primary focus:outline-none";

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <p className="text-xs text-k-gray-400">No times added yet. You&apos;ll be shown as flexible.</p>
      )}
      {value.map((w, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={w.day}
            onChange={(e) => update(i, { day: e.target.value as Day })}
            aria-label="Day"
            className={input}
          >
            {DAYS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={w.from}
            onChange={(e) => update(i, { from: e.target.value })}
            aria-label="From"
            className={input}
          />
          <span className="text-xs text-k-gray-400">to</span>
          <input
            type="time"
            value={w.to}
            onChange={(e) => update(i, { to: e.target.value })}
            aria-label="To"
            className={input}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Remove time"
            className="flex h-8 w-8 items-center justify-center rounded-full text-k-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {value.length < 21 && (
        <button
          type="button"
          onClick={() => onChange([...value, { day: "mon", from: "09:00", to: "12:00" }])}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-k-gray-200 px-3.5 py-1.5 text-xs font-medium text-k-gray-600 hover:border-k-primary/30 hover:text-k-primary"
        >
          <Plus size={12} /> Add a time
        </button>
      )}
    </div>
  );
}
