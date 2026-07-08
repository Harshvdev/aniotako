import { createClient } from "@/lib/supabase/server";
import { getAnimeDetails } from "@/lib/anime";
import AnimeDetailClient from "./AnimeDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const params = await props.params;
  const malId = parseInt(params.id, 10);

  try {
    const anime = await getAnimeDetails(malId);
    if (!anime || anime.error) {
      return {
        title: "Anime Not Found",
        description: "Anime details could not be found or fetched on Aniotako.",
      };
    }

    const titleRomaji = anime.title?.romaji || "";
    const titleEnglish = anime.title?.english || "";
    const displayTitle = titleEnglish && titleEnglish !== titleRomaji 
      ? `${titleRomaji} (${titleEnglish})` 
      : titleRomaji || titleEnglish || "Anime Details";

    const rating = anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : "N/A";
    const popularity = anime.popularity ? anime.popularity.toLocaleString() : "N/A";
    const episodes = anime.episodes || "unknown";
    const studio = anime.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name || "unknown";

    const cleanSynopsis = anime.description 
      ? anime.description.replace(/<[^>]*>?/gm, "").trim().substring(0, 150) + "..."
      : "No synopsis available.";

    const description = `Rated ${rating} on AniList by ${popularity} members, ${displayTitle} is a ${anime.format || "TV"} anime series produced by ${studio} containing ${episodes} episodes. Synopsis: ${cleanSynopsis}`;

    const poster = anime.coverImage?.extraLarge || anime.coverImage?.large || "";

    return {
      title: `${displayTitle} | Airing Schedule & Countdown`,
      description,
      alternates: {
        canonical: `/anime/${malId}`,
      },
      openGraph: {
        title: `${displayTitle} | Airing Schedule & Countdown`,
        description,
        type: "video.tv_show",
        url: `https://aniotako.com/anime/${malId}`,
        images: poster ? [{ url: poster }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${displayTitle} | Airing Schedule & Countdown`,
        description,
        images: poster ? [poster] : [],
      },
    };
  } catch (err) {
    console.error("[generateMetadata] Error generating metadata:", err);
    return {
      title: "Anime Details",
      description: "Track anime airing countdowns and get release notifications on Aniotako.",
    };
  }
}

export default async function AnimePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mal_id = parseInt(params.id, 10);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  let watchlistEntry = null;
  let userPrefs = {
    timezone: "",
    notification_format: "sub",
    countdown_enabled: true,
  };

  if (isLoggedIn && user) {
    // 1. Fetch Watchlist Entry
    const { data: entry } = await supabase
      .from("watchlist_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("mal_id", mal_id)
      .single();
    watchlistEntry = entry;

    // 2. Direct Database Query for Preferences
    const { data: prefsRow } = await supabase
      .from("user_preferences")
      .select("timezone, notification_format, countdown_enabled")
      .eq("user_id", user.id)
      .single();

    if (prefsRow) {
      userPrefs = {
        timezone: prefsRow.timezone || "",
        notification_format: prefsRow.notification_format || "sub",
        countdown_enabled: prefsRow.countdown_enabled !== false,
      };
    }
  }

  // 3. Fetch details directly using the server-side helper
  let anilistData = null;
  let errorType: string | null = null;

  try {
    const res = await getAnimeDetails(mal_id);
    if (res && res.error) {
      errorType = res.error;
    } else {
      anilistData = res;
    }
  } catch (err) {
    console.error("[PAGE] Failed to fetch anime details:", err);
    errorType = "network_error";
  }

  // If there's no data and it's not a rate-limit/network error, it's a true 404
  if (!anilistData && !errorType) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p>We couldn't find details for this anime. It might not exist on AniList.</p>
      </div>
    );
  }

  // 4. Build Final Combined Payload
  let mergedAnime = null;
  let schemas: any[] = [];

  if (anilistData) {
    const { data: meta } = await supabase
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", mal_id)
      .single();

    const nextEpisodeNumber =
      meta?.raw_next_episode_number ??
      meta?.next_episode_number ??
      meta?.next_episode_num ??
      anilistData?.nextAiringEpisode?.episode ??
      null;

    mergedAnime = {
      ...anilistData,
      anime_metadata: meta ? {
        raw_air_at: meta.raw_air_at,
        sub_air_at: meta.sub_air_at,
        dub_air_at: meta.dub_air_at,
        raw_next_episode_number: meta.raw_next_episode_number ?? null,
        sub_next_episode_number: meta.sub_next_episode_number ?? null,
        dub_next_episode_number: meta.dub_next_episode_number ?? null,
        next_airing_at: meta.next_airing_at,
        next_episode_number: nextEpisodeNumber,
        schedule_updated_at: meta.schedule_updated_at,
      } : null,
    };

    // 5. Generate JSON-LD schemas
    const titleRomaji = anilistData.title?.romaji || "";
    const titleEnglish = anilistData.title?.english || "";
    const displayTitle = titleEnglish && titleEnglish !== titleRomaji 
      ? titleRomaji 
      : titleRomaji || titleEnglish || "Anime";
    const synopsis = anilistData.description ? anilistData.description.replace(/<[^>]*>?/gm, "").trim() : "";
    const image = anilistData.coverImage?.extraLarge || anilistData.coverImage?.large || "";

    const ratingValue = anilistData.averageScore ? (anilistData.averageScore / 10).toFixed(1) : null;
    const ratingCount = anilistData.popularity || null;
    const isMovie = anilistData.format === "MOVIE";

    const mainSchema: any = {
      "@context": "https://schema.org",
      "@type": isMovie ? "Movie" : "TVSeries",
      "name": displayTitle,
      "description": synopsis,
      "image": image,
      "genre": anilistData.genres || [],
    };

    if (titleEnglish) {
      mainSchema.alternativeHeadline = titleEnglish;
    }

    if (ratingValue && ratingCount) {
      mainSchema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": ratingValue,
        "bestRating": "10",
        "worstRating": "1",
        "ratingCount": ratingCount,
      };
    }

    const studio = anilistData.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name 
      || anilistData.studios?.nodes?.[0]?.name;
    if (studio) {
      mainSchema.productionCompany = {
        "@type": "Organization",
        "name": studio,
      };
    }

    schemas.push(mainSchema);

    // Breadcrumbs
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://aniotako.com",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Anime",
          "item": "https://aniotako.com/search",
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": displayTitle,
          "item": `https://aniotako.com/anime/${mal_id}`,
        },
      ],
    });

    // FAQ Page (Answer-first structured answers)
    const faqEntities: any[] = [];
    
    // Q1: Airing
    const nextEp = mergedAnime.anime_metadata?.next_episode_number;
    const nextAirAt = mergedAnime.anime_metadata?.next_airing_at;
    let airingAnswer = "";
    if (anilistData.status === "RELEASING" && nextEp && nextAirAt) {
      const airDateStr = new Date(Number(nextAirAt) * 1000).toUTCString();
      airingAnswer = `Episode ${nextEp} of ${displayTitle} is scheduled to air on ${airDateStr} (UTC). You can check the live local countdown and configure browser push notifications on Aniotako.`;
    } else {
      airingAnswer = `${displayTitle} is currently not airing weekly episodes. Its broadcast status is ${anilistData.status || "Finished"}. You can track your progress and manage your watchlist on Aniotako.`;
    }

    faqEntities.push({
      "@type": "Question",
      "name": `When does the next episode of ${displayTitle} air?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": airingAnswer,
      },
    });

    // Q2: Rating
    if (ratingValue) {
      faqEntities.push({
        "@type": "Question",
        "name": `What is the user rating for ${displayTitle}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `According to AniList reviews, ${displayTitle} is rated ${ratingValue}/10 by the community based on ${ratingCount?.toLocaleString() || "many"} members.`,
        },
      });
    }

    // Q3: Synopsis
    if (synopsis) {
      faqEntities.push({
        "@type": "Question",
        "name": `What is the story of ${displayTitle}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Here is the synopsis of ${displayTitle}: ${synopsis.substring(0, 300)}...`,
        },
      });
    }

    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqEntities,
    });
  }

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <AnimeDetailClient 
        anime={mergedAnime} 
        error={errorType}
        initialEntry={watchlistEntry || null} 
        preferences={userPrefs} 
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}