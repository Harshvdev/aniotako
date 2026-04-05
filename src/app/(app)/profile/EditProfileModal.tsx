"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProfileModal({ currentName }: { currentName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
      setIsOpen(false);
      router.refresh(); // Tell Next.js to re-render the server page with new data
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 mt-4 md:mt-0 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-bold text-white hover:bg-zinc-700 hover:text-cyan-400 transition-colors shadow-lg"
      >
        Edit Profile
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[90%] max-w-[420px] max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 custom-scrollbar">
            <h3 className="text-lg font-bold text-white mb-4">Edit Profile</h3>
            
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white text-sm font-bold shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50 hover:opacity-90 transition-all"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}