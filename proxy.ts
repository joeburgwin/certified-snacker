import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/invite/",
  "/reset/",
  "/api/auth",
  "/api/health",
  "/manifest.webmanifest",
  "/sw.js",
];

/**
 * Cookie-only session gate (no database access here, per Next.js guidance).
 * The real session check and the onboarding redirect live in the (app) layout.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const hasSession =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|.*\\.(?:png|svg|ico|webp|woff2)$).*)",
  ],
};
