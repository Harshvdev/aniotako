"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "./NotificationBell";
import UserDropdown from "./UserDropdown";

interface NavbarAuthProps {
  initialUser: {
    id: string;
    email: string | null;
  } | null;
  initialDisplayName: string;
  initialAvatarInitial: string;
  initialEmail: string;
}

export default function NavbarAuth({
  initialUser,
  initialDisplayName,
  initialAvatarInitial,
  initialEmail,
}: NavbarAuthProps) {
  const [user, setUser] = useState<any>(initialUser);
  const [profile, setProfile] = useState({
    displayName: initialDisplayName,
    avatarInitial: initialAvatarInitial,
    email: initialEmail,
  });

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Fetch display name from profile if available
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .single();

        const emailPrefix = session.user.email ? session.user.email.split("@")[0] : "User";
        const dName = profileData?.display_name || emailPrefix;
        setProfile({
          displayName: dName,
          avatarInitial: dName.charAt(0).toUpperCase(),
          email: session.user.email || "",
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationBell />
        <UserDropdown
          email={profile.email}
          displayName={profile.displayName}
          avatarInitial={profile.avatarInitial}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
        Sign In
      </Link>
      <Link href="/signup" className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white rounded-lg hover:opacity-90 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(217,70,239,0.3)]">
        Sign Up
      </Link>
    </div>
  );
}
