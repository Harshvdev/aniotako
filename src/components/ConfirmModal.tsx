"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  isDestructive = false,
}: ConfirmModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-8">{description}</p>
        
        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all ${
              isDestructive 
                ? "bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                : "bg-gradient-to-r from-fuchsia-600 to-cyan-600 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}