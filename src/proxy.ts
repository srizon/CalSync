import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/_next") || path.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const tokenEarly = request.cookies.get(SESSION_COOKIE)?.value;
  let sessionEmailEarly: string | null = null;
  try {
    sessionEmailEarly = tokenEarly
      ? await verifySessionToken(tokenEarly)
      : null;
  } catch {
    sessionEmailEarly = null;
  }

  if (path === "/login" && sessionEmailEarly) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (path === "/login") {
    return NextResponse.next();
  }
  if (path.startsWith("/api/webhooks/") || path.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const email = sessionEmailEarly;

  if (!email) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    if (path !== "/") login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/api/me",
    "/api/config",
    "/api/sync",
    "/api/logout",
    "/api/calendars",
  ],
};
