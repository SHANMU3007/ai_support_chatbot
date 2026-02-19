import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/chatbot", "/conversations", "/analytics"];

// Cookie name differs in prod (https) vs dev (http)
function getSessionCookie(req: NextRequest): string | undefined {
  return (
    req.cookies.get("__Secure-next-auth.session-token")?.value ??
    req.cookies.get("next-auth.session-token")?.value
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Silently drop browser-extension noise (e.g. Zyb tracker injected by extensions).
  // These are never real app routes — return 204 so they stop polluting the logs.
  if (pathname.startsWith("/hybridaction/")) {
    return new NextResponse(null, { status: 204 });
  }

  // ── Auth guard: protect all dashboard routes ──────────────────────────────
  // Uses cookie presence check — compatible with NextAuth database session strategy.
  // (getToken() only works with JWT strategy; database sessions use a session-token cookie.)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !getSessionCookie(req)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
