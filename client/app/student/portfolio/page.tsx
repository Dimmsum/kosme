"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Share2,
  Grid,
  List,
} from "lucide-react";
import { apiGet } from "@/lib/api";

type PortfolioApiRow = {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  service_photos?: Array<{
    id: string;
    type: "before" | "after";
    url: string;
  }>;
  verifications?: Array<{
    educator?: {
      full_name?: string | null;
    } | null;
  }>;
};

type PortfolioApiResponse = {
  portfolio: PortfolioApiRow[];
};

type PortfolioItem = {
  id: string;
  name: string;
  category: string;
  date: string;
  educator: string;
  photos: string[];
};

export default function PortfolioPage() {
  const [verifiedServices, setVerifiedServices] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPortfolio = async () => {
      try {
        const data = await apiGet<PortfolioApiResponse>("/api/portfolio");
        if (!mounted) return;

        const mapped = data.portfolio.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.category_id,
          date: new Date(service.created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          educator:
            service.verifications?.[0]?.educator?.full_name ?? "Educator",
          photos: (service.service_photos ?? []).map((photo) => photo.url),
        }));

        setVerifiedServices(mapped);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load portfolio",
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadPortfolio();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(verifiedServices.map((s) => s.category))),
    ],
    [verifiedServices],
  );

  const filtered =
    activeCategory === "All"
      ? verifiedServices
      : verifiedServices.filter((s) => s.category === activeCategory);

  const selected = verifiedServices.find((s) => s.id === selectedService);
  const selectedPhotos = selected?.photos ?? [];
  const activePhoto =
    selectedPhotos.length > 0
      ? selectedPhotos[Math.min(selectedPhotoIndex, selectedPhotos.length - 1)]
      : null;

  const handlePrevPhoto = () => {
    if (selectedPhotos.length <= 1) return;
    setSelectedPhotoIndex((prev) =>
      prev === 0 ? selectedPhotos.length - 1 : prev - 1,
    );
  };

  const handleNextPhoto = () => {
    if (selectedPhotos.length <= 1) return;
    setSelectedPhotoIndex((prev) =>
      prev === selectedPhotos.length - 1 ? 0 : prev + 1,
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <p className="text-sm text-k-gray-400">Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            My Portfolio
          </h1>
          <p className="mt-1 text-sm text-k-gray-400">
            {verifiedServices.length} verified services &middot; Only verified
            work is visible
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-full border border-k-gray-200 bg-k-white px-5 py-2.5 text-sm font-medium text-k-black transition-colors hover:bg-k-gray-100">
          <Share2 size={14} />
          Share Portfolio
        </button>
      </div>

      {/* Portfolio stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-primary">
            {verifiedServices.length}
          </p>
          <p className="text-xs text-k-gray-400 mt-1">Verified</p>
        </div>
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-black">
            {new Set(verifiedServices.map((s) => s.category)).size}
          </p>
          <p className="text-xs text-k-gray-400 mt-1">Categories</p>
        </div>
        <div className="rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-center">
          <p className="font-serif text-2xl text-k-black">
            {new Set(verifiedServices.map((s) => s.educator).filter(Boolean)).size}
          </p>
          <p className="text-xs text-k-gray-400 mt-1">Educators</p>
        </div>
      </div>

      {/* Filters + view toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-k-primary text-k-white"
                  : "bg-k-white border border-k-gray-200 text-k-gray-600 hover:bg-k-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 self-end shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-k-primary/10 text-k-primary"
                : "text-k-gray-400 hover:text-k-black"
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "list"
                ? "bg-k-primary/10 text-k-primary"
                : "text-k-gray-400 hover:text-k-black"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Portfolio grid / list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                setSelectedService(service.id);
                setSelectedPhotoIndex(0);
                setPhotoError(null);
              }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white text-left transition-all hover:border-k-primary/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="relative aspect-[4/3] bg-gradient-to-br from-k-primary/5 to-k-accent/5">
                {service.photos[0] ? (
                  <img
                    src={service.photos[0]}
                    alt={`${service.name} photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-k-gray-400">
                    No photos yet
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 rounded-full bg-k-white/90 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">
                  {service.photos.length} photos
                </div>
              </div>

              <div className="p-3">
                <p className="text-sm font-medium text-k-black truncate">
                  {service.name}
                </p>
                <p className="text-xs text-k-gray-400 mt-0.5">{service.date}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                setSelectedService(service.id);
                setSelectedPhotoIndex(0);
                setPhotoError(null);
              }}
              className="group flex flex-col gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-4 text-left transition-all hover:border-k-primary/20 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-k-primary/5 to-k-accent/5 flex items-center justify-center sm:h-14 sm:w-20">
                {service.photos[0] ? (
                  <img
                    src={service.photos[0]}
                    alt={`${service.name} thumbnail`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-k-gray-400">No photo</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-k-black">
                  {service.name}
                </p>
                <p className="text-xs text-k-gray-400 mt-0.5">
                  {service.category} &middot; {service.photos.length} photos
                  &middot; {service.date}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={12} /> Verified
                </span>
                <Eye
                  size={16}
                  className="text-k-gray-400 group-hover:text-k-primary transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="mx-auto my-4 w-full max-w-lg rounded-3xl bg-k-white p-5 sm:my-8 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-serif text-xl text-k-black">
                  {selected.name}
                </h2>
                <p className="text-xs text-k-gray-400 mt-0.5">
                  {selected.category} &middot; {selected.date}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 size={12} /> Verified
              </span>
            </div>

            <div className="mb-5">
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-k-primary/5 to-k-accent/5">
                {activePhoto ? (
                  <img
                    src={activePhoto}
                    alt={`${selected.name} photo ${selectedPhotoIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-k-gray-400">
                    <ImagePlus size={22} />
                    <span className="mt-1 text-xs">No photos added</span>
                  </div>
                )}

                {selectedPhotos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-k-white/90 p-1.5 text-k-black hover:bg-k-white"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-k-white/90 p-1.5 text-k-black hover:bg-k-white"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-2 right-2 rounded-full bg-k-white/90 px-2 py-0.5 text-[10px] font-medium text-k-gray-600">
                  {selectedPhotos.length === 0
                    ? "0 / 0"
                    : `${selectedPhotoIndex + 1} / ${selectedPhotos.length}`}
                </div>
              </div>

              {selectedPhotos.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {selectedPhotos.map((photo, index) => (
                    <button
                      key={`${photo}-${index}`}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                        index === selectedPhotoIndex
                          ? "border-k-primary"
                          : "border-k-gray-200"
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-700">This service is verified and locked. Photos cannot be modified.</p>
              </div>
            </div>

            {/* Details */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-k-gray-100 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Verified by
                </p>
                <p className="text-sm text-k-black mt-0.5">
                  {selected.educator}
                </p>
              </div>
              <div className="rounded-xl bg-k-gray-100 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Photos
                </p>
                <p className="text-sm text-k-black mt-0.5">
                  {selectedPhotos.length} in carousel
                </p>
              </div>
            </div>

            {photoError && (
              <p className="mb-4 text-xs text-red-600">{photoError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedService(null)}
                className="flex-1 rounded-full border border-k-gray-200 py-2.5 text-sm font-medium text-k-black hover:bg-k-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
