import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, changePassword, createSignedToken } from "@/lib/server/store";
import { cookies } from "next/headers";

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  if (request.url.startsWith("https://")) return true;
  const host = request.headers.get("host") || "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return false;
  return false;
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

    const result = verifyLogin(username, password);

    if (result.locked) {
      return NextResponse.json(
        { error: "Akun terkunci karena terlalu banyak percobaan. Coba lagi dalam 15 menit.", locked: true },
        { status: 429 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Password salah", remainingAttempts: result.remainingAttempts },
        { status: 401 }
      );
    }

    // Success — create a cryptographically signed token
    const token = createSignedToken();
    const secure = isSecureRequest(request);
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: secure,
      sameSite: "strict", // strict = no CSRF via form submission
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}

export async function GET() {
  // Check if current session is valid
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) return NextResponse.json({ authenticated: false });

    // Dynamically import to avoid bundling crypto in edge
    const { verifySignedToken } = await import("@/lib/server/store");
    const valid = verifySignedToken(token.value);
    return NextResponse.json({ authenticated: valid });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    return NextResponse.json({ success: true });
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

    const result = changePassword(currentPassword, newPassword);
    if (result.success) {
      return NextResponse.json({ success: true, message: "Password berhasil diubah" });
    }
    return NextResponse.json({ error: result.error }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 });
  }
}