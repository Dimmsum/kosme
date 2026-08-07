import { type ReactNode } from "react";

// Minimal labelled form controls shared across admin create/edit forms, so every
// modal form looks the same without repeating Tailwind classes.

const inputClass =
  "w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-2.5 text-sm text-k-black outline-none transition-colors focus:border-k-primary";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-k-gray-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-light text-k-gray-400">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[90px] resize-y`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

// Standard modal footer buttons (cancel + submit).
export function FormActions({
  onCancel,
  submitLabel = "Save",
  busy = false,
  disabled = false,
}: {
  onCancel: () => void;
  submitLabel?: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy || disabled}
        className="rounded-full bg-k-primary px-5 py-2 text-sm font-medium text-k-white transition-colors hover:bg-k-primary-light disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
