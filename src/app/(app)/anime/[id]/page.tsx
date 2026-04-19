import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers"; // <-- ADD cookies HERE
import AnimeDetailClient from "./AnimeDetailClient";

export const dynamic = 'force-dynamic';

export default async function AnimePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mal_id = parseInt(params.id, 10);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: watchlistEntry } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("mal_id", mal_id)
    .single();

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const internalApiUrl = `${protocol}://${host}/api/anilist/anime/${mal_id}`;
  
  // Grab the user's session cookies
  const cookieStore = await cookies();
  const cookieString = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

  let anilistData = null;
  
  try {
    console.log(`[PAGE] Attempting internal fetch to: ${internalApiUrl}`);
    const res = await fetch(internalApiUrl, { 
      cache: 'no-store',
      headers: {
        'Cookie': cookieString // <-- FORWARD COOKIES HERE
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

  return <AnimeDetailClient anime={anilistData} initialEntry={watchlistEntry || null} />;
}