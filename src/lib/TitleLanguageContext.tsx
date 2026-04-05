"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type TitleLanguage = "english" | "romaji";

interface TitleContextType {
  titleLanguage: TitleLanguage;
  setTitleLanguage: (lang: TitleLanguage) => void;
  // A smart helper that takes any object with title fields and returns the preferred one
  getTitle: (entry: { title?: string, title_english?: string | null, title_romaji?: string | null }) => string;
}

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export function TitleLanguageProvider({ children }: { children: ReactNode }) {
  const [titleLanguage, setTitleLanguage] = useState<TitleLanguage>("romaji");
  const supabase = createClient();

  useEffect(() => {
    const fetchPref = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_preferences").select("title_language").eq("user_id", user.id).single();
      if (data?.title_language) setTitleLanguage(data.title_language as TitleLanguage);
    };
    fetchPref();
  }, [supabase]);

  const getTitle = (entry: { title?: string, title_english?: string | null, title_romaji?: string | null }) => {
    if (!entry) return "Unknown Title";
    
    if (titleLanguage === "english") {
      return entry.title_english || entry.title_romaji || entry.title || "Unknown Title";
    } else {
      return entry.title_romaji || entry.title_english || entry.title || "Unknown Title";
    }
  };

  return (
    <TitleContext.Provider value={{ titleLanguage, setTitleLanguage, getTitle }}>
      {children}
    </TitleContext.Provider>
  );
}

export function useTitleLanguage() {
  const context = useContext(TitleContext);
  if (context === undefined) throw new Error("useTitleLanguage must be used within a TitleLanguageProvider");
  return context;
}