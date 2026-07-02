import { NextResponse } from "next/server";

const AUTOCOMPLETE_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        idMal
        title { romaji english native }
        coverImage { medium }
        format
        episodes
        seasonYear
        status
      }
    }
  }
`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (query.trim().length < 3) {
      return NextResponse.json({ results: [] });
    }

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: AUTOCOMPLETE_QUERY,
        variables: { search: query },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AniList returned status ${response.status}` },
        { status: response.status }
      );
    }

    const json = await response.json();
    const media = json.data?.Page?.media || [];

    const results = media.map((m: any) => ({
      mal_id: m.idMal,
      anilist_id: m.id,
      title: m.title.romaji || m.title.english || m.title.native,
      title_english: m.title.english || null,
      title_romaji: m.title.romaji || null,
      poster_url: m.coverImage?.medium || null,
      type: m.format || "Unknown",
      episodes: m.episodes || null,
      year: m.seasonYear || null,
      status: m.status || "UNKNOWN",
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[AUTOCOMPLETE API] Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
