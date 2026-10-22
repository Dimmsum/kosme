"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Flag } from "lucide-react";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { ISSUE_REASONS, issueReasonLabel } from "@/lib/appointments";

interface PendingService {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  student: { full_name: string | null } | null;
  confirmations?: Array<{ status: string; issue_reason: string | null }> | { status: string; issue_reason: string | null } | null;
}

interface PendingResponse {
  confirmations: PendingService[];
  reported: PendingService[];
}

function reasonOf(item: PendingService): string | null {
  const c = Array.isArray(item.confirmations) ? item.confirmations[0] : item.confirmations;
  return issueReasonLabel(c?.issue_reason);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ConfirmationsPage() {
  const [pending, setPending] = useState<PendingService[]>([]);
  const [reported, setReported] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState<string[]>([]);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const load = () =>
    apiGet<PendingResponse>("/api/confirmations/pending")
      .then((res) => {
        setPending(res.confirmations ?? []);
        setReported(res.reported ?? []);
      })
      .catch((err: unknown) => setError(apiErrorMessage(err, "Failed to load confirmations.")))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function confirm(item: PendingService) {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      await apiPost(`/api/confirmations/${encodeURIComponent(item.id)}/confirm`);
      setJustConfirmed((prev) => [item.name, ...prev]);
      await load();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Failed to confirm service."));
    } finally {
      setBusyId(null);
    }
  }

  async function reportIssue(item: PendingService) {
    if (busyId || !reason) return;
    setBusyId(item.id);
    setError(null);
    try {
      await apiPost(`/api/confirmations/${encodeURIComponent(item.id)}/report-issue`, {
        reason,
        note: note.trim() || undefined,
      });
      setReportingId(null);
      setReason("");
      setNote("");
      await load();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Failed to report the issue."));
    } finally {
      setBusyId(null);
    }
  }

  const nothingToDo = !loading && pending.length === 0 && reported.length === 0;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Confirm Service</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Once a student has finished a service, please confirm that it took place.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {justConfirmed.length > 0 && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={16} />
            Thank you. You confirmed {justConfirmed[0]}.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-700/90">
            Next, the student adds photos and notes and submits it to their educator. Once the educator verifies it, it
            appears in their portfolio. You can follow its progress in your history.
          </p>
          <Link
            href="/volunteer/history"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-k-primary no-underline hover:underline"
          >
            See it in History <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <p className="text-sm text-k-gray-400">Loading…</p>
        </div>
      ) : nothingToDo ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-k-black">All caught up!</p>
          <p className="mt-1 text-xs text-k-gray-400">No services are waiting for your confirmation.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((item) => (
            <div key={item.id} className="rounded-3xl border border-k-gray-200 bg-k-white p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-k-black">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-k-gray-400">
                    {item.student?.full_name ?? "Unknown student"} &middot; {formatDate(item.created_at)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Needs your confirmation
                </span>
              </div>

              {item.notes && (
                <div className="mb-4 rounded-xl bg-k-gray-100 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400">
                    Notes from the student
                  </p>
                  <p className="text-sm text-k-gray-600">{item.notes}</p>
                </div>
              )}

              {reportingId === item.id ? (
                <div className="rounded-2xl border border-k-gray-200 p-4">
                  <p className="text-sm font-medium text-k-black">What went wrong?</p>
                  <p className="mt-0.5 text-xs text-k-gray-400">
                    This flags the service for review. It won&apos;t cancel the student&apos;s work.
                  </p>
                  <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Reason">
                    {ISSUE_REASONS.map((r) => (
                      <label key={r.key} className="flex items-center gap-2 text-sm text-k-black">
                        <input
                          type="radio"
                          name={`reason-${item.id}`}
                          checked={reason === r.key}
                          onChange={() => setReason(r.key)}
                          className="h-4 w-4 accent-k-primary"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder={reason === "other" ? "Please tell us what happened" : "Anything else we should know? (optional)"}
                    className="mt-3 w-full resize-none rounded-xl border border-k-gray-200 bg-k-white px-3 py-2 text-sm text-k-black outline-none focus:border-k-primary"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => reportIssue(item)}
                      disabled={busyId === item.id || !reason || (reason === "other" && !note.trim())}
                      className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white transition-colors hover:bg-k-primary-light disabled:opacity-50"
                    >
                      <Flag size={14} /> Send report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportingId(null);
                        setReason("");
                        setNote("");
                      }}
                      className="rounded-full border border-k-gray-200 px-5 py-2 text-xs font-medium text-k-gray-600 hover:bg-k-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirm(item)}
                    disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:-translate-y-px hover:bg-k-primary-light disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Confirm Service
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportingId(item.id);
                      setReason("");
                      setNote("");
                    }}
                    disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-6 py-2.5 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100 disabled:opacity-50"
                  >
                    <AlertTriangle size={16} />
                    Report an Issue
                  </button>
                </div>
              )}
            </div>
          ))}

          {reported.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 font-serif text-lg text-k-black">Issues under review</h2>
              <div className="flex flex-col gap-3">
                {reported.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-k-black">{item.name}</p>
                        <p className="mt-0.5 text-xs text-k-gray-400">
                          {item.student?.full_name ?? "Unknown student"} &middot; {formatDate(item.created_at)}
                        </p>
                        {reasonOf(item) && (
                          <p className="mt-2 text-xs text-k-gray-600">You reported: {reasonOf(item)}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        Under review
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-k-gray-600">
                      We&apos;ve flagged this for review. If it&apos;s sorted out, you can still confirm it.
                    </p>
                    <button
                      type="button"
                      onClick={() => confirm(item)}
                      disabled={busyId === item.id}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Confirm Service
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-8 text-xs text-k-gray-400">
        Looking for services you&apos;ve already confirmed?{" "}
        <Link href="/volunteer/history" className="font-medium text-k-primary no-underline hover:underline">
          See your history
        </Link>
      </p>
    </div>
  );
}
