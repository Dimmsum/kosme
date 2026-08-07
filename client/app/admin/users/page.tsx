"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import { Field, Select, FormActions } from "@/components/admin/FormControls";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

type Role = "student" | "educator" | "client" | "employer";

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: "active" | "suspended";
  is_demo: boolean;
  institution_id: string | null;
  programme_id: string | null;
  cohort_id: string | null;
  created_at: string;
}
interface Institution {
  id: string;
  name: string;
}
interface Programme {
  id: string;
  institution_id: string;
  name: string;
}
interface Cohort {
  id: string;
  programme_id: string;
  name: string;
}

const ROLES: Role[] = ["student", "educator", "client", "employer"];
const roleBadge: Record<string, string> = {
  student: "bg-blue-100 text-blue-700",
  educator: "bg-purple-100 text-purple-700",
  client: "bg-emerald-100 text-emerald-700",
  employer: "bg-amber-100 text-amber-700",
  super_admin: "bg-k-primary/10 text-k-primary",
};

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [includeDemo, setIncludeDemo] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (q.trim()) params.set("q", q.trim());
      if (includeDemo) params.set("include_demo", "true");
      const qs = params.toString();
      const { users } = await apiGet<{ users: UserRow[] }>(`/api/admin/users${qs ? `?${qs}` : ""}`);
      setUsers(users);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, q, includeDemo]);

  useEffect(() => {
    load();
  }, [load]);

  // Placement reference data (loaded once) for the edit drawer's cascading selects.
  useEffect(() => {
    (async () => {
      try {
        const [is, ps, cs] = await Promise.all([
          apiGet<{ institutions: Institution[] }>("/api/admin/institutions"),
          apiGet<{ programmes: Programme[] }>("/api/admin/programmes"),
          apiGet<{ cohorts: Cohort[] }>("/api/admin/cohorts"),
        ]);
        setInstitutions(is.institutions);
        setProgrammes(ps.programmes);
        setCohorts(cs.cohorts);
      } catch {
        /* placement selects will just be empty if this fails */
      }
    })();
  }, []);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="User Management"
        subtitle="Review accounts, assign institution/programme/cohort, and set account status."
      />

      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-4 py-2">
          <Search size={15} className="text-k-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className="w-44 bg-transparent text-sm text-k-black outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-gray-600 outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-k-gray-600">
          <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} />
          Include demo
        </label>
      </div>

      {loading ? (
        <LoadingCard label="Loading users…" />
      ) : users.length === 0 ? (
        <EmptyCard label="No users match these filters." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-k-gray-200 bg-k-gray-100/50 text-xs uppercase tracking-wide text-k-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-k-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-k-gray-100/40">
                    <td className="px-5 py-3">
                      <span className="font-medium text-k-black">{u.full_name ?? "—"}</span>
                      {u.is_demo && (
                        <span className="ml-2 rounded-full bg-k-gray-200 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">
                          Demo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[u.role] ?? "bg-k-gray-100 text-k-gray-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.status === "suspended" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-k-gray-400">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditing(u)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-3 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                      >
                        <SlidersHorizontal size={13} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <UserDrawer
          user={editing}
          institutions={institutions}
          programmes={programmes}
          cohorts={cohorts}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function UserDrawer({
  user,
  institutions,
  programmes,
  cohorts,
  onClose,
  onSaved,
}: {
  user: UserRow;
  institutions: Institution[];
  programmes: Programme[];
  cohorts: Cohort[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [institutionId, setInstitutionId] = useState(user.institution_id ?? "");
  const [programmeId, setProgrammeId] = useState(user.programme_id ?? "");
  const [cohortId, setCohortId] = useState(user.cohort_id ?? "");
  const [status, setStatus] = useState<UserRow["status"]>(user.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const progOptions = programmes.filter((p) => !institutionId || p.institution_id === institutionId);
  const cohOptions = cohorts.filter((c) => !programmeId || c.programme_id === programmeId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiPatch(`/api/admin/users/${user.id}`, {
        institution_id: institutionId || null,
        programme_id: programmeId || null,
        cohort_id: cohortId || null,
        status,
      });
      onSaved();
    } catch (e) {
      setErr(errMsg(e, "Failed to update user."));
      setBusy(false);
    }
  }

  return (
    <Modal open title={user.full_name ?? "Manage user"} onClose={onClose}>
      <form onSubmit={submit}>
        {err && <ErrorBanner message={err} />}
        <p className="mb-4 text-xs text-k-gray-400">
          Role <span className="font-medium text-k-gray-600">{user.role}</span> · {user.phone ?? "no phone"}
        </p>

        <Field label="Institution">
          <Select
            value={institutionId}
            onChange={(e) => {
              setInstitutionId(e.target.value);
              setProgrammeId("");
              setCohortId("");
            }}
          >
            <option value="">— none —</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Programme">
          <Select
            value={programmeId}
            onChange={(e) => {
              setProgrammeId(e.target.value);
              setCohortId("");
            }}
            disabled={!institutionId}
          >
            <option value="">— none —</option>
            {progOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cohort">
          <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)} disabled={!programmeId}>
            <option value="">— none —</option>
            {cohOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Account status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as UserRow["status"])}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>

        <FormActions onCancel={onClose} busy={busy} submitLabel="Save changes" />
      </form>
    </Modal>
  );
}
