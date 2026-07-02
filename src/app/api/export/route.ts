import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

function escapeCSV(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getMalStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "watching": return "Watching";
    case "completed": return "Completed";
    case "on-hold": return "On-Hold";
    case "dropped": return "Dropped";
    case "plan-to-watch":
    case "plantowatch":
      return "Plan to Watch";
    default: return "Watching";
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const { data: entries, error } = await supabase
      .from("watchlist_entries")
      .select("mal_id, title, status, score, watched_episodes, total_episodes, created_at")
      .eq("user_id", user.id)
      .order("title", { ascending: true });

    if (error) throw error;

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === "csv") {
      const csvHeaders = ["Mal ID", "Title", "Status", "Score", "Watched Episodes", "Total Episodes", "Created At"];
      const csvRows = entries.map((e) => [
        e.mal_id,
        e.title,
        e.status,
        e.score || 0,
        e.watched_episodes || 0,
        e.total_episodes || 0,
        e.created_at
      ].map(escapeCSV).join(","));
      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="aniotako-export-${dateStr}.csv"`,
        },
      });
    }

    if (format === "xml") {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <myinfo>
    <user_export_type>1</user_export_type>
  </myinfo>
  ${entries.map(e => `
  <anime>
    <series_animedb_id>${e.mal_id}</series_animedb_id>
    <series_title><![CDATA[${e.title}]]></series_title>
    <series_episodes>${e.total_episodes || 0}</series_episodes>
    <my_watched_episodes>${e.watched_episodes || 0}</my_watched_episodes>
    <my_score>${e.score || 0}</my_score>
    <my_status>${getMalStatus(e.status)}</my_status>
    <added_at>${e.created_at}</added_at>
    <update_on_import>1</update_on_import>
  </anime>`).join("").trim()}
</myanimelist>`;

      return new NextResponse(xmlContent, {
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `attachment; filename="aniotako-export-${dateStr}.xml"`,
        },
      });
    }

    // Default: JSON
    const json = JSON.stringify({ exported_at: new Date().toISOString(), total: entries.length, entries }, null, 2);
    
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aniotako-export-${dateStr}.json"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new NextResponse(message, { status: 500 });
  }
}