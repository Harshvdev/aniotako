import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const IS_DEV = process.env.NODE_ENV === "development";
const AUTH_TIMEOUT_MS = IS_DEV ? 30000 : 6000;

async function getUserWithTimeout(supabase: any, timeoutId: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    clearTimeout(timeoutId);
    return user;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError" || (error.message && error.message.includes("abort"))) {
      console.warn("Middleware auth query timed out.");
    } else {
      console.error("Middleware Auth Verification Failed:", error);
    }
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // Skip auth work for public/internal data routes that should not depend on Supabase session lookups.
  // This prevents internal fetches like /api/anilist/... from stalling when Supabase is slow.
  const isBypassRoute =
    path === "/api/notify" ||
    path.startsWith("/api/cron/");

  if (isBypassRoute) {
    return NextResponse.next({ request });
  }

  // 1. Create an AbortController for timing out remote Auth requests
  const authController = new AbortController();
  const timeoutId = setTimeout(() => authController.abort(), AUTH_TIMEOUT_MS);

  // 2. Create an initial response object that we can mutate
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 3. Initialize the Supabase client specifically for the proxy with custom fetch abort
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, signal: authController.signal }),
      },
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

  // 4. Fetch the user, but fail fast instead of waiting on a long Supabase timeout
  const user = await getUserWithTimeout(supabase, timeoutId);

  // 4. Define our routing rules
  const protectedPaths = ["/settings", "/profile"];
  const isProtectedPath = protectedPaths.some((p) => path.startsWith(p));

  const isApiRoute = path.startsWith("/api/");
  const isCronRoute = path === "/api/notify" || path.startsWith("/api/cron/");

  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.includes(path);

  // 5. Execute Routing Logic
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

  // Forward user headers to downstream pages/routes.
  // SECURITY: Explicitly delete any inbound spoofed values BEFORE setting them
  // from the verified Supabase session. Without this, a client could inject
  // x-user-id / x-auth-checked headers and bypass auth checks in API routes.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-auth-checked");
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");
  requestHeaders.set("x-auth-checked", "true");
  if (user) {
    requestHeaders.set("x-user-id", (user as any).id);
    requestHeaders.set("x-user-email", (user as any).email || "");
  } else {
    requestHeaders.delete("x-user-id");
    requestHeaders.delete("x-user-email");
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Copy set-cookie headers from supabaseResponse to finalResponse to preserve session refreshes
  supabaseResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      finalResponse.headers.append(key, value);
    }
  });

  return finalResponse;
}

// 6. Matcher Config: Ignore static files, images, and favicon
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};