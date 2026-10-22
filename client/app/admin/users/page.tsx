"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { apiGet } from "@/lib/api";
import UserDrawer, { type UserRow, type Institution, type Programme, type Cohort } from "@/components/admin/UserDrawer";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

type Role = "student" | "educator" | "school_admin" | "client" | "employer";

const ROLES: Role[] = ["student", "educator", "school_admin", "client", "employer"];
const roleBadge: Record<string, string> = {
  student: "bg-blue-100 text-blue-700",
  educator: "bg-purple-100 text-purple-700",
  school_admin: "bg-sky-100 text-sky-700",
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
              {r === "school_admin" ? "School Admin" : r[0].toUpperCase() + r.slice(1)}
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
          <option value="deactivated">Deactivated</option>
          <option value="deleted">Deleted</option>
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
                          u.status !== "active" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-k-gray-400">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.status !== "deleted" && (
                      <button
                        onClick={() => setEditing(u)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-3 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
                      >
                        <SlidersHorizontal size={13} /> Manage
                      </button>
                      )}
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

