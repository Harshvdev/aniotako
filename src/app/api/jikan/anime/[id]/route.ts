import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params; // Next.js 15+ requires awaiting params
    
    const res = await fetch(`https://api.jikan.moe/v4/anime/${params.id}`);
    
    if (!res.ok) {
      throw new Error(`Jikan API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data.data || {});
  } catch (error: any) {
    console.error("Jikan Anime Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}