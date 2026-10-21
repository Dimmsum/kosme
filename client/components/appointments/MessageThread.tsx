"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const POLL_MS = 15000;

/**
 * One conversation. New messages arrive by polling while the tab is visible,
 * so nothing here talks to Supabase directly.
 */
export default function MessageThread({
  otherId,
  otherName,
}: {
  otherId: string;
  otherName?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState(otherName ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{
        other: { full_name: string | null };
        messages: Message[];
      }>(`/api/messages/thread/${otherId}`);
      setMessages(res.messages);
      setName(res.other.full_name);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load messages."));
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await apiPost<{ message: Message }>(`/api/messages/thread/${otherId}`, { body });
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send your message."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-k-gray-200 bg-k-white">
      <div className="border-b border-k-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-k-black">{name ?? "Conversation"}</p>
        <p className="text-[11px] text-k-gray-400">
          Messages stay inside Kosmè — no need to share a phone number.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="m-auto text-xs text-k-gray-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-xs text-k-gray-400">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => {
            const theirs = m.sender_id === otherId;
            return (
              <div key={m.id} className={`flex ${theirs ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    theirs ? "bg-k-gray-100 text-k-black" : "bg-k-primary text-k-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[10px] ${theirs ? "text-k-gray-400" : "text-k-white/70"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-GB", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-k-gray-200 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          placeholder="Write a message…"
          aria-label="Message"
          className="min-w-0 flex-1 rounded-full border border-k-gray-200 bg-k-white px-4 py-2 text-sm text-k-black focus:border-k-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-primary text-k-white transition-opacity disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
