import { CheckCircle2, EyeOff, ImageOff } from "lucide-react";

export interface Photo {
  id: string;
  type: "before" | "after";
  url: string;
}

export interface PortfolioService {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  photo_consent: boolean;
  service_photos: Photo[];
  verifications: Array<{
    id: string;
    created_at: string;
    educator: { full_name: string | null } | null;
  }>;
}

function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {photos.slice(0, 4).map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-square overflow-hidden rounded-xl"
        >
          <img
            src={p.url}
            alt={p.type}
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
}

export function ServiceCard({ service }: { service: PortfolioService }) {
  const before = service.service_photos.filter((p) => p.type === "before");
  const after = service.service_photos.filter((p) => p.type === "after");
  const verification = (service.verifications ?? [])[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-k-gray-200 bg-k-white">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <p className="font-serif text-base font-medium text-k-black leading-snug">
            {service.name}
          </p>
          <p className="mt-0.5 text-xs text-k-gray-400">
            {service.category_id} &middot;{" "}
            {new Date(service.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={12} /> Verified
        </span>
      </div>

      {service.service_photos.length > 0 ? (
        <div className="px-5 pb-5">
          {before.length > 0 && after.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  Before
                </p>
                <PhotoGrid photos={before} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  After
                </p>
                <PhotoGrid photos={after} />
              </div>
            </div>
          ) : (
            <PhotoGrid photos={service.service_photos} />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-5 pb-5 text-k-gray-400">
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
      )}

      {verification?.educator?.full_name && (
        <div className="border-t border-k-gray-200 px-5 py-2.5">
          <p className="text-xs text-k-gray-400">
            Verified by {verification.educator.full_name}
          </p>
        </div>
      )}
    </div>
  );
}

