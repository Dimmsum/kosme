import { type ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned action(s), e.g. a "New" button. */
  action?: ReactNode;
  /** Optional breadcrumb / back link rendered above the title. */
  eyebrow?: ReactNode;
}

// Shared header for every admin module page — keeps titles/subtitles consistent
// with the dashboard overview and role dashboards.
export default function AdminHeader({ title, subtitle, action, eyebrow }: AdminHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium text-k-gray-400">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-light text-k-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-light text-k-gray-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
