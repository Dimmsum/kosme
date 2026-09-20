"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
  ImagePlus,
  Check,
  ClipboardList,
  Sparkles,
  GripVertical,
  User,
  Play,
  Square,
  Timer,
} from "lucide-react";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/* ── Types ── */

type ServiceStatus =
  | "in_progress"
  | "awaiting_client"
  | "awaiting_educator"
  | "verified"
  | "rejected";
type FilterOption = "all" | "verified" | "awaiting_educator" | "awaiting_client";

type ClientSource =
  | "friend_family"
  | "school_assigned"
  | "walk_in_client_day"
  | "salon_placement"
  | "kosme_volunteer"
  | "other";

const CLIENT_SOURCE_OPTIONS: { value: ClientSource; label: string }[] = [
  { value: "friend_family", label: "Friend/Family" },
  { value: "school_assigned", label: "School assigned" },
  { value: "walk_in_client_day", label: "Walk-in client day" },
  { value: "salon_placement", label: "Salon placement" },
  { value: "kosme_volunteer", label: "Kosmè volunteer" },
  { value: "other", label: "Other" },
];

interface Service {
  id: string;
  name: string;
  category_id: string;
  service_type_id: string | null;
  client_source: ClientSource;
  status: ServiceStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  actual_duration_min: number | null;
  duration_tag: "under" | "within" | "over" | null;
  client: { id: string; full_name: string | null } | null;
}

interface Category { id: string; label: string }
interface Client { id: string; full_name: string | null }
interface ServiceType {
  id: string;
  category_id: string;
  name: string;
  recommended_duration_min: number | null;
  recommended_duration_max: number | null;
}
interface PhotoEntry { id: string; file: File; preview: string }

const STATUS_CFG: Record<ServiceStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  dot: string;
  Icon: typeof CheckCircle2;
}> = {
  in_progress:       { label: "In Progress",       shortLabel: "Running",   color: "text-k-primary",   bg: "bg-k-primary/10", dot: "bg-k-primary", Icon: Timer },
  verified:          { label: "Verified",          shortLabel: "Verified",  color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500", Icon: CheckCircle2 },
  awaiting_educator: { label: "Awaiting Educator", shortLabel: "Pending",   color: "text-blue-700",   bg: "bg-blue-50",    dot: "bg-blue-500",   Icon: Clock },
  awaiting_client:   { label: "Awaiting Client",   shortLabel: "Client",    color: "text-amber-700",  bg: "bg-amber-50",   dot: "bg-amber-500",  Icon: AlertCircle },
  rejected:          { label: "Rejected",          shortLabel: "Rejected",  color: "text-red-700",    bg: "bg-red-50",     dot: "bg-red-500",    Icon: AlertCircle },
};

const FILTERS: { key: FilterOption; label: string; icon: typeof CheckCircle2 }[] = [
  { key: "all",                label: "All",             icon: ClipboardList },
  { key: "verified",           label: "Verified",        icon: CheckCircle2 },
  { key: "awaiting_educator",  label: "Pending Review",  icon: Clock },
  { key: "awaiting_client",    label: "Awaiting Client", icon: AlertCircle },
];

/* ── Helpers ── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Elapsed seconds → "HH:MM:SS" (or "MM:SS" under an hour). */
function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

function formatRange(min: number | null, max: number | null) {
  if (min != null && max != null) return `${min}–${max} min`;
  if (min != null) return `min ${min} min`;
  if (max != null) return `up to ${max} min`;
  return null;
}

/* ── Component ── */

export default function ServicesPage() {
  /* list state */
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");

  /* form state */
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSource, setClientSource] = useState<ClientSource | "">("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* live timer tick for the active (in_progress) service */
  const [now, setNow] = useState(() => Date.now());
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── Data loading ── */

  const loadServices = () =>
    apiGet<{ services: Service[] }>("/api/services")
      .then((res) => setServices(res.services))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadServices();
    // Loaded on mount too (not just when the form opens) so the active-service
    // card can show the recommended range for a running service.
    apiGet<{ serviceTypes: ServiceType[] }>("/api/services/service-types")
      .then((res) => setServiceTypes(res.serviceTypes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showForm) return;
    supabase
      .from("service_categories")
      .select("id, label")
      .order("label")
      .then(({ data }) => setCategories(data ?? []));
    apiGet<{ clients: Client[] }>("/api/services/clients")
      .then((res) => setClients(res.clients))
      .catch(() => {});
    apiGet<{ serviceTypes: ServiceType[] }>("/api/services/service-types")
      .then((res) => setServiceTypes(res.serviceTypes))
      .catch(() => {});
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [showForm]);

  /* ── Active service + live timer ── */

  const activeService = services.find((s) => s.status === "in_progress") ?? null;

  useEffect(() => {
    if (!activeService) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeService]);

  const handleStop = async (id: string) => {
    setStoppingId(id);
    try {
      await apiPost(`/api/services/${id}/stop`, {});
      await loadServices();
    } catch {
      /* leave the card in place; user can retry */
    } finally {
      setStoppingId(null);
    }
  };

  /* ── Filtering ── */

  const filtered = services.filter((s) => {
    const matchesFilter = activeFilter === "all" || s.status === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.client?.full_name ?? "").toLowerCase().includes(q) ||
      s.category_id.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts: Record<FilterOption, number> = {
    all: services.length,
    verified: services.filter((s) => s.status === "verified").length,
    awaiting_educator: services.filter((s) => s.status === "awaiting_educator").length,
    awaiting_client: services.filter((s) => s.status === "awaiting_client").length,
  };

  /* ── Form handlers ── */

  let photoIdCounter = useRef(0);

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const entries = Array.from(files).map((file) => ({
      id: `photo-${Date.now()}-${photoIdCounter.current++}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((p) => [...p, ...entries]);
  };

  const removePhoto = (id: string) => {
    setPhotos((p) => {
      const target = p.find((ph) => ph.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return p.filter((ph) => ph.id !== id);
    });
  };

  const resetForm = () => {
    setServiceName("");
    setCategory("");
    setServiceTypeId("");
    setClientId("");
    setClientSource("");
    setNotes("");
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setFormError(null);
    setSubmitted(false);
  };

  // Types belonging to the chosen category, and the selected type's range.
  const typesForCategory = serviceTypes.filter((t) => t.category_id === category);
  const selectedType = serviceTypes.find((t) => t.id === serviceTypeId) ?? null;
  const recommendedRange = selectedType
    ? formatRange(selectedType.recommended_duration_min, selectedType.recommended_duration_max)
    : null;

  // timed=true starts the server-side timer immediately (status → in_progress);
  // timed=false is the instant-log path that routes straight to client/educator.
  const handleSubmit = async (timed: boolean) => {
    if (!serviceName.trim() || !category) {
      setFormError("Service name and category are required.");
      return;
    }
    if (!clientSource) {
      setFormError("Client source is required.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      setUploadProgress(timed ? "Starting service…" : "Creating service…");
      const { service } = await apiPost<{ service: { id: string } }>("/api/services", {
        name: serviceName.trim(),
        category_id: category,
        service_type_id: serviceTypeId || undefined,
        client_id: clientId || undefined,
        client_source: clientSource,
        notes: notes.trim() || undefined,
        start_now: timed,
      });

      if (photos.length > 0) {
        setUploadProgress(`Uploading ${photos.length} photo${photos.length > 1 ? "s" : ""}…`);
        const formData = new FormData();
        photos.forEach((p) => formData.append("photos", p.file));
        await apiUpload(`/api/services/${service.id}/photos`, formData);
      }

      await loadServices();
      if (timed) {
        // Timer is now running — collapse the form and show the active card.
        resetForm();
        setShowForm(false);
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit service.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  /* ── Render ── */

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">

      {/* ━━ Header ━━ */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light tracking-tight3 text-k-black sm:text-3xl">
            My Services
          </h1>
          <p className="mt-1.5 text-sm text-k-gray-400">
            Track, manage and log your practicals
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-k-primary px-7 py-3 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(59,10,42,0.18)] hover:shadow-[0_8px_32px_rgba(59,10,42,0.26)] sm:w-auto"
          >
            <Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" />
            Log New Service
          </button>
        )}
      </div>

      {/* ━━ Active (running) Service ━━ */}
      <AnimatePresence>
        {activeService && (() => {
          const type = serviceTypes.find((t) => t.id === activeService.service_type_id) ?? null;
          const range = type
            ? formatRange(type.recommended_duration_min, type.recommended_duration_max)
            : null;
          const elapsedSec = activeService.started_at
            ? (now - new Date(activeService.started_at).getTime()) / 1000
            : 0;
          const overMax =
            type?.recommended_duration_max != null &&
            elapsedSec / 60 > type.recommended_duration_max;
          return (
            <motion.div
              key="active-service"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="mb-8 overflow-hidden rounded-3xl border border-k-primary/20 bg-gradient-to-br from-k-primary/[0.06] to-k-white shadow-[0_8px_40px_rgba(59,10,42,0.08)]"
            >
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-k-primary/10">
                    <Timer size={22} className="text-k-primary" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-k-primary/60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-k-primary" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-k-primary">Service in progress</p>
                    <p className="truncate font-serif text-lg text-k-black">{activeService.name}</p>
                    {range && (
                      <p className={`mt-0.5 text-xs ${overMax ? "text-red-600 font-medium" : "text-k-gray-400"}`}>
                        Recommended: {range}{overMax ? " · over recommended time" : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:gap-6">
                  <div className="text-right">
                    <p className={`font-serif text-3xl tabular-nums tracking-tight ${overMax ? "text-red-600" : "text-k-black"}`}>
                      {formatElapsed(elapsedSec)}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-k-gray-400">Elapsed</p>
                  </div>
                  <button
                    onClick={() => handleStop(activeService.id)}
                    disabled={stoppingId === activeService.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-6 py-3 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 shadow-[0_4px_20px_rgba(59,10,42,0.18)]"
                  >
                    <Square size={15} className="fill-current" />
                    {stoppingId === activeService.id ? "Stopping…" : "Stop Service"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ━━ Inline New Service Form ━━ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            ref={formRef}
            key="inline-form"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 300, mass: 0.8 }}
            className="mb-8 rounded-3xl border border-k-primary/10 bg-gradient-to-b from-k-white to-k-gray-100/40 shadow-[0_8px_40px_rgba(59,10,42,0.06)] overflow-hidden"
          >
            {/* Form header bar */}
            <div className="flex items-center justify-between border-b border-k-gray-200 bg-k-white px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-k-primary/10"
                >
                  <Sparkles size={16} className="text-k-primary" />
                </motion.div>
                <div>
                  <h2 className="font-serif text-lg text-k-black leading-tight">Log New Service</h2>
                  <p className="text-xs text-k-gray-400">Record your practical details and evidence</p>
                </div>
              </div>
              <button
                onClick={() => { resetForm(); setShowForm(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-k-gray-400 transition-colors hover:bg-k-gray-100 hover:text-k-black"
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                /* ── Success ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center px-6 py-14 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 180, delay: 0.12 }}
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
                  >
                    <Check size={32} className="text-emerald-600" />
                  </motion.div>
                  <h3 className="font-serif text-2xl text-k-black mb-2">Service Logged</h3>
                  <p className="text-sm text-k-gray-400 max-w-sm mb-8 leading-relaxed">
                    {clientId
                      ? "Your client will be notified to confirm the session. Your educator will verify after confirmation."
                      : "Your educator will review and verify your work shortly."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { resetForm(); setShowForm(false); }}
                      className="rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-black hover:bg-k-gray-100 transition-colors"
                    >
                      Done
                    </button>
                    <button
                      onClick={resetForm}
                      className="rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white hover:bg-k-primary-light transition-colors"
                    >
                      Log Another
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Form fields ── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 sm:p-8"
                >
                  <div className="mx-auto max-w-2xl flex flex-col gap-6">
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl bg-red-50 border border-red-100 px-5 py-3.5 flex items-start gap-3"
                      >
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                        <p className="text-sm text-red-700">{formError}</p>
                      </motion.div>
                    )}

                    {/* Row: name + category */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                          Service Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Full Colour Application"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                          Category
                        </label>
                        <div className="relative">
                          <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setServiceTypeId(""); }}
                            className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
                          >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Service type (from the admin catalog) + recommended duration */}
                    {category && typesForCategory.length > 0 && (
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                          Service Type <span className="text-k-gray-400 normal-case font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <select
                            value={serviceTypeId}
                            onChange={(e) => setServiceTypeId(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
                          >
                            <option value="">Select a service type</option>
                            {typesForCategory.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
                        </div>
                        {recommendedRange && (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-k-primary/5 px-3 py-1 text-[11px] font-medium text-k-primary">
                            <Timer size={12} />
                            Recommended: {recommendedRange}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Volunteer client */}
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                        Volunteer Client <span className="text-k-gray-400 normal-case font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <select
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
                        >
                          <option value="">No client — submit directly to educator</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
                      </div>
                    </div>

                    {/* Client source */}
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                        Client Source
                      </label>
                      <div className="relative">
                        <select
                          value={clientSource}
                          onChange={(e) => setClientSource(e.target.value as ClientSource)}
                          className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
                        >
                          <option value="">Select a client source</option>
                          {CLIENT_SOURCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
                      </div>
                    </div>

                    {/* Photos */}
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                        Photos
                      </label>
                      <Reorder.Group
                        axis="x"
                        values={photos}
                        onReorder={setPhotos}
                        className="flex flex-wrap gap-2.5"
                      >
                        {photos.map((photo) => (
                          <Reorder.Item
                            key={photo.id}
                            value={photo}
                            whileDrag={{ scale: 1.08, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 10 }}
                            className="relative h-24 w-24 cursor-grab active:cursor-grabbing rounded-xl border border-k-primary/20 overflow-hidden group/photo"
                          >
                            <img src={photo.preview} alt="Service photo" className="h-full w-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 transition-colors" />
                            <div className="absolute left-1/2 bottom-1 -translate-x-1/2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                              <GripVertical size={14} className="text-white drop-shadow-md" />
                            </div>
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm opacity-0 group-hover/photo:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </Reorder.Item>
                        ))}
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-k-gray-200 text-k-gray-400 transition-colors hover:border-k-primary hover:text-k-primary"
                        >
                          <ImagePlus size={20} />
                          <span className="text-[10px] font-medium">Add</span>
                        </button>
                      </Reorder.Group>
                      {photos.length > 1 && (
                        <p className="mt-2 text-[11px] text-k-gray-400">
                          Drag to reorder
                        </p>
                      )}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-600">
                        Notes <span className="text-k-gray-400 normal-case font-normal">(optional)</span>
                      </label>
                      <textarea
                        placeholder="Any additional details about the service performed..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)] resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-4 border-t border-k-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="hidden sm:block text-xs text-k-gray-400 max-w-xs leading-relaxed">
                        <strong className="font-medium text-k-gray-600">Start Service</strong> times the session live. Or log it instantly without a timer — either way your client (if selected) confirms, then your educator verifies.
                      </p>
                      <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:gap-3">
                        <button
                          onClick={() => { resetForm(); setShowForm(false); }}
                          className="w-full rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-black hover:bg-k-gray-100 transition-colors sm:w-auto"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmit(false)}
                          disabled={submitting}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-k-primary/30 px-6 py-2.5 text-sm font-medium text-k-primary transition-all duration-200 hover:bg-k-primary/5 disabled:opacity-50 sm:w-auto"
                        >
                          <Upload size={15} />
                          Log without timer
                        </button>
                        <button
                          onClick={() => handleSubmit(true)}
                          disabled={submitting}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-k-primary px-7 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 shadow-[0_4px_20px_rgba(59,10,42,0.15)] sm:w-auto"
                        >
                          <Play size={15} />
                          {submitting ? (uploadProgress ?? "Working…") : "Start Service"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━ Filter tabs + Search ━━ */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(({ key, label, icon: FIcon }) => {
            const active = activeFilter === key;
            const count = counts[key];
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 ${
                  active
                    ? "bg-k-primary text-k-white shadow-[0_2px_8px_rgba(59,10,42,0.2)]"
                    : "bg-k-white text-k-gray-600 border border-k-gray-200 hover:border-k-gray-400 hover:text-k-black"
                }`}
              >
                <FIcon size={13} className={active ? "text-k-white/70" : "text-k-gray-400 group-hover:text-k-gray-600"} />
                {label}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  active
                    ? "bg-white/20 text-k-white"
                    : "bg-k-gray-100 text-k-gray-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-k-gray-200 bg-k-white py-2 pl-10 pr-4 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.06)]"
          />
        </div>
      </div>

      {/* ━━ Services list ━━ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-k-gray-200 bg-k-white py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-k-gray-100">
            <ClipboardList size={24} className="text-k-gray-400" />
          </div>
          <p className="text-sm font-medium text-k-gray-600">
            {search ? "No services match your search" : "No services yet"}
          </p>
          <p className="mt-1 text-xs text-k-gray-400 max-w-xs">
            {search
              ? "Try adjusting your search term or filter."
              : "Log your first practical to start building your record."}
          </p>
          {!search && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-k-primary px-5 py-2 text-xs font-medium text-k-white hover:bg-k-primary-light transition-colors"
            >
              <Plus size={14} /> Log a Service
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white overflow-hidden">
          {/* Column headers — desktop only */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_140px_140px_120px_28px] items-center gap-4 border-b border-k-gray-200 bg-k-gray-100/60 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-k-gray-400">
            <span>Service</span>
            <span>Category</span>
            <span>Client</span>
            <span>Status</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-k-gray-200/70">
            {filtered.map((service) => {
              const cfg = STATUS_CFG[service.status] ?? STATUS_CFG.rejected;
              return (
                <Link
                  key={service.id}
                  href={`/student/services/${service.id}`}
                  className="group flex items-center gap-4 px-5 py-3.5 no-underline transition-colors hover:bg-k-gray-100/50
                             sm:grid sm:grid-cols-[1fr_140px_140px_120px_28px]"
                >
                  {/* Service name + date */}
                  <div className="flex-1 min-w-0 sm:flex sm:flex-col">
                    <p className="text-sm font-medium text-k-black truncate group-hover:text-k-primary transition-colors">
                      {service.name}
                    </p>
                    <p className="text-[11px] text-k-gray-400 mt-0.5 sm:hidden">
                      {service.category_id} &middot; {formatDateShort(service.created_at)}
                    </p>
                    <p className="hidden sm:block text-[11px] text-k-gray-400 mt-0.5">
                      {formatDate(service.created_at)}
                    </p>
                  </div>

                  {/* Category — desktop */}
                  <p className="hidden sm:block text-xs text-k-gray-600 truncate">
                    {service.category_id}
                  </p>

                  {/* Client — desktop */}
                  <div className="hidden sm:flex items-center gap-2 min-w-0">
                    {service.client ? (
                      <>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                          <User size={10} className="text-k-gray-400" />
                        </div>
                        <span className="text-xs text-k-gray-600 truncate">{service.client.full_name ?? "—"}</span>
                      </>
                    ) : (
                      <span className="text-xs text-k-gray-400">—</span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0 ml-auto sm:ml-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <span className="hidden sm:inline">{cfg.shortLabel}</span>
                      <span className="sm:hidden">{cfg.shortLabel}</span>
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronRight size={16} className="hidden sm:block shrink-0 text-k-gray-400/50 group-hover:text-k-primary transition-colors" />
                </Link>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="border-t border-k-gray-200 bg-k-gray-100/40 px-5 py-2.5">
            <p className="text-[11px] text-k-gray-400">
              Showing {filtered.length} of {services.length} services
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

