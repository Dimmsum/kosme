"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { apiGet } from "@/lib/api";
import MessageThread from "./MessageThread";

interface Thread {
  other_id: string;
  other_name: string | null;
  last_message: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
}

/** Conversation list with a thread opened beside/below it. */
export default function MessagesPanel({
  openWith,
  openWithName,
  onClose,
}: {
  openWith?: string | null;
  openWithName?: string | null;
  onClose?: () => void;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ id: string; name: string | null } | null>(
    openWith ? { id: openWith, name: openWithName ?? null } : null,
  );

  useEffect(() => {
    if (openWith) setActive({ id: openWith, name: openWithName ?? null });
  }, [openWith, openWithName]);

  useEffect(() => {
    apiGet<{ threads: Thread[] }>("/api/messages/threads")
      .then((res) => setThreads(res.threads))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [active?.id]);

  if (active) {
    return (
      <div className="max-w-2xl">
        <button
          type="button"
          onClick={() => {
            setActive(null);
            onClose?.();
          }}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-k-gray-600 hover:text-k-black"
        >
          <ArrowLeft size={14} /> All conversations
        </button>
        <MessageThread otherId={active.id} otherName={active.name} />
      </div>
    );
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-k-gray-400">Loading…</p>;
  }
  if (threads.length === 0) {
    return (
      <div className="max-w-2xl rounded-3xl border border-k-gray-200 bg-k-white px-6 py-16 text-center">
        <MessageSquare size={28} className="mx-auto mb-3 text-k-gray-300" />
        <p className="text-sm text-k-gray-400">No conversations yet.</p>
      </div>
    );
  }
  return (
    <ul className="flex max-w-2xl flex-col gap-2">
      {threads.map((t) => (
        <li key={t.other_id}>
          <button
            type="button"
            onClick={() => setActive({ id: t.other_id, name: t.other_name })}
            className="flex w-full items-center gap-3 rounded-2xl border border-k-gray-200 bg-k-white px-4 py-3 text-left transition-colors hover:border-k-primary/30"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-k-black">{t.other_name ?? "Unknown"}</p>
              <p className="truncate text-xs text-k-gray-400">
                {t.last_from_me ? "You: " : ""}
                {t.last_message}
              </p>
            </div>
            {t.unread > 0 && (
              <span className="shrink-0 rounded-full bg-k-primary px-2 py-0.5 text-[11px] font-medium text-k-white">
                {t.unread}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
