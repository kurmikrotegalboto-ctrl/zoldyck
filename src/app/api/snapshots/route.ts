import { NextRequest, NextResponse } from "next/server";
import { getSnapshots, deleteSnapshot } from "@/lib/server/store";

export async function GET() {
  try {
    const snapshots = getSnapshots();
    return NextResponse.json({ snapshots });
  } catch (e) {
    console.error("Get snapshots error:", e);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateSort = searchParams.get("date");
    if (!dateSort) {
      return NextResponse.json({ error: "Parameter date diperlukan" }, { status: 400 });
    }
    const snapshots = deleteSnapshot(dateSort);
    return NextResponse.json({ success: true, snapshots });
  } catch (e) {
    console.error("Delete snapshot error:", e);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}