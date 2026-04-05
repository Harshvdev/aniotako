"use client";

import { useState } from "react";

interface AsyncButtonProps {
  onClick: () => Promise<void>; // The function to run
  className?: string;           // Custom styles you pass in
  children: React.ReactNode;    // The text inside the button
  disabled?: boolean;           // Standard disabled state
}

export default function AsyncButton({ onClick, className, children, disabled }: AsyncButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (status === "loading" || disabled) return;
    
    setStatus("loading");
    setErrorMsg("");
    
    try {
      await onClick(); // Run the API call
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1500); // Show checkmark for 1.5s
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "An error occurred");
      setTimeout(() => setStatus("idle"), 4000); // Show error state for 4s
    }
  };

  return (
    <div className={`flex flex-col gap-1 items-start ${className?.includes('w-full') ? 'w-full' : ''}`}>
      <button 
        onClick={handleClick} 
        disabled={status === "loading" || disabled} 
        className={`${className} flex items-center justify-center gap-2 transition-all ${status === "error" ? "bg-red-600 hover:bg-red-500 border-red-500" : ""}`}
      >
        {status === "loading" && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        )}
        
        {status === "success" && (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        )}

        {/* Hide the text if it's successful so the checkmark is centered */}
        {status !== "success" && children}
      </button>
      
      {/* Error Message Display */}
      {status === "error" && (
        <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
          {errorMsg}
        </span>
      )}
    </div>
  );
}