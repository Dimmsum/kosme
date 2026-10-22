"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, MapPin, User, Search } from "lucide-react";
import { apiGet, apiPatch, apiPut, apiErrorMessage } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import UserDrawer, { type UserRow } from "@/components/admin/UserDrawer";
import { Field, TextInput, Select, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";
import { BUSINESS_TYPE_LABELS } from "@/components/employer/BusinessDetailsCard";

type Verification = "pending" | "verified" | "rejected";

interface Employer {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "suspended" | "deactivated" | "deleted";
  is_demo: boolean;
  created_at: string;
  business_name: string | null;
  contact_person: string | null;
  location: string | null;
  business_type: string | null;
  verification_status: Verification;
  shortlist_count: number;
  last_shortlisted_at: string | null;
}

const verificationColor: Record<Verification, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
const selectClass = "rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none";
const actionBtn = "rounded-full border border-k-gray-200 px-3 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [editing, setEditing] = useState<Employer | null>(null);
  const [managing, setManaging] = useState<Employer | null>(null);
  const [toggling, setToggling] = useState<Employer | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (status) qs.set("status", status);
      if (verification) qs.set("verification_status", verification);
      if (businessType) qs.set("business_type", businessType);
      const s = qs.toString();
      const { employers } = await apiGet<{ employers: Employer[] }>(`/api/admin/employers${s ? `?${s}` : ""}`);
      setEmployers(employers);
      setError("");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to load employers."));
    } finally {
      setLoading(false);
    }
  }, [q, status, verification, businessType]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAccess() {
    if (!toggling) return;
    setBusy(true);
    try {
      await apiPatch(`/api/admin/users/${toggling.id}`, { status: toggling.status === "active" ? "suspended" : "active" });
      setToggling(null);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to update employer access."));
      setToggling(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Employer Management"
        subtitle="Business details, verification and activity for every employer. Suspend, reactivate or remove access here."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-4 py-2">
          <Search size={15} className="text-k-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search business, contact, location…"
            className="w-60 bg-transparent text-sm text-k-black outline-none"
          />
        </div>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All access</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <select className={selectClass} value={verification} onChange={(e) => setVerification(e.target.value)}>
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className={selectClass} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
          <option value="">All business types</option>
          {Object.entries(BUSINESS_TYPE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingCard label="Loading employers…" />
      ) : employers.length === 0 ? (
        <EmptyCard label="No employers match these filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {employers.map((e) => (
            <div key={e.id} className="rounded-2xl border border-k-gray-200 bg-k-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                    <Briefcase size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-k-black">
                      {e.business_name ?? e.full_name ?? "Unnamed employer"}
                      {e.is_demo && <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">Demo</span>}
                    </p>
                    <p className="text-xs text-k-gray-400">
                      {e.business_type ? BUSINESS_TYPE_LABELS[e.business_type] : "Business type not set"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${verificationColor[e.verification_status]}`}>
                    {e.verification_status}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      e.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-k-gray-600">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-k-gray-400" />
                  {e.contact_person ?? e.full_name ?? "—"}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-k-gray-400" />
                  {e.location ?? "—"}
                </div>
                <div>{e.phone ?? "no phone"}</div>
                <div>Joined {fmt(e.created_at)}</div>
                <div>
                  <span className="font-semibold text-k-black">{e.shortlist_count}</span> shortlisted
                </div>
                <div>Last shortlist: {e.last_shortlisted_at ? fmt(e.last_shortlisted_at) : "never"}</div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-k-gray-200 pt-3">
                <button className={actionBtn} onClick={() => setEditing(e)}>
                  Edit details
                </button>
                <button className={actionBtn} onClick={() => setToggling(e)}>
                  {e.status === "active" ? "Suspend access" : "Reactivate access"}
                </button>
                <button className={actionBtn} onClick={() => setManaging(e)}>
                  Manage account
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EmployerForm
          employer={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {managing && (
        <UserDrawer
          user={
            {
              id: managing.id,
              full_name: managing.business_name ?? managing.full_name,
              phone: managing.phone,
              role: "employer",
              status: managing.status,
              is_demo: managing.is_demo,
              institution_id: null,
              programme_id: null,
              cohort_id: null,
              student_id: null,
              staff_id: null,
              access_level: null,
              created_at: managing.created_at,
            } satisfies UserRow
          }
          institutions={[]}
          programmes={[]}
          cohorts={[]}
          onClose={() => setManaging(null)}
          onSaved={async () => {
            setManaging(null);
            await load();
          }}
        />
      )}
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.status === "active" ? "Suspend employer access?" : "Reactivate employer access?"}
        message={
          toggling?.status === "active"
            ? "They will be signed out of API access immediately and cannot browse portfolios until reactivated. Their shortlist is kept."
            : "They will be able to sign in and browse portfolios again."
        }
        confirmLabel={toggling?.status === "active" ? "Suspend" : "Reactivate"}
        destructive={toggling?.status === "active"}
        busy={busy}
        onConfirm={toggleAccess}
        onCancel={() => setToggling(null)}
      />
    </div>
  );
}

function EmployerForm({ employer, onClose, onSaved }: { employer: Employer; onClose: () => void; onSaved: () => void }) {
  const [businessName, setBusinessName] = useState(employer.business_name ?? "");
  const [contact, setContact] = useState(employer.contact_person ?? "");
  const [location, setLocation] = useState(employer.location ?? "");
  const [type, setType] = useState(employer.business_type ?? "");
  const [verification, setVerification] = useState<Verification>(employer.verification_status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiPut(`/api/admin/employers/${employer.id}/profile`, {
        business_name: businessName.trim() || null,
        contact_person: contact.trim() || null,
        location: location.trim() || null,
        business_type: type || null,
        verification_status: verification,
      });
      onSaved();
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to save employer details."));
      setBusy(false);
    }
  }

  return (
    <Modal open title="Employer details" onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <Field label="Business name">
          <TextInput value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={255} />
        </Field>
        <Field label="Contact person">
          <TextInput value={contact} onChange={(e) => setContact(e.target.value)} maxLength={255} />
        </Field>
        <Field label="Location">
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} maxLength={255} />
        </Field>
        <Field label="Business type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">— not set —</option>
            {Object.entries(BUSINESS_TYPE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Verification status" hint="Informational for now — it does not restrict portfolio access.">
          <Select value={verification} onChange={(e) => setVerification(e.target.value as Verification)}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
        </Field>
        <FormActions onCancel={onClose} busy={busy} />
      </form>
    </Modal>
  );
}
