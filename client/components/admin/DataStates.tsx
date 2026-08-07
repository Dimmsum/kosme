import { type ReactNode } from "react";

// Consistent loading / empty / error blocks used inside admin lists and tables.

export function LoadingCard({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      <p className="mt-3 text-sm text-k-gray-400">{label}</p>
    </div>
  );
}

export function EmptyCard({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-k-gray-200 bg-k-white px-6 py-16 text-center">
      <p className="text-sm text-k-gray-400">{label}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>
  );
}
