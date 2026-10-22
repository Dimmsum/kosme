"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { VerifiedHours, formatHours, untimedNote } from "@/lib/hours";
import { PortfolioService, ServiceCard } from "@/components/portfolio/ServiceCard";

interface PortfolioResponse {
  student: {
    id: string;
    full_name: string | null;
    institutions: { name: string } | null;
  } | null;
  portfolio: PortfolioService[];
  skills: Array<{ category: string; count: number }>;
  hours: VerifiedHours;
}

function initialsFromName(name: string | null): string {
  return (name ?? "Student")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EducatorStudentPortfolioPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    apiGet<PortfolioResponse>(`/api/portfolio/${encodeURIComponent(studentId)}`)
      .then(setData)
      .catch(() => setError("Could not load this portfolio."))
      .finally(() => setLoading(false));
  }, [studentId]);

  const portfolio = data?.portfolio ?? [];
  const categories = useMemo(
    () => Array.from(new Set(portfolio.map((s) => s.category_id))),
    [portfolio],
  );
  const filtered =
    activeCategory === "All"
      ? portfolio
      : portfolio.filter((s) => s.category_id === activeCategory);

  const back = (
    <Link
      href="/educator/students"
      className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline transition-colors hover:text-k-black"
    >
      <ArrowLeft size={16} /> Back to students
    </Link>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.student) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {back}
        <p className="text-sm text-red-600">{error ?? "Portfolio not found."}</p>
      </div>
    );
  }

  const { student, hours } = data;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {back}

      <div className="mb-6 flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-k-primary to-k-primary-light">
          <span className="text-lg font-semibold text-white">
            {initialsFromName(student.full_name)}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            {student.full_name ?? "Unnamed Student"}
          </h1>
          <p className="mt-0.5 text-sm text-k-gray-400">
            {student.institutions?.name ?? "No institution listed"} &middot; Portfolio
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-primary">{portfolio.length}</p>
          <p className="mt-1 text-xs text-k-gray-400">Verified services</p>
        </div>
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-black">
            {formatHours(hours.verified_minutes)}
          </p>
          <p className="mt-1 text-xs text-k-gray-400">Verified hours</p>
          {untimedNote(hours.untimed_services) && (
            <p className="mt-0.5 text-[10px] text-k-gray-400">
              {untimedNote(hours.untimed_services)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-black">{categories.length}</p>
          <p className="mt-1 text-xs text-k-gray-400">Categories</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
        <p className="text-xs text-emerald-700">
          This is the portfolio employers see: only educator-verified services appear here.
        </p>
      </div>

      {categories.length > 1 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-k-primary text-k-white"
                  : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <p className="text-sm text-k-gray-400">No verified services yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
