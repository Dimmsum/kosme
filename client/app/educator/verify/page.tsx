"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flag,
  UserX,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type VerifyStatus =
  | "All"
  | "Awaiting Review"
  | "Verified"
  | "Corrections Requested"
  | "Rejected";

type PhotoStage = "before" | "during" | "after";

interface ConfirmationSummary {
  status: "pending" | "confirmed" | "disputed";
  date: string;
}

interface ConfirmationRow {
  status: ConfirmationSummary["status"];
  created_at: string;
  updated_at: string | null;
}

interface VerificationItem {
  id: string;
  serviceId: string;
  service: string;
  category: string;
  student: string | null;
  client: string | null;
  dateSubmitted: string;
  status: "Awaiting Review" | "Verified" | "Rejected" | "Corrections Requested";
  statusColor: string;
  notes: string | null;
  reflectionNotes: string | null;
  confirmation: ConfirmationSummary | null;
  photos: Array<{
    id: string;
    type: "before" | "after";
    stage: PhotoStage | null;
    url: string;
  }>;
  startedAt: string | null;
  endedAt: string | null;
  actualDurationMin: number | null;
  adjustedDurationMin: number | null;
  durationTag: "under" | "within" | "over" | null;
  flagged: boolean;
}

const filters: VerifyStatus[] = [
  "All",
  "Awaiting Review",
  "Verified",
  "Corrections Requested",
  "Rejected",
];

function statusColor(status: VerificationItem["status"]): string {
  if (status === "Verified") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  if (status === "Corrections Requested") return "bg-orange-100 text-orange-700";
  return "bg-amber-100 text-amber-700";
}

interface PendingResponse {
  pending: Array<{
    id: string;
    name: string;
    category_id: string;
    notes: string | null;
    created_at: string;
    started_at: string | null;
    ended_at: string | null;
    actual_duration_min: number | null;
    adjusted_duration_min: number | null;
    duration_tag: "under" | "within" | "over" | null;
    student: { full_name: string | null } | null;
    client: { full_name: string | null } | null;
    reflection_notes: string | null;
    confirmations: ConfirmationRow | ConfirmationRow[] | null;
    service_photos: Array<{
      id: string;
      type: "before" | "after";
      stage: PhotoStage | null;
      url: string;
    }>;
  }>;
}

interface HistoryResponse {
  history: Array<{
    status: "verified" | "rejected" | "corrections_requested";
    service: {
      id: string;
      name: string;
      category_id: string;
      notes: string | null;
      created_at: string;
      started_at: string | null;
      ended_at: string | null;
      actual_duration_min: number | null;
      adjusted_duration_min: number | null;
      duration_tag: "under" | "within" | "over" | null;
      reflection_notes: string | null;
      student: { full_name: string | null } | null;
      client: { full_name: string | null } | null;
      confirmations: ConfirmationRow | ConfirmationRow[] | null;
      service_photos: Array<{
        id: string;
        type: "before" | "after";
        stage: PhotoStage | null;
        url: string;
      }>;
    };
  }>;
}

// confirmations.service_id is UNIQUE, so PostgREST may embed it as a single
// object rather than an array — accept either shape.
function toConfirmation(
  value: ConfirmationRow | ConfirmationRow[] | null,
): ConfirmationSummary | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) return null;
  return { status: row.status, date: row.updated_at ?? row.created_at };
}

function durationTagColor(tag: VerificationItem["durationTag"]): string {
  if (tag === "over") return "bg-red-100 text-red-700";
  if (tag === "under") return "bg-amber-100 text-amber-700";
  if (tag === "within") return "bg-emerald-100 text-emerald-700";
  return "bg-k-gray-100 text-k-gray-500";
}

function formatDurationMin(min: number | null): string {
  if (min === null) return "—";
  const hours = Math.floor(min / 60);
  const mins = min % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTiming(item: VerificationItem) {
  if (!item.startedAt && item.actualDurationMin === null) return null;

  return (
    <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
            Timing
          </p>
          <p className="mt-1 text-sm text-k-gray-600">
            {formatTime(item.startedAt)} &ndash; {formatTime(item.endedAt)}
            {item.actualDurationMin !== null && (
              <span className="ml-2 text-k-gray-400">
                ({formatDurationMin(item.actualDurationMin)})
              </span>
            )}
            {item.adjustedDurationMin !== null && (
              <span className="ml-2 text-k-primary">
                &rarr; adjusted to {formatDurationMin(item.adjustedDurationMin)}
              </span>
            )}
          </p>
        </div>
        {item.durationTag && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${durationTagColor(item.durationTag)}`}
          >
            {item.durationTag}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderReflection(item: VerificationItem) {
  const reflection = item.reflectionNotes?.trim();

  return (
    <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
        Reflection
      </p>
      <p
        className={`mt-1 whitespace-pre-wrap text-sm ${reflection ? "text-k-gray-600" : "text-k-gray-400"}`}
      >
        {reflection || "No reflection written."}
      </p>
    </div>
  );
}

// No-client services skip the confirmation step entirely (see VER-14), so
// they get their own line rather than looking like an unconfirmed service.
function renderConfirmation(item: VerificationItem) {
  const clientName = item.client ?? "the client";
  let icon = <AlertCircle size={15} className="shrink-0 text-amber-500" />;
  let text = `Not yet confirmed by ${clientName}`;

  if (!item.client) {
    icon = <UserX size={15} className="shrink-0 text-k-gray-400" />;
    text = "No client — logged without a client confirmation";
  } else if (item.confirmation?.status === "confirmed") {
    icon = <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />;
    text = `Confirmed by ${clientName} · ${formatDate(item.confirmation.date)}`;
  } else if (item.confirmation?.status === "disputed") {
    icon = <XCircle size={15} className="shrink-0 text-red-500" />;
    text = `Disputed by ${clientName} · ${formatDate(item.confirmation.date)}`;
  }

  return (
    <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
        Client Confirmation
      </p>
      <div className="mt-1 flex items-center gap-2">
        {icon}
        <p className="text-sm text-k-gray-600">{text}</p>
      </div>
    </div>
  );
}

function renderPhotoGrid(label: string, photos: VerificationItem["photos"]) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-2 text-[10px] text-k-gray-400">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-square overflow-hidden rounded-lg border border-k-gray-200"
          >
            <img
              src={photo.url}
              alt={`${label} photo${photo.stage ? ` (${photo.stage} stage)` : ""}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* Stage is null on photos uploaded before VER-2 added tagging. */}
            {photo.stage && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-k-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-600">
                {photo.stage}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function renderPhotos(photos: VerificationItem["photos"]) {
  if (photos.length === 0) return null;

  const before = photos.filter((photo) => photo.type === "before");
  const after = photos.filter((photo) => photo.type === "after");

  return (
    <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
        Photos
      </p>
      {before.length > 0 && renderPhotoGrid("Before", before)}
      {after.length > 0 && renderPhotoGrid("After", after)}
    </div>
  );
}

export default function VerifyPage() {
  const [activeFilter, setActiveFilter] = useState<VerifyStatus>("All");
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    Promise.all([
      apiGet<PendingResponse>("/api/verifications/pending"),
      apiGet<HistoryResponse>("/api/verifications/history"),
    ])
      .then(([pendingRes, historyRes]) => {
        const pendingItems: VerificationItem[] = (pendingRes.pending ?? []).map(
          (item) => ({
            id: `pending-${item.id}`,
            serviceId: item.id,
            service: item.name,
            category: item.category_id,
            student: item.student?.full_name ?? null,
            client: item.client?.full_name ?? null,
            dateSubmitted: item.created_at,
            status: "Awaiting Review",
            statusColor: statusColor("Awaiting Review"),
            notes: item.notes,
            reflectionNotes: item.reflection_notes,
            confirmation: toConfirmation(item.confirmations),
            photos: item.service_photos ?? [],
            startedAt: item.started_at,
            endedAt: item.ended_at,
            actualDurationMin: item.actual_duration_min,
            adjustedDurationMin: item.adjusted_duration_min,
            durationTag: item.duration_tag,
            flagged: false,
          }),
        );

        const historyItems: VerificationItem[] = (historyRes.history ?? []).map(
          (item) => {
            const label: VerificationItem["status"] =
              item.status === "verified"
                ? "Verified"
                : item.status === "corrections_requested"
                  ? "Corrections Requested"
                  : "Rejected";
            return {
              id: `history-${item.service.id}`,
              serviceId: item.service.id,
              service: item.service.name,
              category: item.service.category_id,
              student: item.service.student?.full_name ?? null,
              client: item.service.client?.full_name ?? null,
              dateSubmitted: item.service.created_at,
              status: label,
              statusColor: statusColor(label),
              notes: item.service.notes ?? null,
              reflectionNotes: item.service.reflection_notes ?? null,
              confirmation: toConfirmation(item.service.confirmations),
              photos: item.service.service_photos ?? [],
              startedAt: item.service.started_at,
              endedAt: item.service.ended_at,
              actualDurationMin: item.service.actual_duration_min,
              adjustedDurationMin: item.service.adjusted_duration_min,
              durationTag: item.service.duration_tag,
              flagged: false,
            };
          },
        );

        setItems([...pendingItems, ...historyItems]);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load verifications.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "Awaiting Review").length,
    [items],
  );

  const filtered = items.filter((item) => {
    if (activeFilter === "All") return true;
    return item.status === activeFilter;
  });

  const [hourDrafts, setHourDrafts] = useState<Record<string, string>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, string>>({});
  const [openPanel, setOpenPanel] = useState<Record<string, "corrections" | "flag" | null>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  function toggle(serviceId: string, panel: "corrections" | "flag") {
    setOpenPanel((prev) => ({
      ...prev,
      [serviceId]: prev[serviceId] === panel ? null : panel,
    }));
  }

  async function handleVerify(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;

    const draft = hourDrafts[serviceId]?.trim();
    const adjusted_duration_min = draft ? Number(draft) : undefined;
    if (draft && (!Number.isFinite(adjusted_duration_min) || adjusted_duration_min! < 0)) {
      setActionErrors((prev) => ({
        ...prev,
        [serviceId]: "Adjusted hours must be a non-negative number.",
      }));
      return;
    }

    setPendingActionIds((prev) => new Set(prev).add(serviceId));
    setActionErrors((prev) => ({ ...prev, [serviceId]: "" }));

    try {
      await apiPost(
        `/api/verifications/${encodeURIComponent(serviceId)}/verify`,
        adjusted_duration_min !== undefined ? { adjusted_duration_min } : undefined,
      );
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId
            ? {
                ...item,
                status: "Verified",
                statusColor: statusColor("Verified"),
                adjustedDurationMin: adjusted_duration_min ?? item.adjustedDurationMin,
              }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to verify service.";
      setActionErrors((prev) => ({ ...prev, [serviceId]: message }));
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  async function handleReject(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;
    setPendingActionIds((prev) => new Set(prev).add(serviceId));
    setActionErrors((prev) => ({ ...prev, [serviceId]: "" }));

    try {
      await apiPost(
        `/api/verifications/${encodeURIComponent(serviceId)}/reject`,
      );
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId
            ? {
                ...item,
                status: "Rejected",
                statusColor: statusColor("Rejected"),
              }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject service.";
      setActionErrors((prev) => ({ ...prev, [serviceId]: message }));
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  async function handleRequestCorrections(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;
    const notes = correctionDrafts[serviceId]?.trim();
    if (!notes) {
      setActionErrors((prev) => ({
        ...prev,
        [serviceId]: "Describe what the student needs to fix.",
      }));
      return;
    }
    setPendingActionIds((prev) => new Set(prev).add(serviceId));
    setActionErrors((prev) => ({ ...prev, [serviceId]: "" }));

    try {
      await apiPost(
        `/api/verifications/${encodeURIComponent(serviceId)}/request-corrections`,
        { notes },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId
            ? {
                ...item,
                status: "Corrections Requested",
                statusColor: statusColor("Corrections Requested"),
              }
            : item,
        ),
      );
      setOpenPanel((prev) => ({ ...prev, [serviceId]: null }));
      setCorrectionDrafts((prev) => ({ ...prev, [serviceId]: "" }));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to request corrections.";
      setActionErrors((prev) => ({ ...prev, [serviceId]: message }));
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  async function handleFlag(serviceId: string) {
    if (pendingActionIds.has(serviceId)) return;
    const reason = flagDrafts[serviceId]?.trim();
    if (!reason) {
      setActionErrors((prev) => ({
        ...prev,
        [serviceId]: "Describe why this service is being flagged.",
      }));
      return;
    }
    setPendingActionIds((prev) => new Set(prev).add(serviceId));
    setActionErrors((prev) => ({ ...prev, [serviceId]: "" }));

    try {
      await apiPost(`/api/verifications/${encodeURIComponent(serviceId)}/flag`, {
        reason,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.serviceId === serviceId ? { ...item, flagged: true } : item,
        ),
      );
      setOpenPanel((prev) => ({ ...prev, [serviceId]: null }));
      setFlagDrafts((prev) => ({ ...prev, [serviceId]: "" }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to flag service.";
      setActionErrors((prev) => ({ ...prev, [serviceId]: message }));
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            Pending Verifications
          </h1>
          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
            {pendingCount}
          </span>
        </div>
        <p className="mt-1 text-sm text-k-gray-400">
          Review and verify student service submissions.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        <Filter size={14} className="shrink-0 text-k-gray-400" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f
                ? "bg-k-primary text-k-white"
                : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Verification items */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              Loading verification queue...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
            <p className="text-sm text-k-gray-400">
              No items match this filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-k-gray-200 bg-k-white p-5 sm:p-6"
            >
              {/* Top row: service info and status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-k-black">
                    {item.service}
                  </p>
                  <p className="text-xs text-k-gray-400 mt-0.5">
                    {item.category} &middot; Submitted{" "}
                    {new Date(item.dateSubmitted).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${item.statusColor}`}
                >
                  {item.status}
                </span>
              </div>

              {/* Student and client info */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-k-primary/10">
                    <span className="text-[10px] font-semibold text-k-primary">
                      {(item.student ?? "Student")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                      Student
                    </p>
                    <p className="text-xs text-k-black">
                      {item.student ?? "Unknown student"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-k-gray-100">
                    <span className="text-[10px] font-semibold text-k-gray-600">
                      {(item.client ?? "Client")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                      Client
                    </p>
                    <p className="text-xs text-k-black">
                      {item.client ?? "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-k-gray-200 bg-k-gray-100 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-k-gray-600">
                      {item.notes ?? "No notes provided."}
                    </p>
                  </div>
                  <div className="rounded-full bg-k-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-500">
                    {item.photos.length} photo
                    {item.photos.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              {renderReflection(item)}

              {renderConfirmation(item)}

              {renderTiming(item)}

              {renderPhotos(item.photos)}

              {item.flagged && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-red-700">
                  <Flag size={14} />
                  <span className="text-xs font-medium">
                    Flagged for admin attention
                  </span>
                </div>
              )}

              {actionErrors[item.serviceId] && (
                <p className="mb-3 text-xs text-red-600">
                  {actionErrors[item.serviceId]}
                </p>
              )}

              {/* Action buttons */}
              {item.status === "Awaiting Review" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-k-gray-500">
                      Adjust hours (optional)
                      <input
                        type="number"
                        min={0}
                        placeholder={
                          item.actualDurationMin != null
                            ? String(item.actualDurationMin)
                            : "min"
                        }
                        value={hourDrafts[item.serviceId] ?? ""}
                        onChange={(e) =>
                          setHourDrafts((prev) => ({
                            ...prev,
                            [item.serviceId]: e.target.value,
                          }))
                        }
                        className="w-24 rounded-full border border-k-gray-200 bg-k-white px-3 py-1 text-xs text-k-black focus:border-k-primary focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleVerify(item.serviceId)}
                      disabled={pendingActionIds.has(item.serviceId)}
                      className="inline-flex items-center gap-2 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px"
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => toggle(item.serviceId, "corrections")}
                      disabled={pendingActionIds.has(item.serviceId)}
                      className="inline-flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                    >
                      <AlertCircle size={16} />
                      Request Corrections
                    </button>
                    <button
                      onClick={() => handleReject(item.serviceId)}
                      disabled={pendingActionIds.has(item.serviceId)}
                      className="inline-flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                    {!item.flagged && (
                      <button
                        onClick={() => toggle(item.serviceId, "flag")}
                        disabled={pendingActionIds.has(item.serviceId)}
                        className="inline-flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                      >
                        <Flag size={16} />
                        Flag
                      </button>
                    )}
                  </div>

                  {openPanel[item.serviceId] === "corrections" && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <textarea
                        value={correctionDrafts[item.serviceId] ?? ""}
                        onChange={(e) =>
                          setCorrectionDrafts((prev) => ({
                            ...prev,
                            [item.serviceId]: e.target.value,
                          }))
                        }
                        maxLength={2000}
                        rows={3}
                        placeholder="What does the student need to fix before this can be verified?"
                        className="w-full resize-none rounded-xl border border-orange-200 bg-k-white p-3 text-sm text-k-black placeholder:text-k-gray-300 focus:border-orange-400 focus:outline-none"
                      />
                      <div className="mt-2.5 flex items-center gap-3">
                        <button
                          onClick={() => handleRequestCorrections(item.serviceId)}
                          disabled={pendingActionIds.has(item.serviceId)}
                          className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Send back to student
                        </button>
                      </div>
                    </div>
                  )}

                  {openPanel[item.serviceId] === "flag" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <textarea
                        value={flagDrafts[item.serviceId] ?? ""}
                        onChange={(e) =>
                          setFlagDrafts((prev) => ({
                            ...prev,
                            [item.serviceId]: e.target.value,
                          }))
                        }
                        maxLength={2000}
                        rows={3}
                        placeholder="Why is this service being flagged for admin attention?"
                        className="w-full resize-none rounded-xl border border-red-200 bg-k-white p-3 text-sm text-k-black placeholder:text-k-gray-300 focus:border-red-400 focus:outline-none"
                      />
                      <div className="mt-2.5 flex items-center gap-3">
                        <button
                          onClick={() => handleFlag(item.serviceId)}
                          disabled={pendingActionIds.has(item.serviceId)}
                          className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Raise flag
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {item.status === "Verified" && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}

              {item.status === "Corrections Requested" && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">
                    Corrections Requested
                  </span>
                </div>
              )}

              {item.status === "Rejected" && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
