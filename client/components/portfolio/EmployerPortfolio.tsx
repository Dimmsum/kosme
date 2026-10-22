"use client";

import { useEffect } from "react";
import { CheckCircle2, EyeOff, ImageOff, X } from "lucide-react";
import type { PortfolioService } from "./ServiceCard";

// After photos lead: they are the finished work an employer wants to see.
function orderedPhotos(service: PortfolioService) {
  return [...service.service_photos].sort((a, b) =>
    a.type === b.type ? 0 : a.type === "after" ? -1 : 1,
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={12} /> Verified
    </span>
  );
}

function NoPhotos({ service }: { service: PortfolioService }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-k-gray-200 bg-k-white py-10 text-k-gray-400">
      {service.photo_consent ? (
        <>
          <ImageOff size={16} />
          <span className="text-xs">No photos</span>
        </>
      ) : (
        <>
          <EyeOff size={16} />
          <span className="text-xs">Photos withheld · no client consent</span>
        </>
      )}
    </div>
  );
}

export function PortfolioSection({
  service,
  onOpen,
}: {
  service: PortfolioService;
  onOpen: () => void;
}) {
  const photos = orderedPhotos(service);
  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;

  return (
    <section>
      <button
        onClick={onOpen}
        className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-left"
      >
        <h2 className="font-serif text-xl font-light text-k-black">
          {service.name}
        </h2>
        <span className="text-sm text-k-gray-400">
          {service.category_id} &middot;
        </span>
        <VerifiedBadge />
      </button>

      {photos.length === 0 ? (
        <NoPhotos service={service} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {shown.map((p, i) => (
            <button
              key={p.id}
              onClick={onOpen}
              aria-label={`Open ${service.name} service record`}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-k-gray-100"
            >
              <img
                src={p.url}
                alt={`${service.name} ${p.type}`}
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
              {extra > 0 && i === shown.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-serif text-2xl text-white">
                  +{extra}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ServiceDetailModal({
  service,
  onClose,
}: {
  service: PortfolioService;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const verification = (service.verifications ?? [])[0];
  const groups = (["after", "before"] as const)
    .map((type) => ({
      type,
      photos: service.service_photos.filter((p) => p.type === type),
    }))
    .filter((g) => g.photos.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${service.name} service record`}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-k-white p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-light text-k-black">
              {service.name}
            </h2>
            <p className="mt-1 text-sm text-k-gray-400">
              {service.category_id} &middot;{" "}
              {new Date(service.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VerifiedBadge />
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-k-gray-400 hover:bg-k-gray-100 hover:text-k-black"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <NoPhotos service={service} />
        ) : (
          groups.map((g) => (
            <div key={g.type} className="mb-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                {g.type === "after" ? "After" : "Before"}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-2xl"
                  >
                    <img
                      src={p.url}
                      alt={`${service.name} ${p.type}`}
                      className="w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          <CheckCircle2 size={12} className="mr-1 inline" />
          Verified
          {verification?.educator?.full_name
            ? ` by ${verification.educator.full_name}`
            : " by an educator"}
          {verification?.created_at &&
            ` on ${new Date(verification.created_at).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            )}`}
        </div>
      </div>
    </div>
  );
}
