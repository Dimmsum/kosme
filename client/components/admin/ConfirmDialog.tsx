"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmation dialog for destructive/irreversible admin actions (delete, suspend).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-k-gray-200 bg-k-white px-5 py-2 text-sm font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-5 py-2 text-sm font-medium text-k-white transition-colors disabled:opacity-50 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-k-primary hover:bg-k-primary-light"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm font-light leading-relaxed text-k-gray-600">{message}</p>
    </Modal>
  );
}
