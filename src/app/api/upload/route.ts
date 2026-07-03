import { NextRequest, NextResponse } from "next/server";
import { parseKpiFileBuffer } from "@/lib/server/kpi-parser-server";
import { addOrUpdateSnapshot, getSnapshots } from "@/lib/server/store";
import type { SnapshotData } from "@/lib/kpi-types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang diupload" }, { status: 400 });
    }

    const xlsxFiles = files.filter((f) => f.name.endsWith(".xlsx"));
    if (xlsxFiles.length === 0) {
      return NextResponse.json({ error: "Hanya file .xlsx yang didukung" }, { status: 400 });
    }

    const results: { filename: string; success: boolean; error?: string }[] = [];
    const dateGroups: Record<string, { date: string; dateSort: string; units: import("@/lib/kpi-types").KpiUnit[] }> = {};

    for (const file of xlsxFiles) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = parseKpiFileBuffer(buffer, file.name);
        
        if (!parsed) {
          results.push({ filename: file.name, success: false, error: "Format nama file tidak dikenali" });
          continue;
        }

        const key = parsed.dateSort;
        if (!dateGroups[key]) {
          dateGroups[key] = { date: parsed.date, dateSort: parsed.dateSort, units: [] };
        }
        dateGroups[key].units.push(parsed.unit);
        results.push({ filename: file.name, success: true });
      } catch (e) {
        results.push({ filename: file.name, success: false, error: String(e) });
      }
    }

    // Save to store
    for (const group of Object.values(dateGroups)) {
      const snapshot: SnapshotData = {
        date: group.date,
        dateSort: group.dateSort,
        units: group.units,
      };
      addOrUpdateSnapshot(snapshot);
    }

    const allSnapshots = getSnapshots();
    return NextResponse.json({ 
      success: true, 
      results, 
      snapshots: allSnapshots,
      newTotal: allSnapshots.length 
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Gagal memproses upload" }, { status: 500 });
  }
}