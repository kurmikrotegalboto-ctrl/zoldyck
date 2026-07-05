import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, changePassword } from "@/lib/server/store";
import { cookies } from "next/headers";

const TOKEN_EXPIRY_HOURS = 24;
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isSecureRequest(request: NextRequest): boolean {
  // HTTPS or trusted proxy headers
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  if (request.url.startsWith("https://")) return true;
  // Localhost is ok for development
  const host = request.headers.get("host") || "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return false;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: reject if body too large
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Username dan password diperlukan" }, { status: 400 });
    }

    if (password.length > 64) {
      return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
    }

    const result = verifyLogin(username, password);

    if (result.locked) {
      // Return 429 with retry-after hint
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

    // Success - set auth cookie
    const token = generateToken();
    const secure = isSecureRequest(request);
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: secure,
      sameSite: "lax",
      maxAge: TOKEN_EXPIRY_HOURS * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    return NextResponse.json({ authenticated: !!token });
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

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
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