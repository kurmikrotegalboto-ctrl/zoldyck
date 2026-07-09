import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, changePassword, createSignedToken, verifySignedToken } from "@/lib/server/store";

// Prevent Vercel cold-start timeout (default 10s is too short for bcrypt + Supabase)
export const maxDuration = 30;

function isSecureRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  // Local dev = not secure
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return false;
  // All non-local requests (Vercel = always HTTPS) should use secure cookie
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Username dan password diperlukan" }, { status: 400 });
    }

    if (password.length > 64 || username.length > 64) {
      return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
    }

    const result = await verifyLogin(username, password);

    if (result.locked) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti.", locked: true },
        { status: 429 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Success — create a cryptographically signed token
    const token = createSignedToken();
    const secure = isSecureRequest(request);
    const response = NextResponse.json({ success: true });
    
    // Set cookie directly on response for reliability (avoids cookies() API edge cases)
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: secure,
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token");
    if (!token) return NextResponse.json({ authenticated: false });
    const valid = verifySignedToken(token.value);
    return NextResponse.json({ authenticated: valid });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("auth_token");
    return response;
  } catch {
    return NextResponse.json({ error: "Gagal logout" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Password lama dan baru diperlukan" }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 64) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter, maksimal 64" }, { status: 400 });
    }

    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      return NextResponse.json({ success: true, message: "Password berhasil diubah" });
    }
    return NextResponse.json({ error: result.error }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 });
  }
}