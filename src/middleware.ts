import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't need auth
  if (pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // API routes that don't need auth (login itself)
  if (pathname === "/api/auth" && request.method === "POST") {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // Check for auth cookie
  const token = request.cookies.get("auth_token");
  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api/")) {
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      setSecurityHeaders(response);
      return response;
    }
    // Return 401 for API requests
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    setSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy - disable unnecessary browser features
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Cache control for API
  if (response.headers.get("content-type")?.includes("json")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};