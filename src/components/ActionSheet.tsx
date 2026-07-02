"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface ActionSheetAction {
  label: string;
  value: string;
  isDestructive?: boolean;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ActionSheetAction[];
  onSelect: (value: string) => void;
}

export default function ActionSheet({
  isOpen,
  onClose,
  title,
  actions,
  onSelect,
}: ActionSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="sm:hidden">
      <div
        className="fixed inset-0 bg-black/60 z-[150] backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 w-full max-h-[85vh] overflow-y-auto bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-[0_-20px_40px_rgba(0,0,0,0.6)] z-[151] py-4 animate-in slide-in-from-bottom-full duration-300 pb-8 custom-scrollbar">
        <div className="w-12.5 h-1.5 bg-zinc-800 rounded-full mx-auto mb-4" onClick={onClose} />

        <div className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900/60 pb-3">
          {title}
        </div>

        <div className="flex flex-col mt-2">
          {actions.map((act) => (
            <button
              key={act.value}
              onClick={() => {
                onSelect(act.value);
                onClose();
              }}
              className={`w-full text-left px-6 py-4 text-sm font-semibold hover:bg-zinc-900 transition-colors border-b border-zinc-900/40 last:border-0 ${
                act.isDestructive ? "text-red-400 hover:text-red-300" : "text-zinc-200 hover:text-white"
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
