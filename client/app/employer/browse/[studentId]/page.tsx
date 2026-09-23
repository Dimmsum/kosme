"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  EyeOff,
  Heart,
  ImageOff,
  Link2,
  Sparkles,
} from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { VerifiedHours, formatHours, untimedNote } from "@/lib/hours";

interface Photo {
  id: string;
  type: "before" | "after";
  url: string;
}

interface PortfolioService {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  photo_consent: boolean;
  service_photos: Photo[];
  verifications: Array<{
    id: string;
    created_at: string;
    educator: { full_name: string | null } | null;
  }>;
}

interface StudentProfile {
  id: string;
  full_name: string | null;
  institution_id: string | null;
  institutions: { name: string } | null;
}

interface SkillSummaryRow {
  category: string;
  count: number;
  types: Array<{ name: string; count: number }>;
}

interface PortfolioResponse {
  student: StudentProfile | null;
  portfolio: PortfolioService[];
  skills: SkillSummaryRow[];
  hours: VerifiedHours;
}

interface ShortlistResponse {
  shortlist: Array<{ student: { id: string } }>;
}

function initialsFromName(name: string | null): string {
  const safe = (name ?? "Graduate").trim();
  return safe
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {photos.slice(0, 4).map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-square overflow-hidden rounded-xl"
        >
          <img
            src={p.url}
            alt={p.type}
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
}

function ServiceCard({ service }: { service: PortfolioService }) {
  const before = service.service_photos.filter((p) => p.type === "before");
  const after = service.service_photos.filter((p) => p.type === "after");
  const verification = (service.verifications ?? [])[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <p className="font-serif text-base font-medium text-k-black leading-snug">
            {service.name}
          </p>
          <p className="mt-0.5 text-xs text-k-gray-400">
            {service.category_id} &middot;{" "}
            {new Date(service.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={12} /> Verified
        </span>
      </div>

      {service.service_photos.length > 0 ? (
        <div className="px-5 pb-5">
          {before.length > 0 && after.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  Before
                </p>
                <PhotoGrid photos={before} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  After
                </p>
                <PhotoGrid photos={after} />
              </div>
            </div>
          ) : (
            <PhotoGrid photos={service.service_photos} />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-5 pb-5 text-k-gray-400">
          {service.photo_consent ? (
            <>
              <ImageOff size={16} />
              <span className="text-xs">No photos</span>
            </>
          ) : (
            <>
              <EyeOff size={16} />
              <span className="text-xs">Photos withheld · no client consent</span>
            </>
          )}
        </div>
      )}

      {verification?.educator?.full_name && (
        <div className="border-t border-k-gray-200 px-5 py-2.5">
          <p className="text-xs text-k-gray-400">
            Verified by {verification.educator.full_name}
          </p>
        </div>
      )}
    </div>
  );
}

export default function EmployerStudentPortfolioPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioService[]>([]);
  const [skills, setSkills] = useState<SkillSummaryRow[]>([]);
  const [hours, setHours] = useState<VerifiedHours>({
    verified_minutes: 0,
    timed_services: 0,
    untimed_services: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [shortlisted, setShortlisted] = useState(false);
  const [shortlistPending, setShortlistPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      apiGet<PortfolioResponse>(
        `/api/portfolio/${encodeURIComponent(studentId)}`,
      ),
      apiGet<ShortlistResponse>("/api/shortlist"),
    ])
      .then(([portfolioResult, shortlistResult]) => {
        if (portfolioResult.status === "rejected") {
          setError("Could not load this portfolio.");
          return;
        }

        setStudent(portfolioResult.value.student);
        setPortfolio(portfolioResult.value.portfolio ?? []);
        setSkills(portfolioResult.value.skills ?? []);
        if (portfolioResult.value.hours) setHours(portfolioResult.value.hours);

        if (shortlistResult.status === "fulfilled") {
          setShortlisted(
            (shortlistResult.value.shortlist ?? []).some(
              (item) => item.student.id === studentId,
            ),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const categories = useMemo(
    () => Array.from(new Set(portfolio.map((s) => s.category_id))),
    [portfolio],
  );

  const filtered =
    activeCategory === "All"
      ? portfolio
      : portfolio.filter((s) => s.category_id === activeCategory);

  const toggleShortlist = async () => {
    if (shortlistPending) return;
    setShortlistPending(true);
    setActionError(null);
    try {
      if (shortlisted) {
        await apiDelete(`/api/shortlist/${encodeURIComponent(studentId)}`);
        setShortlisted(false);
      } else {
        await apiPost<{ entry: { id: string } }>("/api/shortlist", {
          studentId,
        });
        setShortlisted(true);
      }
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update shortlist.",
      );
    } finally {
      setShortlistPending(false);
    }
  };

  const copyLink = async () => {
    setActionError(null);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Could not copy the link.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <Link
          href="/employer/browse"
          className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black"
        >
          <ArrowLeft size={16} /> Back to browse
        </Link>
        <p className="text-sm text-red-600">
          {error ?? "Portfolio not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link
        href="/employer/browse"
        className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline transition-colors hover:text-k-black"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      {/* Graduate header */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5 min-w-0">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-k-primary to-k-primary-light">
            <span className="text-lg font-semibold text-white">
              {initialsFromName(student.full_name)}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
              {student.full_name ?? "Unnamed Graduate"}
            </h1>
            <p className="mt-0.5 text-sm text-k-gray-400">
              {student.institutions?.name ?? "No institution listed"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-5 py-2.5 text-sm font-medium text-k-black transition-colors hover:bg-k-gray-100"
          >
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button
            onClick={toggleShortlist}
            disabled={shortlistPending}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              shortlisted
                ? "border border-k-gray-200 bg-k-white text-k-black hover:bg-k-gray-100"
                : "bg-k-primary text-k-white hover:bg-k-primary-light"
            }`}
          >
            <Heart
              size={14}
              className={shortlisted ? "fill-k-accent text-k-accent" : ""}
            />
            {shortlisted ? "Shortlisted" : "Add to shortlist"}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="-mt-2 mb-4 text-xs text-red-600">{actionError}</p>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-primary">
            {portfolio.length}
          </p>
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
          <p className="font-serif text-2xl text-k-black">
            {categories.length}
          </p>
          <p className="mt-1 text-xs text-k-gray-400">Categories</p>
        </div>
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-black">
            {
              new Set(
                portfolio
                  .map((s) => s.verifications?.[0]?.educator?.full_name)
                  .filter(Boolean),
              ).size
            }
          </p>
          <p className="mt-1 text-xs text-k-gray-400">Educators</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
        <p className="text-xs text-emerald-700">
          Every service shown here was verified by an educator. Unverified work
          never appears on a portfolio.
        </p>
      </div>

      {/* Skill summary (POR-3) */}
      {skills.length > 0 && (
        <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-k-primary/10">
              <Sparkles size={14} className="text-k-primary" />
            </div>
            <h2 className="font-serif text-lg font-light text-k-black">
              Skill Summary
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {skills.map((skill) => (
              <div key={skill.category}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-k-black">
                    {skill.category}
                  </p>
                  <p className="shrink-0 text-xs text-k-gray-400">
                    {skill.count} verified
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-k-gray-100">
                  <div
                    className="h-full rounded-full bg-k-primary"
                    style={{
                      width: `${(skill.count / skills[0].count) * 100}%`,
                    }}
                  />
                </div>
                {skill.types.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skill.types.map((type) => (
                      <span
                        key={type.name}
                        className="rounded-full bg-k-primary/5 px-2.5 py-0.5 text-[11px] text-k-gray-600"
                      >
                        {type.name} &times;{type.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
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

      {/* Verified services */}
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
