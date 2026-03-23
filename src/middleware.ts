import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 1. Create an initial response object that we can mutate
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Initialize the Supabase client specifically for middleware
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

  // 3. Fetch the user to trigger a session refresh if needed
  // Always use getUser() instead of getSession() for secure server-side checks
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const path = url.pathname;

  // 4. Define our routing rules
  const protectedPaths = ["/watchlist", "/import", "/settings", "/profile"];
  const isProtectedPath = protectedPaths.some((p) => path.startsWith(p));
  
  const isApiRoute = path.startsWith("/api/");
  const isCronRoute = path === "/api/notify";

  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.includes(path);

  // 5. Execute Routing Logic
  if (!user) {
    // If NOT logged in, and trying to access a protected page or API (except cron)
    if (isProtectedPath || (isApiRoute && !isCronRoute)) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
      // Optional: Save the attempted URL to redirect them back after logging in
      redirectUrl.searchParams.set("next", path); 
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // If LOGGED IN, and trying to access login/signup pages
    if (isAuthPath) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/watchlist";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow the request to proceed with the potentially updated session cookies
  return supabaseResponse;
}

// 6. Matcher Config: Ignore static files, images, and favicon to save processing time
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};