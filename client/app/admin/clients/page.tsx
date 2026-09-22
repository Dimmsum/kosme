"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Users, MapPin, Phone, Check, X, UserPlus, GraduationCap } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/admin/FormControls";

interface Signup {
  id: string;
  full_name: string;
  gender: string;
  whatsapp: string;
  email: string;
  parish: string;
  service_preferences: string[];
  availability: string[];
  preferred_time: string[];
  willing_to_travel: boolean;
  photo_consent: boolean;
  trainee_acknowledgement: boolean;
  created_at: string;
  matches: Match[];
}
interface Match {
  id: string;
  notes: string | null;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
}
interface Student {
  id: string;
  full_name: string | null;
  institution: { id: string; name: string } | null;
  cohort: { id: string; name: string } | null;
}
type MatchFilter = "all" | "unmatched" | "matched";
interface VolunteerRequest {
  id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  volunteer: { id: string; full_name: string | null } | null;
}

const reqColor: Record<VolunteerRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function studentLabel(s: Student) {
  const place = [s.institution?.name, s.cohort?.name].filter(Boolean).join(" · ");
  return `${s.full_name ?? "Unnamed student"}${place ? ` — ${place}` : ""}`;
}

export default function AdminClientsPage() {
  const [tab, setTab] = useState<"signups" | "requests">("signups");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");

  // Match modal
  const [matching, setMatching] = useState<Signup | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // End-match confirmation
  const [ending, setEnding] = useState<{ signup: Signup; match: Match } | null>(null);
  const [endBusy, setEndBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, st] = await Promise.all([
        apiGet<{ signups: Signup[] }>("/api/admin/clients/signups"),
        apiGet<{ requests: VolunteerRequest[] }>("/api/admin/clients/volunteer-requests"),
        apiGet<{ students: Student[] }>("/api/admin/clients/students"),
      ]);
      setSignups(s.signups);
      setRequests(r.requests);
      setStudents(st.students);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load client data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unmatchedCount = signups.filter((s) => s.matches.length === 0).length;
  const visibleSignups = signups.filter((s) =>
    matchFilter === "all" ? true : matchFilter === "matched" ? s.matches.length > 0 : s.matches.length === 0,
  );

  // Students offered in the modal: name/institution/cohort search, minus
  // anyone this client is already actively matched with.
  const candidates = useMemo(() => {
    if (!matching) return [];
    const taken = new Set(matching.matches.map((m) => m.student?.id));
    const q = studentQuery.trim().toLowerCase();
    return students.filter((s) => !taken.has(s.id) && (!q || studentLabel(s).toLowerCase().includes(q)));
  }, [matching, students, studentQuery]);
  // A search can hide the current pick; treat that as no selection.
  const selectedId = candidates.some((c) => c.id === studentId) ? studentId : "";

  function openMatch(signup: Signup) {
    setMatching(signup);
    setStudentQuery("");
    setStudentId("");
    setNotes("");
    setFormError("");
  }

  const closeMatch = useCallback(() => {
    if (!saving) setMatching(null);
  }, [saving]);

  async function submitMatch(e: FormEvent) {
    e.preventDefault();
    if (!matching || !selectedId) return;
    setSaving(true);
    setFormError("");
    try {
      const { match } = await apiPost<{ match: Match }>("/api/admin/clients/matches", {
        signup_id: matching.id,
        student_id: selectedId,
        notes: notes.trim() || null,
      });
      setSignups((prev) => prev.map((s) => (s.id === matching.id ? { ...s, matches: [...s.matches, match] } : s)));
      setMatching(null);
    } catch (err) {
      setFormError(errMsg(err, "Failed to create match."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmEnd() {
    if (!ending) return;
    setEndBusy(true);
    try {
      await apiPatch(`/api/admin/clients/matches/${ending.match.id}`, { status: "ended" });
      setSignups((prev) =>
        prev.map((s) =>
          s.id === ending.signup.id ? { ...s, matches: s.matches.filter((m) => m.id !== ending.match.id) } : s,
        ),
      );
      setEnding(null);
      setError("");
    } catch (err) {
      setError(errMsg(err, "Failed to end match."));
      setEnding(null);
    } finally {
      setEndBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Volunteer Client Management"
        subtitle="Public sign-ups, manual student matching, and volunteer↔student requests across the platform."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("signups")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "signups" ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
          }`}
        >
          Sign-ups ({signups.length})
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "requests" ? "bg-k-primary text-k-white" : "border border-k-gray-200 bg-k-white text-k-gray-600 hover:bg-k-gray-100"
          }`}
        >
          Volunteer Requests ({requests.length})
        </button>
      </div>

      {!loading && tab === "signups" && signups.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter sign-ups by match status">
          {(
            [
              ["all", `All (${signups.length})`],
              ["unmatched", `Unmatched (${unmatchedCount})`],
              ["matched", `Matched (${signups.length - unmatchedCount})`],
            ] as [MatchFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMatchFilter(value)}
              aria-pressed={matchFilter === value}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                matchFilter === value
                  ? "bg-k-primary/10 text-k-primary"
                  : "text-k-gray-600 hover:bg-k-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingCard label="Loading…" />
      ) : tab === "signups" ? (
        signups.length === 0 ? (
          <EmptyCard label="No client sign-ups yet." />
        ) : visibleSignups.length === 0 ? (
          <EmptyCard label={matchFilter === "matched" ? "No sign-ups have been matched yet." : "Every sign-up has a match."} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleSignups.map((s) => (
              <div key={s.id} className="flex flex-col rounded-2xl border border-k-gray-200 bg-k-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">{s.full_name}</p>
                    <p className="text-xs text-k-gray-400">{s.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-k-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-k-gray-400" /> {s.parish}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="text-k-gray-400" /> {s.whatsapp}
                  </span>
                </div>
                {s.service_preferences.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.service_preferences.map((p) => (
                      <span key={p} className="rounded-full bg-k-gray-100 px-2.5 py-0.5 text-[11px] text-k-gray-600">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-k-gray-400">
                  <Consent label="Photo consent" ok={s.photo_consent} />
                  <Consent label="Willing to travel" ok={s.willing_to_travel} />
                  <Consent label="Trainee acknowledged" ok={s.trainee_acknowledgement} />
                </div>

                <div className="mt-4 border-t border-k-gray-200 pt-4 md:mt-auto">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-k-gray-400">Matched students</p>
                  {s.matches.length === 0 ? (
                    <p className="text-xs text-k-gray-400">Not matched yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {s.matches.map((m) => (
                        <li key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-k-gray-100 px-3 py-2">
                          <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-sm text-k-black">
                              <GraduationCap size={14} className="shrink-0 text-k-primary" />
                              <span className="truncate">{m.student?.full_name ?? "Student"}</span>
                            </p>
                            {m.notes && <p className="mt-0.5 text-xs text-k-gray-600">{m.notes}</p>}
                            <p className="mt-0.5 text-[11px] text-k-gray-400">
                              Matched {new Date(m.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setEnding({ signup: s, match: m })}
                            aria-label={`End match with ${m.student?.full_name ?? "student"}`}
                            className="shrink-0 rounded-full p-1 text-k-gray-400 transition-colors hover:bg-k-white hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => openMatch(s)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 bg-k-white px-3.5 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:border-k-primary hover:text-k-primary"
                  >
                    <UserPlus size={14} /> Match with a student
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <EmptyCard label="No volunteer requests yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white divide-y divide-k-gray-200">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-k-black">
                  <span className="font-medium">{r.volunteer?.full_name ?? "Volunteer"}</span>
                  <span className="text-k-gray-400"> → </span>
                  <span className="font-medium">{r.student?.full_name ?? "Student"}</span>
                </p>
                {r.message && <p className="mt-0.5 truncate text-xs text-k-gray-400">{r.message}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${reqColor[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={matching !== null}
        title={`Match ${matching?.full_name ?? "client"}`}
        onClose={closeMatch}
      >
        {matching && (
          <form onSubmit={submitMatch}>
            <div className="mb-5 rounded-2xl bg-k-gray-100 px-4 py-3 text-xs text-k-gray-600">
              <p className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-k-gray-400" /> {matching.parish}
                {matching.willing_to_travel && <span className="text-k-gray-400"> · willing to travel</span>}
              </p>
              {matching.service_preferences.length > 0 && (
                <p className="mt-1">Wants: {matching.service_preferences.join(", ")}</p>
              )}
              {(matching.availability.length > 0 || matching.preferred_time.length > 0) && (
                <p className="mt-1">
                  Available: {[...matching.availability, ...matching.preferred_time].join(", ")}
                </p>
              )}
            </div>

            {formError && <ErrorBanner message={formError} />}

            <Field label="Search students" hint="Filter by name, institution or cohort.">
              <TextInput
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Start typing…"
              />
            </Field>
            <Field
              label="Student"
              hint={
                students.length === 0
                  ? "There are no active, non-demo student accounts to match with."
                  : `${candidates.length} student${candidates.length === 1 ? "" : "s"} shown.`
              }
            >
              <Select value={selectedId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">Select a student…</option>
                {candidates.map((st) => (
                  <option key={st.id} value={st.id}>
                    {studentLabel(st)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" hint="Optional: how the match was arranged, first appointment, etc.">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <FormActions onCancel={closeMatch} submitLabel="Create match" busy={saving} disabled={!selectedId} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={ending !== null}
        title="End match"
        message={`End the match between ${ending?.signup.full_name ?? "this client"} and ${
          ending?.match.student?.full_name ?? "this student"
        }? The record is kept in the audit trail, and you can match them again later.`}
        confirmLabel="End match"
        destructive
        busy={endBusy}
        onConfirm={confirmEnd}
        onCancel={() => setEnding(null)}
      />
    </div>
  );
}

function Consent({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {ok ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />}
      {label}
    </span>
  );
}
