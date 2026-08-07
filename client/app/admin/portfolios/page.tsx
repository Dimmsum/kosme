"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, CheckCircle2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import Modal from "@/components/admin/Modal";
import { LoadingCard, EmptyCard, ErrorBanner } from "@/components/admin/DataStates";

interface StudentRow {
  id: string;
  full_name: string | null;
  is_demo: boolean;
  institution: { name: string } | null;
  total_services: number;
  verified_services: number;
}
interface PortfolioService {
  id: string;
  name: string;
  category_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  service_photos: { id: string; type: "before" | "after"; url: string }[];
}

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export default function AdminPortfoliosPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { students } = await apiGet<{ students: StudentRow[] }>("/api/admin/portfolios");
      setStudents(students);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Failed to load portfolios."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-10 sm:px-10">
      <AdminHeader
        title="Portfolio Oversight"
        subtitle="Each student's portfolio, built only from educator-verified work."
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingCard label="Loading portfolios…" />
      ) : students.length === 0 ? (
        <EmptyCard label="No students yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="rounded-2xl border border-k-gray-200 bg-k-white p-5 text-left transition-colors hover:bg-k-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                  <FolderOpen size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-k-black">{s.full_name ?? "Unnamed student"}</p>
                  <p className="truncate text-xs text-k-gray-400">{s.institution?.name ?? "No institution"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-k-gray-600">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="font-semibold text-k-black">{s.verified_services}</span> verified
                </span>
                <span className="text-k-gray-400">{s.total_services} total</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <PortfolioDetail student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PortfolioDetail({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const [services, setServices] = useState<PortfolioService[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { services } = await apiGet<{ services: PortfolioService[] }>(`/api/admin/portfolios/${student.id}`);
        setServices(services);
      } catch (e) {
        setError(errMsg(e, "Failed to load portfolio."));
      }
    })();
  }, [student.id]);

  return (
    <Modal open title={student.full_name ?? "Student portfolio"} onClose={onClose}>
      {error && <ErrorBanner message={error} />}
      {!services ? (
        <p className="py-8 text-center text-sm text-k-gray-400">Loading verified work…</p>
      ) : services.length === 0 ? (
        <p className="py-8 text-center text-sm text-k-gray-400">No verified services yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((s) => (
            <div key={s.id} className="rounded-2xl border border-k-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-k-black">{s.name}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">verified</span>
              </div>
              <p className="mt-0.5 text-xs text-k-gray-400">{s.category_id}</p>
              {s.notes && <p className="mt-2 text-sm text-k-gray-600">{s.notes}</p>}
              {s.service_photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {s.service_photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg border border-k-gray-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.type} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
