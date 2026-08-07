"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional footer, typically the submit/cancel buttons. */
  footer?: ReactNode;
}

// Lightweight centered dialog used for admin create/edit forms. Closes on
// backdrop click or Escape. Content scrolls if it exceeds the viewport.
export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-k-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-k-gray-200 bg-k-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-k-gray-200 px-6 py-4">
          <h2 className="font-serif text-xl font-light text-k-black">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-k-gray-400 transition-colors hover:text-k-black"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-k-gray-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
