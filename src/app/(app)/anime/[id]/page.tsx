import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import AnimeDetailClient from "./AnimeDetailClient";

export const dynamic = 'force-dynamic';

export default async function AnimePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mal_id = parseInt(params.id, 10);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch Watchlist Entry
  const { data: watchlistEntry } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("mal_id", mal_id)
    .single();

    const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";

  const cookieStore = await cookies();
  const cookieString = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");

  const preferencesApiUrl = `${protocol}://${host}/api/preferences`;

  let preferences = null;
  try {
    const prefsRes = await fetch(preferencesApiUrl, {
      cache: "no-store",
      headers: {
        Cookie: cookieString,
      },
    });

    if (prefsRes.ok) {
      preferences = await prefsRes.json();
    }
  } catch (err) {
    console.error("[PAGE] Failed to load preferences:", err);
  }

  const userPrefs = preferences || {
    timezone: "UTC",
    notification_format: "sub",
    countdown_enabled: true,
  };

  const internalApiUrl = `${protocol}://${host}/api/anilist/anime/${mal_id}`;

  let anilistData = null;
  
  try {
    console.log(`[PAGE] Attempting internal fetch to: ${internalApiUrl}`);
    const res = await fetch(internalApiUrl, { 
      cache: 'no-store',
      headers: {
        'Cookie': cookieString
      }
    });
    
    if (res.ok) {
      anilistData = await res.json();
      console.log(`[PAGE] Internal fetch SUCCESS.`);
    } else {
      const errorText = await res.text();
      console.error(`[PAGE] Internal fetch FAILED with HTTP ${res.status}:`, errorText);
    }
  } catch (err) {
    console.error("[PAGE] Internal fetch crashed entirely:", err);
  }

  if (!anilistData || anilistData.error) {
    console.warn(`[PAGE] Rendering "Not Found" UI. anilistData state:`, anilistData);
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p>We couldn't fetch details for this anime. Please try again later.</p>
      </div>
    );
  }

  return (
    <AnimeDetailClient 
      anime={anilistData} 
      initialEntry={watchlistEntry || null} 
      preferences={userPrefs} 
    />
  );
}