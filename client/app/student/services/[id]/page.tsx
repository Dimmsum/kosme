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
} from "lucide-react";
import { apiGet } from "@/lib/api";

type ServiceStatus = "awaiting_client" | "awaiting_educator" | "verified" | "rejected";

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
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
  student: { id: string; full_name: string | null };
  client: { id: string; full_name: string | null } | null;
  service_photos: ServicePhoto[];
  confirmations: Confirmation[];
  verifications: Verification[];
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bgColor: string; borderColor: string; Icon: typeof CheckCircle2 }> = {
  verified:          { label: "Verified",          color: "text-emerald-700", bgColor: "bg-emerald-50",  borderColor: "border-emerald-200", Icon: CheckCircle2 },
  awaiting_educator: { label: "Awaiting Educator",  color: "text-blue-700",   bgColor: "bg-blue-50",    borderColor: "border-blue-200",    Icon: Clock        },
  awaiting_client:   { label: "Awaiting Client",    color: "text-amber-700",  bgColor: "bg-amber-50",   borderColor: "border-amber-200",   Icon: AlertCircle  },
  rejected:          { label: "Rejected",           color: "text-red-700",    bgColor: "bg-red-50",     borderColor: "border-red-200",     Icon: XCircle      },
};

const PIPELINE: { key: ServiceStatus; label: string; description: string }[] = [
  { key: "awaiting_client",   label: "Client Confirmation",  description: "Waiting for the client to confirm the session." },
  { key: "awaiting_educator", label: "Educator Review",      description: "Your educator is reviewing and verifying your work." },
  { key: "verified",          label: "Verified",             description: "Work has been verified and added to your portfolio." },
];

function pipelineStep(status: ServiceStatus): number {
  if (status === "rejected") return -1;
  return PIPELINE.findIndex((s) => s.key === status);
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ service: ServiceDetail }>(`/api/services/${id}`)
      .then((res) => setService(res.service))
      .catch(() => setError("Could not load service."))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Link href="/student/services" className="mb-6 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black">
          <ArrowLeft size={16} /> Back to services
        </Link>
        <p className="text-sm text-red-600">{error ?? "Service not found."}</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[service.status];
  const StatusIcon = cfg.Icon;
  const photos        = service.service_photos  ?? [];
  const confirmations = service.confirmations   ?? [];
  const verifications = service.verifications   ?? [];
  const beforePhotos  = photos.filter((p) => p.type === "before");
  const afterPhotos   = photos.filter((p) => p.type === "after");
  const stepIndex     = pipelineStep(service.status);
  const rejection     = verifications.find((v) => v.status === "rejected");

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Back */}
      <Link href="/student/services"
        className="mb-5 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black transition-colors">
        <ArrowLeft size={16} /> Back to services
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">{service.name}</h1>
          <p className="mt-1 text-sm text-k-gray-400">
            {new Date(service.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3.5 py-1.5 text-xs font-medium ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
          <StatusIcon size={13} />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Details card */}
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-base font-medium text-k-black">Details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <Tag size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">Category</p>
                  <p className="mt-0.5 text-sm text-k-black">{service.category_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <User size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">Client</p>
                  <p className="mt-0.5 text-sm text-k-black">{service.client?.full_name ?? "No client"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                  <CalendarDays size={14} className="text-k-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">Last updated</p>
                  <p className="mt-0.5 text-sm text-k-black">
                    {new Date(service.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {service.notes && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-k-gray-100">
                    <FileText size={14} className="text-k-gray-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">Notes</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-k-black">{service.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rejection reason */}
          {service.status === "rejected" && rejection && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-700">Service Rejected</p>
                  {rejection.notes && (
                    <p className="mt-1 text-sm leading-relaxed text-red-600">{rejection.notes}</p>
                  )}
                  <p className="mt-1.5 text-xs text-red-400">
                    {new Date(rejection.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          {(beforePhotos.length > 0 || afterPhotos.length > 0) ? (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-4 font-serif text-base font-medium text-k-black">Photos</h2>
              {beforePhotos.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">Before</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {beforePhotos.map((photo) => (
                      <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"
                        className="group block aspect-square overflow-hidden rounded-xl border border-k-gray-200">
                        <img src={photo.url} alt="Before" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">After</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {afterPhotos.map((photo) => (
                      <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"
                        className="group block aspect-square overflow-hidden rounded-xl border border-k-gray-200">
                        <img src={photo.url} alt="After" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
              <h2 className="mb-3 font-serif text-base font-medium text-k-black">Photos</h2>
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ImageOff size={28} className="text-k-gray-300" />
                <p className="text-sm text-k-gray-400">No photos uploaded for this service.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — pipeline ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-k-gray-200 bg-k-white p-5 sm:p-6">
            <h2 className="mb-5 font-serif text-base font-medium text-k-black">Verification Pipeline</h2>

            {service.status === "rejected" ? (
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <XCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">Rejected by educator</p>
                  <p className="mt-0.5 text-xs text-k-gray-400">Review the feedback and resubmit.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {PIPELINE.map((step, i) => {
                  const done    = i < stepIndex;
                  const active  = i === stepIndex;
                  const pending = i > stepIndex;
                  return (
                    <div key={step.key} className="relative flex gap-3">
                      {/* Connector line */}
                      {i < PIPELINE.length - 1 && (
                        <div className={`absolute left-[13px] top-7 h-full w-0.5 ${done ? "bg-emerald-200" : "bg-k-gray-200"}`} />
                      )}
                      {/* Dot */}
                      <div className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        done    ? "border-emerald-500 bg-emerald-500" :
                        active  ? "border-k-primary bg-k-primary" :
                                  "border-k-gray-200 bg-k-white"
                      }`}>
                        {done ? (
                          <CheckCircle2 size={12} className="text-white" />
                        ) : active ? (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </div>
                      {/* Label */}
                      <div className={`pb-6 ${i === PIPELINE.length - 1 ? "pb-0" : ""}`}>
                        <p className={`text-sm font-medium leading-tight ${
                          done ? "text-emerald-700" : active ? "text-k-primary" : "text-k-gray-400"
                        }`}>
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-k-gray-400">{step.description}</p>
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
              <h2 className="mb-3 font-serif text-base font-medium text-k-black">Client Confirmation</h2>
              {confirmations.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm text-k-black capitalize">{c.status}</p>
                    <p className="text-xs text-k-gray-400">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification record */}
          {verifications.filter((v) => v.status === "verified").length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
              <h2 className="mb-3 font-serif text-base font-medium text-emerald-800">Educator Verified</h2>
              {verifications.filter((v) => v.status === "verified").map((v) => (
                <div key={v.id}>
                  {v.notes && <p className="mb-1.5 text-sm text-emerald-700">{v.notes}</p>}
                  <p className="text-xs text-emerald-600">
                    {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
