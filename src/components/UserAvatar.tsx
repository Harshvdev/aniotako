"use client";

interface UserAvatarProps {
  initial: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function UserAvatar({ initial, size = "sm", className = "" }: UserAvatarProps) {
  const displayInitial = (initial || "?").charAt(0).toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xl border border-zinc-800/90 shadow-md",
    md: "w-12 h-12 text-3xl border border-zinc-800/90 shadow-lg",
    lg: "w-20 h-20 text-5xl border border-zinc-800 shadow-xl",
    xl: "w-32 h-32 md:w-40 md:h-40 text-8xl md:text-9xl border-2 border-zinc-800 shadow-2xl",
  }[size];

  return (
    <div
      className={`rounded-full bg-[#09090b] text-[#dc2626] flex items-center justify-center shrink-0 select-none overflow-hidden ${sizeClasses} ${className}`}
    >
      <span
        className="font-gang-of-three font-normal leading-none transform translate-y-[-1px] scale-110"
        style={{ fontFamily: "'Gang of Three', sans-serif" }}
      >
        {displayInitial}
      </span>
    </div>
  );
}
