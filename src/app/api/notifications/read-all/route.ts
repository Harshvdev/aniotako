import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.notifications.updateMany({
      where: {
        user_id: user.id,
        is_read: false,
        is_cleared: false,
      },
      data: {
        is_read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}