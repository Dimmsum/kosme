"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  User,
  CalendarDays,
  Tag,
  FileText,
  ImageOff,
  Lock,
  Timer,
  Sparkles,
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type ServiceStatus =
  | "in_progress"
  | "awaiting_client"
  | "awaiting_educator"
  | "corrections_requested"
  | "verified"
  | "rejected";

type DurationTag = "under" | "within" | "over";

interface ServicePhoto {
  id: string;
  type: "before" | "after";
  url: string;
  created_at: string;
}

interface Confirmation {
  id: string;
  status: string;
  created_at: string;
}

interface Verification {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ServiceDetail {
  id: string;
  name: string;
  category_id: string;
  notes: string | null;
  reflection_notes: string | null;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  actual_duration_min: number | null;
  adjusted_duration_min: number | null;
  duration_tag: DurationTag | null;
  student: { id: string; full_name: string | null };
  client: { id: string; full_name: string | null } | null;
  service_photos: ServicePhoto[];
  confirmations: Confirmation[];
  verifications: Verification[];
}

const STATUS_CONFIG: Record<
  ServiceStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    Icon: typeof CheckCircle2;
  }
> = {
  in_progress: {
    label: "In Progress",
    color: "text-k-primary",
    bgColor: "bg-k-primary/10",
    borderColor: "border-k-primary/20",
    Icon: Timer,
  },
  verified: {
    label: "Verified",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    Icon: CheckCircle2,
  },
  awaiting_educator: {
    label: "Awaiting Educator",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    Icon: Clock,
  },
  awaiting_client: {
    label: "Awaiting Client",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    Icon: AlertCircle,
  },
  corrections_requested: {
    label: "Corrections Requested",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    Icon: AlertCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    Icon: XCircle,
  },
};

const PIPELINE: { key: ServiceStatus; label: string; description: string }[] = [
  {
    key: "awaiting_client",
    label: "Client Confirmation",
    description: "Waiting for the client to confirm the session.",
  },
  {
    key: "awaiting_educator",
    label: "Educator Review",
    description: "Your educator is reviewing and verifying your work.",
  },
  {
    key: "verified",
    label: "Verified",
    description: "Work has been verified and added to your portfolio.",
  },
];

function pipelineStep(status: ServiceStatus): number {
  if (status === "rejected") return -1;
  // Corrections requested is a bounce-back from educator review, not a new
  // pipeline stage — keep the stepper pinned on "Educator Review".
  if (status === "corrections_requested") {
    return PIPELINE.findIndex((s) => s.key === "awaiting_educator");
  }
  return PIPELINE.findIndex((s) => s.key === status);
}

const DURATION_TAG_CFG: Record<DurationTag, { label: string; className: string }> = {
  under: { label: "Under recommended", className: "bg-amber-50 text-amber-700" },
  within: { label: "Within recommended", className: "bg-emerald-50 text-emerald-700" },
  over: { label: "Over recommended", className: "bg-red-50 text-red-700" },
};

function normalizeToArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [sendConfirmationError, setSendConfirmationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [kaiLoading, setKaiLoading] = useState(false);
  const [kaiMessage, setKaiMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ service: ServiceDetail }>(`/api/services/${id}`)
      .then((res) => {
        setService(res.service);
        setReflectionDraft(res.service.reflection_notes ?? "");
      })
      .catch(() => setError("Could not load service."))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveReflection() {
    if (!service) return;
    setSavingReflection(true);
    setReflectionError(null);
    setReflectionSaved(false);
    try {
      const res = await apiPatch<{ service: { id: string; reflection_notes: string | null } }>(
        `/api/services/${service.id}`,
        { reflection_notes: reflectionDraft.trim() || null },
      );
      setService((prev) =>
        prev ? { ...prev, reflection_notes: res.service.reflection_notes } : prev,
      );
      setReflectionSaved(true);
    } catch {
      setReflectionError("Could not save your reflection. Please try again.");
    } finally {
      setSavingReflection(false);
    }
  }

  async function sendForConfirmation() {
    if (!service) return;
    setSendingConfirmation(true);
    setSendConfirmationError(null);
    try {
      const res = await apiPost<{ service: { id: string; status: ServiceStatus } }>(
        `/api/confirmations/${service.id}/send`,
      );
      setService((prev) => (prev ? { ...prev, status: res.service.status } : prev));
    } catch {
      setSendConfirmationError("Could not send this service for client confirmation. Please try again.");
    } finally {
      setSendingConfirmation(false);
    }
  }

  async function askKai() {
    setKaiLoading(true);
    setKaiMessage(null);
    try {
      const res = await apiPost<{ available: boolean; message: string }>(
        "/api/kai/log-assist",
      );
      setKaiMessage(res.message);
    } catch {
      setKaiMessage("KAI Log Assist is not yet available.");
    } finally {
      setKaiLoading(false);
    }
  }

  async function resubmit() {
    if (!service) return;
    setResubmitting(true);
    setResubmitError(null);
    try {
      const res = await apiPost<{ service: { id: string; status: ServiceStatus } }>(
        `/api/services/${service.id}/resubmit`,
      );
      setService((prev) => (prev ? { ...prev, status: res.service.status } : prev));
    } catch {
      setResubmitError("Could not resubmit this service. Please try again.");
    } finally {
      setResubmitting(false);
    }
  }

  async function submitForVerification() {
    if (!service) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiPost<{ service: { id: string; status: ServiceStatus } }>(
        `/api/services/${service.id}/submit`,
      );
      setService((prev) => (prev ? { ...prev, status: res.service.status } : prev));
    } catch {
      setSubmitError("Could not submit this service for verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="px-4 py-8 sm:px-6 md:px-8">
        <Link
          href="/student/services"
          className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black"
        >
          <ArrowLeft size={16} /> Back to services
        </Link>
        <p className="text-sm text-red-600">{error ?? "Service not found."}</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[service.status];
  const StatusIcon = cfg.Icon;
  const photos = normalizeToArray<ServicePhoto>(service.service_photos);
  const confirmations = normalizeToArray<Confirmation>(service.confirmations);
  const verifications = normalizeToArray<Verification>(service.verifications);
  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");
  const stepIndex = pipelineStep(service.status);
  const rejection = verifications.find((v) => v.status === "rejected");
  const corrections = verifications.find(
    (v) => v.status === "corrections_requested",
  );

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Back */}
      <Link
        href="/student/services"
        className="mb-5 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black transition-colors"
      >
        <ArrowLeft size={16} /> Back to services
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            {service.name}
          </h1>
          <p className="mt-1 text-sm text-k-gray-400">
            {new Date(service.created_at).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`inline-flex max-w-full items-center gap-1.5 self-start rounded-full border px-3.5 py-1.5 text-xs font-medium ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}
        >
          <StatusIcon size={13} />
          {cfg.label}
        </span>
      </div>

      {service.status === "verified" && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5">
          <Lock size={15} className="shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            This service has been verified and is now locked. No further changes
            can be made.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Details card */}
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-base font-medium text-k-black">
              Details
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <Tag size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                    Category
                  </p>
                  <p className="mt-0.5 text-sm text-k-black">
                    {service.category_id}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <User size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                    Client
                  </p>
                  <p className="mt-0.5 text-sm text-k-black">
                    {service.client?.full_name ?? "No client"}
                  </p>
                </div>
              </div>

              {service.actual_duration_min != null && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                    <Timer size={14} className="text-k-gray-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                      Duration
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-k-black">
                      {service.adjusted_duration_min != null ? (
                        <>
                          <span className="text-k-gray-400 line-through">
                            {service.actual_duration_min} min
                          </span>
                          {service.adjusted_duration_min} min
                          <span className="rounded-full bg-k-primary/10 px-2 py-0.5 text-[11px] font-medium text-k-primary">
                            Adjusted by educator
                          </span>
                        </>
                      ) : (
                        <>
                          {service.actual_duration_min} min
                          {service.duration_tag && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DURATION_TAG_CFG[service.duration_tag].className}`}
                            >
                              {DURATION_TAG_CFG[service.duration_tag].label}
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <CalendarDays size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                    Last updated
                  </p>
                  <p className="mt-0.5 text-sm text-k-black">
                    {new Date(service.updated_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {service.notes && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                    <FileText size={14} className="text-k-gray-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                      Notes
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-k-black">
                      {service.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reflection notes */}
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="font-serif text-base font-medium text-k-black">
                Reflection
              </h2>
              {service.status !== "verified" && (
                <button
                  type="button"
                  onClick={askKai}
                  disabled={kaiLoading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-k-primary/30 bg-k-primary/5 px-3 py-1 text-xs font-medium text-k-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles size={12} />
                  {kaiLoading ? "Asking KAI…" : "Ask KAI to help"}
                </button>
              )}
            </div>
            <p className="mb-4 text-xs text-k-gray-400">
              What did you learn from this service? Add your reflection any
              time before it&apos;s verified.
            </p>
            {kaiMessage && (
              <p className="mb-4 rounded-xl bg-k-primary/5 px-3.5 py-2.5 text-xs text-k-primary">
                {kaiMessage}
              </p>
            )}
            {service.status === "verified" ? (
              <p className="text-sm leading-relaxed text-k-black">
                {service.reflection_notes || (
                  <span className="text-k-gray-400">No reflection was added.</span>
                )}
              </p>
            ) : (
              <>
                <textarea
                  value={reflectionDraft}
                  onChange={(e) => {
                    setReflectionDraft(e.target.value);
                    setReflectionSaved(false);
                  }}
                  maxLength={2000}
                  rows={4}
                  placeholder="Reflect on how the service went, what you'd do differently, what you learned…"
                  className="w-full resize-none rounded-xl border border-k-gray-200 bg-k-white p-3 text-sm text-k-black placeholder:text-k-gray-300 focus:border-k-primary focus:outline-none"
                />
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveReflection}
                    disabled={
                      savingReflection ||
                      reflectionDraft === (service.reflection_notes ?? "")
                    }
                    className="rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingReflection ? "Saving…" : "Save reflection"}
                  </button>
                  {reflectionSaved && (
                    <span className="text-xs text-emerald-600">Saved</span>
                  )}
                  {reflectionError && (
                    <span className="text-xs text-red-600">{reflectionError}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Rejection reason */}
          {service.status === "rejected" && rejection && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Service Rejected
                  </p>
                  {rejection.notes && (
                    <p className="mt-1 text-sm leading-relaxed text-red-600">
                      {rejection.notes}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-red-400">
                    {new Date(rejection.created_at).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Corrections requested by educator */}
          {service.status === "corrections_requested" && corrections && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Corrections Requested
                  </p>
                  {corrections.notes && (
                    <p className="mt-1 text-sm leading-relaxed text-orange-700">
                      {corrections.notes}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-orange-400">
                    {new Date(corrections.created_at).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={resubmit}
                  disabled={resubmitting}
                  className="rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {resubmitting ? "Resubmitting…" : "Resubmit for review"}
                </button>
                {resubmitError && (
                  <span className="text-xs text-red-600">{resubmitError}</span>
                )}
              </div>
            </div>
          )}

          {/* Send for client confirmation (resend after a client dispute) */}
          {service.status === "rejected" && service.client && (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-1 font-serif text-base font-medium text-k-black">
                Client Confirmation
              </h2>
              <p className="mb-4 text-xs text-k-gray-400">
                Your client disputed this service. Once you&apos;ve resolved the
                issue, send it back for their confirmation.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={sendForConfirmation}
                  disabled={sendingConfirmation}
                  className="rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingConfirmation ? "Sending…" : "Send for client confirmation"}
                </button>
                {sendConfirmationError && (
                  <span className="text-xs text-red-600">{sendConfirmationError}</span>
                )}
              </div>
            </div>
          )}

          {/* Submit for verification — gated on client confirmation + evidence + reflection */}
          {service.status === "awaiting_client" &&
            confirmations.some((c) => c.status === "confirmed") && (
              <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
                <h2 className="mb-1 font-serif text-base font-medium text-k-black">
                  Submit for Verification
                </h2>
                <p className="mb-4 text-xs text-k-gray-400">
                  Your client has confirmed this service. Complete the checklist
                  below, then submit it to your educator for review.
                </p>
                <ul className="mb-4 flex flex-col gap-2">
                  {[
                    { label: "Client confirmed", done: true },
                    {
                      label: "At least one evidence photo",
                      done: photos.length > 0,
                    },
                    {
                      label: "Reflection notes added",
                      done: Boolean(service.reflection_notes?.trim()),
                    },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-2.5 text-sm">
                      {item.done ? (
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0 text-k-gray-300" />
                      )}
                      <span className={item.done ? "text-k-black" : "text-k-gray-400"}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
                {photos.length === 0 && (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-k-primary/5 px-3.5 py-2.5">
                    <p className="text-xs text-k-primary">
                      Missing evidence photos — KAI can suggest what to capture.
                    </p>
                    <button
                      type="button"
                      onClick={askKai}
                      disabled={kaiLoading}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-k-primary/30 bg-k-white px-3 py-1 text-xs font-medium text-k-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Sparkles size={12} />
                      {kaiLoading ? "Asking…" : "Ask KAI"}
                    </button>
                  </div>
                )}
                {kaiMessage && (
                  <p className="mb-4 rounded-xl bg-k-primary/5 px-3.5 py-2.5 text-xs text-k-primary">
                    {kaiMessage}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={submitForVerification}
                    disabled={
                      submitting ||
                      photos.length === 0 ||
                      !service.reflection_notes?.trim()
                    }
                    className="rounded-full bg-k-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? "Submitting…" : "Submit for verification"}
                  </button>
                  {submitError && (
                    <span className="text-xs text-red-600">{submitError}</span>
                  )}
                </div>
              </div>
            )}

          {/* Photos */}
          {beforePhotos.length > 0 || afterPhotos.length > 0 ? (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-base font-medium text-k-black">
                Photos
              </h2>
              {beforePhotos.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
                    Before
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {beforePhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block aspect-square overflow-hidden rounded-xl border border-k-gray-200"
                      >
                        <img
                          src={photo.url}
                          alt="Before"
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
                    After
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {afterPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block aspect-square overflow-hidden rounded-xl border border-k-gray-200"
                      >
                        <img
                          src={photo.url}
                          alt="After"
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-3 font-serif text-base font-medium text-k-black">
                Photos
              </h2>
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ImageOff size={28} className="text-k-gray-300" />
                <p className="text-sm text-k-gray-400">
                  No photos uploaded for this service.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — pipeline ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
            <h2 className="mb-5 font-serif text-base font-medium text-k-black">
              Verification Pipeline
            </h2>

            {service.status === "rejected" ? (
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <XCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Rejected by educator
                  </p>
                  <p className="mt-0.5 text-xs text-k-gray-400">
                    Review the feedback and resubmit.
                  </p>
                </div>
              </div>
            ) : service.status === "corrections_requested" ? (
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <AlertCircle size={14} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Corrections requested
                  </p>
                  <p className="mt-0.5 text-xs text-k-gray-400">
                    Fix the feedback below, then resubmit for review.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {PIPELINE.map((step, i) => {
                  const done = i < stepIndex;
                  const active = i === stepIndex;
                  const pending = i > stepIndex;
                  return (
                    <div key={step.key} className="relative flex gap-3">
                      {/* Connector line */}
                      {i < PIPELINE.length - 1 && (
                        <div
                          className={`absolute left-[13px] top-7 h-full w-0.5 ${done ? "bg-emerald-200" : "bg-k-gray-200"}`}
                        />
                      )}
                      {/* Dot */}
                      <div
                        className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                          done
                            ? "border-emerald-500 bg-emerald-500"
                            : active
                              ? "border-k-primary bg-k-primary"
                              : "border-k-gray-200 bg-k-white"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 size={12} className="text-white" />
                        ) : active ? (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </div>
                      {/* Label */}
                      <div
                        className={`pb-6 ${i === PIPELINE.length - 1 ? "pb-0" : ""}`}
                      >
                        <p
                          className={`text-sm font-medium leading-tight ${
                            done
                              ? "text-emerald-700"
                              : active
                                ? "text-k-primary"
                                : "text-k-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-k-gray-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirmation record */}
          {confirmations.length > 0 && (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-3 font-serif text-base font-medium text-k-black">
                Client Confirmation
              </h2>
              {confirmations.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-500 shrink-0"
                  />
                  <div>
                    <p className="text-sm text-k-black capitalize">
                      {c.status}
                    </p>
                    <p className="text-xs text-k-gray-400">
                      {new Date(c.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification record */}
          {verifications.filter((v) => v.status === "verified").length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
              <h2 className="mb-3 font-serif text-base font-medium text-emerald-800">
                Educator Verified
              </h2>
              {verifications
                .filter((v) => v.status === "verified")
                .map((v) => (
                  <div key={v.id}>
                    {v.notes && (
                      <p className="mb-1.5 text-sm text-emerald-700">
                        {v.notes}
                      </p>
                    )}
                    <p className="text-xs text-emerald-600">
                      {new Date(v.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
