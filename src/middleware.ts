import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_PREFIXES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/get-started",
  "/legal",
  "/about",
  "/contact",
  "/status",
  "/help",
  "/og-image",
  "/api/health",
  "/api/web",
  "/api/assistant/chat",
  "/api/cron",
  "/api/automations/run",
  "/api/invoices/daily",
  "/api/l",
  "/api/pdf",
  "/connect-your-website",
  "/widget",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicPrefix =
    pathname === "/" ||
    PUBLIC_PREFIXES.slice(1).some((p) => pathname === p || pathname.startsWith(p + "/"));

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Public pages: allow through, but redirect authenticated users away from login/signup
  if (isPublicPath || isPublicPrefix) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Protected routes: require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt)$).*)",
  ],
};
