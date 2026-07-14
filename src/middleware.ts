import { NextRequest, NextResponse } from "next/server";

// Edge-compatible token verification
// Derives HMAC secret from AUTH_PASSWORD_HASH (already set on Vercel)
function getSecret(): string | null {
  return process.env.TOKEN_SECRET || process.env.AUTH_PASSWORD_HASH || null;
}

async function verifyTokenAsync(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    if (!secret) return false; // No secret = deny all (fail-closed)

    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 0) return false;

    const payload = token.substring(0, dotIdx);
    const signature = token.substring(dotIdx + 1);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    let sigBuffer: Uint8Array;
    try {
      sigBuffer = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    } catch {
      return false;
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      encoder.encode(payload)
    );

    if (!isValid) return false;

    const expiry = parseInt(payload, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets through without auth check
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image") || pathname === "/favicon.ico") {
    const response = NextResponse.next();
    // Static assets SHOULD be cached for performance
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    setSecurityHeaders(response);
    return response;
  }

  if (pathname === "/login" || pathname === "/robots.txt" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    // Extra: never cache the login page
    if (pathname === "/login") {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    }
    return response;
  }

  if (pathname === "/api/auth" && request.method === "POST") {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  const token = request.cookies.get("auth_token");
  let valid = false;
  if (token) {
    valid = await verifyTokenAsync(token.value);
  }

  if (!valid) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));

    if (token) response.cookies.delete("auth_token");
    setSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  // Prevent all pages from being cached (sensitive KPI data)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};