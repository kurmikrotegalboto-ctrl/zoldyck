import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't need auth
  if (pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // API routes that don't need auth (login itself)
  if (pathname === "/api/auth" && request.method === "POST") {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get("auth_token");
  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api/")) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    // Return 401 for API requests
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};