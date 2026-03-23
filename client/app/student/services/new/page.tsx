"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Upload, X, ChevronDown, Check } from "lucide-react";

const serviceCategories = [
  "Haircuts",
  "Colour",
  "Styling",
  "Scalp Treatments",
  "Blow-dry",
  "Perming",
  "Hair Extensions",
  "Braiding",
];

const mockClients = [
  { id: 1, name: "Sarah Johnson" },
  { id: 2, name: "Priya Mehta" },
  { id: 3, name: "Lena Kowalski" },
  { id: 4, name: "Amina Rahman" },
  { id: 5, name: "Jade Patterson" },
];

export default function NewServicePage() {
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Mock photo capture — just adds a placeholder
  const capturePhoto = (type: "before" | "after") => {
    const placeholder = `Photo ${type === "before" ? beforePhotos.length + 1 : afterPhotos.length + 1}`;
    if (type === "before") {
      setBeforePhotos([...beforePhotos, placeholder]);
    } else {
      setAfterPhotos([...afterPhotos, placeholder]);
    }
  };

  const removePhoto = (type: "before" | "after", index: number) => {
    if (type === "before") {
      setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h1 className="font-serif text-2xl text-k-black mb-2">Service Submitted</h1>
        <p className="text-sm text-k-gray-400 max-w-sm mb-8">
          Your service has been logged and your client will be notified to confirm. Your educator will verify once the client confirms.
        </p>
        <div className="flex gap-3">
          <Link
            href="/student/services"
            className="rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-black no-underline hover:bg-k-gray-100"
          >
            View Services
          </Link>
          <button
            onClick={() => {
              setSubmitted(false);
              setServiceName("");
              setCategory("");
              setClient("");
              setNotes("");
              setBeforePhotos([]);
              setAfterPhotos([]);
            }}
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
      {/* Back header */}
      <div className="mb-6">
        <Link
          href="/student/services"
          className="mb-4 inline-flex items-center gap-2 text-sm text-k-gray-400 no-underline hover:text-k-black"
        >
          <ArrowLeft size={16} /> Back to services
        </Link>
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Log New Service
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Record details and capture photo evidence of your practical.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Service name */}
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

          {/* Category */}
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
                {serviceCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Volunteer Client
            </label>
            <div className="relative">
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full appearance-none rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black outline-none transition-colors focus:border-k-primary"
              >
                <option value="">Select a client</option>
                {mockClients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-k-gray-400" />
            </div>
          </div>

          {/* Before photos */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              Before Photos
            </label>
            <p className="mb-3 text-xs text-k-gray-400">
              Capture photos using the in-app camera before the service begins. Photos are timestamped and watermarked automatically.
            </p>
            <div className="flex flex-wrap gap-3">
              {beforePhotos.map((_, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 rounded-xl bg-k-primary/5 border border-k-primary/10 flex items-center justify-center"
                >
                  <Camera size={20} className="text-k-primary/40" />
                  <span className="absolute bottom-1 text-[9px] text-k-primary/60">Before {i + 1}</span>
                  <button
                    onClick={() => removePhoto("before", i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => capturePhoto("before")}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-k-gray-200 text-k-gray-400 transition-colors hover:border-k-primary hover:text-k-primary"
              >
                <Camera size={20} />
                <span className="text-[10px] font-medium">Capture</span>
              </button>
            </div>
          </div>

          {/* After photos */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
              After Photos
            </label>
            <p className="mb-3 text-xs text-k-gray-400">
              Capture photos after completing the service to show the result.
            </p>
            <div className="flex flex-wrap gap-3">
              {afterPhotos.map((_, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 rounded-xl bg-k-accent/5 border border-k-accent/10 flex items-center justify-center"
                >
                  <Camera size={20} className="text-k-accent/40" />
                  <span className="absolute bottom-1 text-[9px] text-k-accent/60">After {i + 1}</span>
                  <button
                    onClick={() => removePhoto("after", i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => capturePhoto("after")}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-k-gray-200 text-k-gray-400 transition-colors hover:border-k-accent hover:text-k-accent"
              >
                <Camera size={20} />
                <span className="text-[10px] font-medium">Capture</span>
              </button>
            </div>
          </div>

          {/* Notes */}
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

          {/* Info banner */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs text-blue-700 leading-5">
              Once submitted, your volunteer client will be asked to confirm the service took place. After client confirmation, your educator will review and verify your work. Verified records are locked and cannot be edited.
            </p>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              href="/student/services"
              className="inline-flex items-center justify-center rounded-full border border-k-gray-200 px-8 py-3 text-sm font-medium text-k-black no-underline hover:bg-k-gray-100"
            >
              Cancel
            </Link>
            <button
              onClick={() => setSubmitted(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-k-primary px-8 py-3 text-sm font-medium text-k-white transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px disabled:opacity-50"
            >
              <Upload size={16} />
              Submit Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
