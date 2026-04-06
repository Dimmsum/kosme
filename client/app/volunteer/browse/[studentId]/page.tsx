"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  HandHeart,
  Loader2,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

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
  portfolio: PortfolioService[];
}

interface VolunteerRequest {
  id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
}

interface MyRequestsResponse {
  requests: Array<{
    id: string;
    status: "pending" | "accepted" | "declined";
    message: string | null;
    student: { id: string; full_name: string | null } | null;
  }>;
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
            <div className="grid grid-cols-3 gap-1.5">
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

  // Volunteer request state
  const [existingRequest, setExistingRequest] =
    useState<VolunteerRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiGet<PortfolioResponse>(
        `/api/portfolio/${encodeURIComponent(studentId)}`,
      ),
      apiGet<MyRequestsResponse>("/api/volunteer-requests/my"),
    ])
      .then(([portfolioResult, requestsResult]) => {
        if (portfolioResult.status === "rejected") {
          setError("Could not load this portfolio.");
          return;
        }

        setStudent(portfolioResult.value.student);
        setPortfolio(portfolioResult.value.portfolio ?? []);

        if (requestsResult.status === "fulfilled") {
          const match = (requestsResult.value.requests ?? []).find(
            (r) => r.student?.id === studentId,
          );
          if (match) {
            setExistingRequest({
              id: match.id,
              status: match.status,
              message: match.message,
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setRequestError(null);
    try {
      const res = await apiPost<{ request: VolunteerRequest }>(
        "/api/volunteer-requests",
        {
          student_id: studentId,
          message: message.trim() || undefined,
        },
      );
      setExistingRequest(res.request);
      setShowForm(false);
      setMessage("");
    } catch (err: unknown) {
      setRequestError(
        err instanceof Error ? err.message : "Failed to send request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!existingRequest) return;
    setWithdrawing(true);
    try {
      await apiDelete(`/api/volunteer-requests/${existingRequest.id}`);
      setExistingRequest(null);
    } catch (err: unknown) {
      setRequestError(
        err instanceof Error ? err.message : "Failed to withdraw.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

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
          <ArrowLeft size={16} /> Back to browse
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
        <ArrowLeft size={16} /> Back to browse
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

      {/* Volunteer CTA */}
      <div className="mb-8">
        {!existingRequest && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
          >
            <HandHeart size={16} />
            Volunteer as a client
          </button>
        )}

        {existingRequest && (
          <div className="flex items-center gap-3">
            {existingRequest.status === "pending" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700">
                <CheckCircle2 size={14} />
                Request sent — awaiting response
              </span>
            )}
            {existingRequest.status === "accepted" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={14} />
                Request accepted
              </span>
            )}
            {existingRequest.status === "declined" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-600">
                <X size={14} />
                Request declined
              </span>
            )}
            {existingRequest.status === "pending" && (
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="text-xs text-k-gray-400 hover:text-red-500 transition-colors"
              >
                {withdrawing ? "Withdrawing…" : "Withdraw"}
              </button>
            )}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-2 rounded-2xl border border-k-gray-200 bg-k-white p-5 max-w-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-k-black">
                Volunteer as a client
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                  setRequestError(null);
                }}
                className="text-k-gray-400 hover:text-k-black transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 text-xs text-k-gray-400">
              Let {student.full_name?.split(" ")[0] ?? "this student"} know
              you're interested. They'll be able to reach out to you.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message — e.g. what service you're interested in, your availability…"
              rows={3}
              className="w-full rounded-xl border border-k-gray-200 bg-k-gray-100 px-4 py-2.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary focus:bg-k-white resize-none"
            />
            {requestError && (
              <p className="mt-2 text-xs text-red-600">{requestError}</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-k-primary px-5 py-2 text-sm font-medium text-k-white transition-all hover:bg-k-primary-light disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <HandHeart size={14} />
                )}
                {submitting ? "Sending…" : "Send request"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                }}
                className="rounded-full border border-k-gray-200 px-5 py-2 text-sm font-medium text-k-gray-600 hover:bg-k-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

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
