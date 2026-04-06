"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, ChevronDown, Check, ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiUpload } from "@/lib/api";

interface Category { id: string; label: string }
interface Client { id: string; full_name: string | null }
interface PhotoEntry { file: File; preview: string }

export default function NewServicePage() {
  const router = useRouter();
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<PhotoEntry[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id, label")
      .order("label")
      .then(({ data }) => setCategories(data ?? []));

    apiGet<{ clients: Client[] }>("/api/services/clients")
      .then((res) => setClients(res.clients))
      .catch(() => {});
  }, []);

  const handleFileSelect = (type: "before" | "after", files: FileList | null) => {
    if (!files?.length) return;
    const entries = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    if (type === "before") setBeforePhotos((p) => [...p, ...entries]);
    else setAfterPhotos((p) => [...p, ...entries]);
  };

  const removePhoto = (type: "before" | "after", index: number) => {
    if (type === "before") {
      setBeforePhotos((p) => {
        URL.revokeObjectURL(p[index].preview);
        return p.filter((_, i) => i !== index);
      });
    } else {
      setAfterPhotos((p) => {
        URL.revokeObjectURL(p[index].preview);
        return p.filter((_, i) => i !== index);
      });
    }
  };

  const handleSubmit = async () => {
    if (!serviceName.trim() || !category) {
      setError("Service name and category are required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      setUploadProgress("Creating service…");
      const { service } = await apiPost<{ service: { id: string } }>("/api/services", {
        name: serviceName.trim(),
        category_id: category,
        client_id: clientId || undefined,
        notes: notes.trim() || undefined,
      });

      const totalPhotos = beforePhotos.length + afterPhotos.length;
      if (totalPhotos > 0) {
        setUploadProgress(
          `Uploading ${totalPhotos} photo${totalPhotos > 1 ? "s" : ""}…`
        );

        const formData = new FormData();
        beforePhotos.forEach((p) => formData.append("before", p.file));
        afterPhotos.forEach((p) => formData.append("after", p.file));

        await apiUpload(`/api/services/${service.id}/photos`, formData);
      }

      beforePhotos.forEach((p) => URL.revokeObjectURL(p.preview));
      afterPhotos.forEach((p) => URL.revokeObjectURL(p.preview));

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit service.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setServiceName("");
    setCategory("");
    setClientId("");
    setNotes("");
    setBeforePhotos([]);
    setAfterPhotos([]);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h1 className="font-serif text-2xl text-k-black mb-2">Service Submitted</h1>
        <p className="text-sm text-k-gray-400 max-w-sm mb-8">
          Your service has been logged.{" "}
          {clientId
            ? "Your client will be notified to confirm. Your educator will verify once confirmed."
            : "Your educator will review it shortly."}
        </p>
        <div className="flex gap-3">
          <Link
            href="/student/services"
            className="rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-black no-underline hover:bg-k-gray-100"
          >
            View Services
          </Link>
          <button
            onClick={resetForm}
            className="rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white hover:bg-k-primary-light"
          >
            Log Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <Link
          href="/student/services"
          className="mb-4 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black"
        >
          <ArrowLeft size={16} /> Back to services
        </Link>
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Log New Service</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Record details and capture photo evidence of your practical.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Service Name
            </label>
            <input
              type="text"
              placeholder="e.g. Full Colour Application"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Service Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-colors focus:border-k-primary"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Volunteer Client{" "}
              <span className="text-k-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-colors focus:border-k-primary"
              >
                <option value="">No client — submit directly to educator</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400"
              />
            </div>
          </div>

          {/* Before Photos */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Before Photos
            </label>
            <p className="mb-3 text-xs text-k-gray-400">Photos taken before the service begins.</p>
            <div className="flex flex-wrap gap-3">
              {beforePhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-k-primary/20"
                >
                  <img
                    src={photo.preview}
                    alt={`Before ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto("before", i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => beforeInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-k-gray-200 text-k-gray-400 transition-colors hover:border-k-primary hover:text-k-primary"
              >
                <ImagePlus size={20} />
                <span className="text-[10px] font-medium">Add Photo</span>
              </button>
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect("before", e.target.files)}
              />
            </div>
          </div>

          {/* After Photos */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              After Photos
            </label>
            <p className="mb-3 text-xs text-k-gray-400">Photos taken after completing the service.</p>
            <div className="flex flex-wrap gap-3">
              {afterPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-k-accent/20"
                >
                  <img
                    src={photo.preview}
                    alt={`After ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto("after", i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => afterInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-k-gray-200 text-k-gray-400 transition-colors hover:border-k-accent hover:text-k-accent"
              >
                <ImagePlus size={20} />
                <span className="text-[10px] font-medium">Add Photo</span>
              </button>
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect("after", e.target.files)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Any additional details about the service performed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-colors focus:border-k-primary resize-none"
            />
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs text-blue-700 leading-5">
              Once submitted, your volunteer client (if selected) will confirm the service. Your
              educator will then verify your work. Verified records are locked.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              href="/student/services"
              className="inline-flex items-center justify-center rounded-full border border-k-gray-200 px-8 py-3 text-sm font-medium text-k-black no-underline hover:bg-k-gray-100"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-8 py-3 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px disabled:opacity-50"
            >
              <Upload size={16} />
              {submitting ? (uploadProgress ?? "Submitting…") : "Submit Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
