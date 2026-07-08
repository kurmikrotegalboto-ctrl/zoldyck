import { NextRequest, NextResponse } from "next/server";
import { getSnapshots, addOrUpdateSnapshot, deleteSnapshot } from "@/lib/server/store";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

function isValidUnit(u: unknown): u is KpiUnit {
  if (!u || typeof u !== "object") return false;
  const o = u as Record<string, unknown>;
  return (
    typeof o.code === "string" && o.code.length > 0 &&
    typeof o.name === "string" &&
    typeof o.total_kpi === "number" &&
    Array.isArray(o.components) &&
    o.components.length <= 50
  );
}

export async function GET() {
  try {
    const snapshots = getSnapshots();
    return NextResponse.json({ snapshots });
  } catch (e) {
    console.error("Get snapshots error:", e);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Body size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Payload terlalu besar (maks 5MB)" }, { status: 413 });
    }

    const body = await request.json();
    const snapshot: SnapshotData = body.snapshot;

    // Validate snapshot structure
    if (!snapshot || typeof snapshot !== "object") {
      return NextResponse.json({ error: "Data snapshot tidak valid" }, { status: 400 });
    }

    if (!snapshot.date || typeof snapshot.date !== "string") {
      return NextResponse.json({ error: "Field 'date' tidak valid" }, { status: 400 });
    }

    if (!snapshot.dateSort || typeof snapshot.dateSort !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.dateSort)) {
      return NextResponse.json({ error: "Field 'dateSort' tidak valid (format: YYYY-MM-DD)" }, { status: 400 });
    }

    if (!Array.isArray(snapshot.units) || snapshot.units.length === 0 || snapshot.units.length > 50) {
      return NextResponse.json({ error: "Field 'units' harus berupa array 1-50 unit" }, { status: 400 });
    }

    // Validate each unit
    for (const unit of snapshot.units) {
      if (!isValidUnit(unit)) {
        return NextResponse.json(
          { error: `Unit '${(unit as Record<string, unknown>)?.code ?? "unknown"}' tidak valid` },
          { status: 400 }
        );
      }
    }

    const snapshots = addOrUpdateSnapshot(snapshot);
    return NextResponse.json({ success: true, snapshots });
  } catch (e) {
    console.error("Save snapshot error:", e);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateSort = searchParams.get("date");

    if (!dateSort || typeof dateSort !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateSort)) {
      return NextResponse.json({ error: "Parameter 'date' tidak valid (format: YYYY-MM-DD)" }, { status: 400 });
    }

    const snapshots = deleteSnapshot(dateSort);
    return NextResponse.json({ success: true, snapshots });
  } catch (e) {
    console.error("Delete snapshot error:", e);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}