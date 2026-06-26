"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";

export default function VideoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-k-black shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Video */}
        <div className="aspect-video w-full">
          <iframe
            src="https://drive.google.com/file/d/1vsniiouFSDnnwahN0fet3lqFEiV3GwBJ/preview"
            className="h-full w-full"
            allow="autoplay"
            allowFullScreen
            title="Kosmè introduction video"
          />
        </div>

        {/* CTA */}
        <div className="flex justify-center px-6 py-5">
          <Link
            href="/clients"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-white no-underline shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)]"
          >
            Become a Kosmè Beauty Client
          </Link>
        </div>
      </div>
    </div>
  );
}
