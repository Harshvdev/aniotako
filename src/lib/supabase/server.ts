import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // This catch block is intentionally empty.
            // It prevents errors when setAll is called from a Server Component,
            // which is allowed to read cookies but not write them.
          }
        },
      },
    }
  );
}

export const getCachedUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    return null;
  }
});

export async function getServerUser() {
  try {
    const headersList = await headers();
    const authChecked = headersList.get("x-auth-checked");
    const userId = headersList.get("x-user-id");
    const email = headersList.get("x-user-email");
    console.log("[getServerUser] Headers:", { authChecked, userId, email });
    
    if (authChecked === "true") {
      if (userId) {
        return { id: userId, email: email || null } as any;
      }
      return null; // Checked by middleware, user is verified as guest!
    }
  } catch (error) {
    // Silently ignore errors from headers() outside request contexts (e.g. static build compile)
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Failed to fetch user in getServerUser fallback:", error);
    return null;
  }
}

export async function getAuthUser(req?: Request) {
  if (req) {
    const authChecked = req.headers.get("x-auth-checked");
    if (authChecked === "true") {
      const userId = req.headers.get("x-user-id");
      const email = req.headers.get("x-user-email");
      if (userId) {
        return { id: userId, email: email || null };
      }
      return null; // Checked by middleware, user is verified as guest!
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    return null;
  }
}