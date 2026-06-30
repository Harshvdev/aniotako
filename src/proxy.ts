import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_TIMEOUT_MS = 3000;

async function getUserWithTimeout(supabase: any, timeoutMs = AUTH_TIMEOUT_MS) {
  return Promise.race<Promise<unknown> | Promise<null>>([
    supabase
      .auth
      .getUser()
      .then(({ data }: any) => data?.user || null)
      .catch((error: unknown) => {
        console.error("Middleware DB Connection Failed. Failsafe activated.", error);
        return null;
      }),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // Skip auth work for public/internal data routes that should not depend on Supabase session lookups.
  // This prevents internal fetches like /api/anilist/... from stalling when Supabase is slow.
  const isBypassRoute =
    path.startsWith("/api/anilist/") ||
    path.startsWith("/api/jikan/") ||
    path === "/api/notify" ||
    path.startsWith("/api/cron/");

  if (isBypassRoute) {
    return NextResponse.next({ request });
  }

  // 1. Create an initial response object that we can mutate
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Initialize the Supabase client specifically for the proxy
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update the request cookies so downstream server components get the fresh session
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Update the response object so the browser saves the fresh session
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Fetch the user, but fail fast instead of waiting on a long Supabase timeout
  const user = await getUserWithTimeout(supabase);

  // 4. Define our routing rules
  const protectedPaths = ["/settings", "/profile"];
  const isProtectedPath = protectedPaths.some((p) => path.startsWith(p));

  const isApiRoute = path.startsWith("/api/");
  const isCronRoute = path === "/api/notify" || path.startsWith("/api/cron/");

  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.includes(path);

  // 5. Execute Routing Logic
  if (path === "/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/watchlist";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) {
    // Do NOT redirect API requests. Return a 401 JSON error instead.
    if (isApiRoute && !isCronRoute) {
      return NextResponse.json(
        { error: "Unauthorized or session expired" },
        { status: 401 }
      );
    }

    // Normal behavior for page routes: Redirect to login
    if (isProtectedPath) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", path);
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // If logged in, and trying to access login/signup pages
    if (isAuthPath) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/watchlist";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow the request to proceed with the potentially updated session cookies
  return supabaseResponse;
}

// 6. Matcher Config: Ignore static files, images, and favicon
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};