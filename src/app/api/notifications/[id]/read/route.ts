import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.notifications.updateMany({
      where: {
        id: params.id,
        user_id: user.id,
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