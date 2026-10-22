"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ImageOff,
  MapPin,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { DAYS, StudentListing } from "@/lib/appointments";
import RequestAppointmentForm from "@/components/appointments/RequestAppointmentForm";

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

interface PortfolioResponse {
  student: StudentProfile | null;
  listing: StudentListing | null;
  portfolio: PortfolioService[];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ServiceCard({ service }: { service: PortfolioService }) {
  const before = service.service_photos.filter((p) => p.type === "before");
  const after = service.service_photos.filter((p) => p.type === "after");
  const hasPhotos = service.service_photos.length > 0;
  const verification = (service.verifications ?? [])[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
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
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={11} />
          Verified
        </div>
      </div>

      {hasPhotos ? (
        <div className="px-5 pb-5">
          {before.length > 0 && after.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  Before
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {before.slice(0, 4).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={p.url}
                        alt="Before"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  After
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {after.slice(0, 4).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={p.url}
                        alt="After"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {service.service_photos.slice(0, 6).map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg"
                >
                  <img
                    src={p.url}
                    alt={p.type}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-5 pb-5 text-k-gray-300">
          <ImageOff size={16} />
          <span className="text-xs">No photos</span>
        </div>
      )}

      {verification?.educator?.full_name && (
        <div className="border-t border-k-gray-100 px-5 py-2.5">
          <p className="text-xs text-k-gray-400">
            Verified by {verification.educator.full_name}
          </p>
        </div>
      )}
    </div>
  );
}

export default function StudentPortfolioPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [listing, setListing] = useState<StudentListing | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiGet<PortfolioResponse>(`/api/portfolio/${encodeURIComponent(studentId)}`)
      .then((res) => {
        setStudent(res.student);
        setListing(res.listing);
        setPortfolio(res.portfolio ?? []);
      })
      .catch(() => setError("Could not load this portfolio."))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="px-4 py-8 sm:px-6 md:px-8">
        <Link
          href="/volunteer/browse"
          className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black"
        >
          <ArrowLeft size={16} /> Back to Find a Service
        </Link>
        <p className="text-sm text-red-600">
          {error ?? "Portfolio not found."}
        </p>
      </div>
    );
  }

  const categories = Array.from(new Set(portfolio.map((s) => s.category_id)));

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link
        href="/volunteer/browse"
        className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black transition-colors"
      >
        <ArrowLeft size={16} /> Back to Find a Service
      </Link>

      {/* Student profile header */}
      <div className="mb-6 flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-k-primary/10">
          <span className="font-serif text-xl font-light text-k-primary">
            {initials(student.full_name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            {student.full_name ?? "Student"}
          </h1>
          {student.institutions?.name && (
            <p className="mt-0.5 text-sm text-k-gray-400">
              {student.institutions.name}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              {portfolio.length} verified{" "}
              {portfolio.length === 1 ? "service" : "services"}
            </span>
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-k-gray-100 px-3 py-1 text-xs font-medium text-k-gray-600"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Availability + request a service */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
          {listing?.bio && <p className="mb-4 text-sm leading-relaxed text-k-gray-600">{listing.bio}</p>}

          {listing?.location && (
            <p className="mb-4 flex items-center gap-1.5 text-xs text-k-gray-600">
              <MapPin size={12} className="text-k-gray-400" />
              {listing.location}
              {listing.willing_to_travel ? " · willing to travel" : ""}
            </p>
          )}

          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
            Availability
          </h3>
          {!listing || listing.availability.length === 0 ? (
            <p className="text-sm text-k-gray-400">No set times. Request a time and they can suggest another.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-k-black">
              {DAYS.flatMap((d) =>
                listing.availability
                  .filter((w) => w.day === d.key)
                  .map((w, i) => (
                    <li key={`${d.key}-${i}`} className="flex gap-3">
                      <span className="w-24 text-k-gray-600">{d.label}</span>
                      <span>
                        {w.from}–{w.to}
                      </span>
                    </li>
                  )),
              )}
            </ul>
          )}
        </div>

        <div>
          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={15} />
                Request sent to {student.full_name?.split(" ")[0] ?? "the student"}
              </p>
              <p className="mt-1 text-xs text-emerald-700/80">
                They&apos;ll accept, decline or suggest another time. Follow it under Upcoming.
              </p>
              <Link
                href="/volunteer/appointments"
                className="mt-3 inline-block text-xs font-medium text-k-primary no-underline hover:underline"
              >
                View upcoming services →
              </Link>
            </div>
          ) : requesting ? (
            <RequestAppointmentForm
              studentId={student.id}
              otherName={student.full_name?.split(" ")[0] ?? null}
              availability={listing?.availability ?? []}
              preferredCategories={Array.from(new Set([...(listing?.services_offered ?? []), ...categories]))}
              onCancel={() => setRequesting(false)}
              onSent={() => {
                setRequesting(false);
                setSent(true);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="inline-flex items-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
            >
              <CalendarClock size={16} />
              Request a service
            </button>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg text-k-black">Verified portfolio</h2>

      {/* Portfolio grid */}
      {portfolio.length === 0 ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-20 text-center">
          <p className="text-sm text-k-gray-400">No verified services yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:grid lg:grid-cols-2">
          {portfolio.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
