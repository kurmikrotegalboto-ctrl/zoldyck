import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, setAuthConfig } from "@/lib/server/store";
import { cookies } from "next/headers";

// Simple token-based auth
const TOKEN_EXPIRY_HOURS = 24;

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const config = getAuthConfig();

    if (password === config.password) {
      const token = generateToken();
      const cookieStore = await cookies();
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TOKEN_EXPIRY_HOURS * 60 * 60,
        path: "/",
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    return NextResponse.json({ authenticated: !!token });
  } catch (e) {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Gagal logout" }, { status: 500 });
  }
}

// Change password (must be authenticated)
export async function PUT(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();
    const config = getAuthConfig();

    if (currentPassword !== config.password) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
    }

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "Password baru minimal 4 karakter" }, { status: 400 });
    }

    setAuthConfig(newPassword);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 });
  }
}