"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ImageOff, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

interface FeedPhoto {
  id: string;
  type: "before" | "after";
  url: string;
}

interface FeedItem {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  student: { id: string; full_name: string | null } | null;
  service_photos: FeedPhoto[];
}

interface FeedResponse {
  feed: FeedItem[];
  nextCursor: string | null;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ServiceCard({ item }: { item: FeedItem }) {
  const before = item.service_photos.filter((p) => p.type === "before");
  const after = item.service_photos.filter((p) => p.type === "after");
  const hasPhotos = item.service_photos.length > 0;
  const canViewPortfolio = Boolean(item.student?.id);
  const portfolioHref = canViewPortfolio
    ? `/volunteer/browse/${item.student!.id}`
    : "/volunteer/browse";

  return (
    <div className="overflow-hidden rounded-3xl border border-k-gray-200 bg-k-white">
      {/* Card header — student identity */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link
          href={portfolioHref}
          className="flex items-center gap-3 no-underline group"
          aria-disabled={!canViewPortfolio}
          onClick={(e) => {
            if (!canViewPortfolio) e.preventDefault();
          }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-k-primary/10 ring-2 ring-transparent transition-all group-hover:ring-k-primary/30">
            <span className="text-sm font-semibold text-k-primary">
              {initials(item.student?.full_name)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-k-black group-hover:text-k-primary transition-colors leading-tight">
              {item.student?.full_name ?? "Student"}
            </p>
            <p className="text-xs text-k-gray-400">
              {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </Link>
        <span className="rounded-full bg-k-gray-100 px-3 py-1 text-xs font-medium text-k-gray-600">
          {item.category_id}
        </span>
      </div>

      {/* Service name */}
      <div className="px-5 pb-3">
        <p className="font-serif text-lg font-light text-k-black leading-snug">
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={12} />
          <span>Verified</span>
        </div>
      </div>

      {/* Photos */}
      {hasPhotos ? (
        <div className="px-5 pb-5">
          {before.length > 0 && after.length > 0 ? (
            /* Before & after side by side */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  Before
                </p>
                <div className="flex flex-col gap-1.5">
                  {before.slice(0, 2).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={p.url}
                        alt="Before"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                  After
                </p>
                <div className="flex flex-col gap-1.5">
                  {after.slice(0, 2).map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={p.url}
                        alt="After"
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Only one type — grid */
            <div className="grid grid-cols-3 gap-1.5">
              {item.service_photos.slice(0, 6).map((p) => (
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
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-5 pb-5 text-k-gray-300">
          <ImageOff size={18} />
          <span className="text-xs">No photos</span>
        </div>
      )}

      {/* Footer — view full portfolio */}
      <div className="border-t border-k-gray-100 px-5 py-3">
        {canViewPortfolio ? (
          <Link
            href={portfolioHref}
            className="text-xs font-medium text-k-primary no-underline hover:underline"
          >
            View {item.student?.full_name?.split(" ")[0] ?? "student"}'s full portfolio →
          </Link>
        ) : (
          <p className="text-xs font-medium text-k-gray-400">
            Portfolio details unavailable for this entry
          </p>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (cursor?: string) => {
    const path = cursor
      ? `/api/portfolio/feed?cursor=${encodeURIComponent(cursor)}`
      : "/api/portfolio/feed";

    const res = await apiGet<FeedResponse>(path);
    return res;
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage()
      .then((res) => {
        setItems(res.feed);
        setNextCursor(res.nextCursor);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load feed.");
      })
      .finally(() => setLoading(false));
  }, [fetchPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!nextCursor || loadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setLoadingMore(true);
        fetchPage(nextCursor)
          .then((res) => {
            setItems((prev) => [...prev, ...res.feed]);
            setNextCursor(res.nextCursor);
          })
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Failed to load more.");
          })
          .finally(() => setLoadingMore(false));
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchPage]);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
          Browse Portfolios
        </h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Discover verified student work from across the school.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-k-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-k-gray-200 bg-k-white px-6 py-20 text-center">
          <p className="text-sm text-k-gray-400">No verified work to display yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-5 max-w-xl mx-auto">
            {items.map((item) => (
              <ServiceCard key={item.id} item={item} />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-16 flex items-center justify-center">
            {loadingMore && (
              <Loader2 size={20} className="animate-spin text-k-gray-400" />
            )}
            {!nextCursor && !loadingMore && items.length > 0 && (
              <p className="text-xs text-k-gray-400">You've seen everything.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
