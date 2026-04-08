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
} from "lucide-react";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/* ── Types ── */

type ServiceStatus = "awaiting_client" | "awaiting_educator" | "verified" | "rejected";
type FilterOption = "all" | "verified" | "awaiting_educator" | "awaiting_client";

interface Service {
  id: string;
  name: string;
  category_id: string;
  status: ServiceStatus;
  created_at: string;
  client: { id: string; full_name: string | null } | null;
}

interface Category { id: string; label: string }
interface Client { id: string; full_name: string | null }
interface PhotoEntry { id: string; file: File; preview: string }

const STATUS_CFG: Record<ServiceStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  dot: string;
  Icon: typeof CheckCircle2;
}> = {
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
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── Data loading ── */

  const loadServices = () =>
    apiGet<{ services: Service[] }>("/api/services")
      .then((res) => setServices(res.services))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { loadServices(); }, []);

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
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [showForm]);

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
    setClientId("");
    setNotes("");
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setFormError(null);
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!serviceName.trim() || !category) {
      setFormError("Service name and category are required.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      setUploadProgress("Creating service…");
      const { service } = await apiPost<{ service: { id: string } }>("/api/services", {
        name: serviceName.trim(),
        category_id: category,
        client_id: clientId || undefined,
        notes: notes.trim() || undefined,
      });

      if (photos.length > 0) {
        setUploadProgress(`Uploading ${photos.length} photo${photos.length > 1 ? "s" : ""}…`);
        const formData = new FormData();
        photos.forEach((p) => formData.append("photos", p.file));
        await apiUpload(`/api/services/${service.id}/photos`, formData);
      }

      setSubmitted(true);
      loadServices();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit service.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  /* ── Render ── */

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8 max-w-5xl">

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
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-7 py-3 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(59,10,42,0.18)] hover:shadow-[0_8px_32px_rgba(59,10,42,0.26)]"
          >
            <Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" />
            Log New Service
          </button>
        )}
      </div>

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
                            onChange={(e) => setCategory(e.target.value)}
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
                        Your volunteer client (if selected) will confirm the service. Your educator will then verify.
                      </p>
                      <div className="flex gap-3 sm:ml-auto">
                        <button
                          onClick={() => { resetForm(); setShowForm(false); }}
                          className="rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-black hover:bg-k-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-full bg-k-primary px-7 py-2.5 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 shadow-[0_4px_20px_rgba(59,10,42,0.15)]"
                        >
                          <Upload size={15} />
                          {submitting ? (uploadProgress ?? "Submitting…") : "Submit Service"}
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
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

