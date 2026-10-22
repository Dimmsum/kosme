"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface Person {
  id: string;
  full_name: string | null;
  status: string;
  student_id: string | null;
  staff_id: string | null;
  programme: { name: string } | null;
  cohort: { name: string } | null;
}

export default function SchoolAdminPeople() {
  const [role, setRole] = useState<"student" | "educator">("student");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPeople(null);
    apiGet<{ people: Person[] }>(`/api/school-admin/people?role=${role}`)
      .then((r) => setPeople(r.people))
      .catch(() => setError("Failed to load people."));
  }, [role]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader title="People" subtitle="Students and educators at your institution." />
      <div className="mb-6 flex gap-2">
        {(["student", "educator"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${role === r ? "bg-k-primary text-k-white" : "bg-k-white text-k-gray-600 border border-k-gray-200"}`}
          >
            {r === "student" ? "Students" : "Educators"}
          </button>
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      {!people && !error ? (
        <LoadingCard label="Loading…" />
      ) : people && people.length === 0 ? (
        <EmptyCard label="Nobody here yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-k-gray-200 bg-k-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-k-gray-200 text-xs uppercase tracking-wide text-k-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">{role === "student" ? "Student ID" : "Staff ID"}</th>
                <th className="px-5 py-3 font-medium">Programme</th>
                <th className="px-5 py-3 font-medium">Cohort</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-k-gray-200">
              {people?.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium text-k-black">{p.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-k-gray-600">{(role === "student" ? p.student_id : p.staff_id) ?? "—"}</td>
                  <td className="px-5 py-3 text-k-gray-600">{p.programme?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-k-gray-600">{p.cohort?.name ?? "—"}</td>
                  <td className="px-5 py-3 capitalize text-k-gray-600">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
