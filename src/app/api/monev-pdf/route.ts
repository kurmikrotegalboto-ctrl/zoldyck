import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export const maxDuration = 30;

import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS } from "@/lib/kpi-types";

// ── Types ──

type RGB = [number, number, number];

interface MonevRowData {
  outletCode: string;
  outletName: string;
  targetTahunan: number;
  realisasiA: number;
  realisasiB: number;
  selisih: number;
  ach: number;
  selisihRkap: number;
  pencapaianHarian: number;
  targetHarian: number;
}

// ── Helpers ──

function formatNum(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function getGroupForSub(subName: string): { no: number; name: string } | null {
  for (const g of KOMPONEN_GROUPS) {
    if (g.subKomponen.includes(subName)) return { no: g.no, name: g.name };
  }
  return null;
}

function getSubInfo(snapshots: SnapshotData[], subName: string): { bobot: number; satuan: string } {
  for (const snap of snapshots) {
    for (const unit of snap.units) {
      const comp = unit.components.find(c => c.kpi_name === subName);
      if (comp && comp.bobot > 0) return { bobot: comp.bobot, satuan: comp.satuan };
    }
  }
  return { bobot: 0, satuan: "" };
}

function calcPeriodWorkDays(dateAStr: string, dateBStr: string): number {
  const start = new Date(dateAStr);
  const end = new Date(dateBStr);
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0) count++; // Senin-Sabtu, kecuali Minggu
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function calcRemainingWorkDays(dateBStr: string): number {
  const start = new Date(dateBStr);
  const endOfYear = new Date(2026, 10, 30); // 30 November 2026 (fixed)
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= endOfYear) {
    const day = d.getDay();
    if (day !== 0) count++; // Senin-Sabtu, kecuali Minggu
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function buildRowsForSub(
  subName: string,
  snapA: SnapshotData,
  snapB: SnapshotData,
  periodWorkDays: number,
  remainingWorkDays: number
): MonevRowData[] {
  const result: MonevRowData[] = [];
  const unitMapA = new Map<string, KpiUnit>();
  const unitMapB = new Map<string, KpiUnit>();
  snapA.units.forEach(u => unitMapA.set(u.code, u));
  snapB.units.forEach(u => unitMapB.set(u.code, u));

  const allCodes = new Set([...unitMapA.keys(), ...unitMapB.keys()]);
  allCodes.forEach(code => {
    const uA = unitMapA.get(code);
    const uB = unitMapB.get(code);
    const name = uB?.name || uA?.name || "";
    // Exclude CP tegalboto from MONEV (UPC tegalboto tetap ditampilkan)
    if (/^cp\s+tegalboto/i.test(name)) return;
    const compA = uA?.components.find(c => c.kpi_name === subName);
    const compB = uB?.components.find(c => c.kpi_name === subName);
    if (!compA && !compB) return;

    const target = compB?.target || compA?.target || 0;
    const realA = compA?.realisasi || 0;
    const realB = compB?.realisasi || 0;
    const selisih = realB - realA;
    const ach = target > 0 ? realB / target : 0;
    const selisihRkap = target - realB;
    const gap = selisihRkap;
    const pencapaianHarian = selisih / periodWorkDays;
    const targetHarian = gap > 0 ? gap / remainingWorkDays : 0;

    result.push({
      outletCode: code,
      outletName: uB?.name || uA?.name || code,
      targetTahunan: target,
      realisasiA: realA,
      realisasiB: realB,
      selisih,
      ach,
      selisihRkap,
      pencapaianHarian,
      targetHarian,
    });
  });
  return result;
}

function sortRowsForPdf(rows: MonevRowData[], sort: { key: string; dir: string } | undefined, defaultSort: { key: string; dir: string }): MonevRowData[] {
  const s = sort || defaultSort;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (s.key) {
      case "outlet": cmp = a.outletName.localeCompare(b.outletName); break;
      case "target": cmp = a.targetTahunan - b.targetTahunan; break;
      case "realB": cmp = a.realisasiB - b.realisasiB; break;
      case "selisih": cmp = a.selisih - b.selisih; break;
      case "ach": cmp = a.ach - b.ach; break;
    }
    return s.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ── Main Handler ──

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload terlalu besar" }, { status: 413 });
    }

    const body = await req.json();
    const { snapshots, selectedSubs, dateIndexA, dateIndexB, sortStates } = body as {
      snapshots: SnapshotData[];
      selectedSubs: string[];
      dateIndexA: number;
      dateIndexB: number;
      sortStates?: Record<string, { key: string; dir: string }>;
    };

    if (!snapshots || !selectedSubs || selectedSubs.length === 0) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const snapA = snapshots[dateIndexA];
    const snapB = snapshots[dateIndexB];
    if (!snapA || !snapB) {
      return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
    }

    const remainingWorkDays = calcRemainingWorkDays(snapB.dateSort);
    const periodWorkDays = calcPeriodWorkDays(snapA.dateSort, snapB.dateSort);

    // ── PDF Setup ──
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = 297;
    const ph = 210;
    const m = 8;

    // ── Colors ──
    const GREEN: RGB = [0, 134, 61];
    const GREEN_DARK: RGB = [4, 100, 50];
    const WHITE: RGB = [255, 255, 255];
    const LGRAY: RGB = [248, 248, 248];
    const BLACK: RGB = [30, 30, 30];
    const GRAY: RGB = [130, 130, 130];
    const GREEN_L: RGB = [5, 150, 105];
    const AMBER: RGB = [180, 100, 6];
    const ORANGE: RGB = [200, 80, 12];
    const RED: RGB = [200, 40, 40];
    const GREEN_BG: RGB = [235, 250, 242];
    const AMBER_BG: RGB = [254, 248, 230];
    const RED_BG: RGB = [254, 236, 236];

    const sc = (c: RGB) => { doc.setTextColor(c[0], c[1], c[2]); };
    const sf = (c: RGB) => { doc.setFillColor(c[0], c[1], c[2]); };

    // ── Column widths (total = pw - 2*m = 281) ──
    const cols = {
      outlet: 48,
      target: 32,
      realA: 30,
      realB: 32,
      selisih: 27,
      ach: 22,
      selisihRkap: 30,
      pencapaianHarian: 30,
      targetHarian: 30,
    };
    const totalCW = Object.values(cols).reduce((a, b) => a + b, 0);

    // Left x for each column
    const cxStart = m;
    const colX: Record<string, number> = {};
    let running = cxStart;
    for (const [key, w] of Object.entries(cols)) {
      colX[key] = running;
      running += w;
    }

    // ── Layout constants ──
    const pageHeaderH = 18;
    const tableHeadH = 7;
    const cardHeaderH = 8;
    const rowH = 6;
    const totalRowH = 7;
    const footerH = 6;
    const cardGap = 4;

    let pageNum = 1;

    // ── Helper: draw page header ──
    function drawPageHeader() {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      sc(GREEN);
      doc.text("ZOLDYCK", m, m + 5);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      sc(GRAY);
      doc.text("Monev Komponen - Perbandingan Realisasi Per Outlet", m, m + 10);

      // Period info (right)
      doc.setFontSize(6);
      sc(GRAY);
      doc.text("Periode Awal", pw - m - 70, m + 5);
      doc.text("Periode Akhir", pw - m - 70, m + 10);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      sc(BLACK);
      doc.text(snapA.date, pw - m - 40, m + 5);
      doc.text(snapB.date, pw - m - 40, m + 10);

      // Green line
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.5);
      doc.line(m, m + 13, pw - m, m + 13);

      // Sub-komponen count
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      sc(GRAY);
      doc.text(`${selectedSubs.length} sub komponen dipilih`, m, m + 16);
    }

    // ── Helper: draw page footer ──
    function drawPageFooter() {
      const fy = ph - 4;
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      doc.line(m, fy - 2, pw - m, fy - 2);

      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      sc(GRAY);
      doc.text("ZOLDYCK - Dokumen dihasilkan otomatis", m, fy);
      doc.text(`Halaman ${pageNum}`, pw - m, fy, { align: "right" });
    }

    // ── Helper: get ACH color ──
    function getAchColors(ach: number): { text: RGB; bg?: RGB } {
      if (ach >= 1.0) return { text: GREEN_L, bg: GREEN_BG };
      if (ach >= 0.8) return { text: AMBER, bg: AMBER_BG };
      return { text: RED, bg: RED_BG };
    }

    // ── Helper: check if enough space for a card ──
    function needNewPage(y: number, numRows: number): boolean {
      const needed = cardHeaderH + tableHeadH + (numRows * rowH) + totalRowH + cardGap;
      return y + needed > ph - m - footerH;
    }

    // ── Helper: draw a sub-komponen card ──
    function drawCard(
      subName: string,
      rows: MonevRowData[],
      y: number
    ): number {
      const group = getGroupForSub(subName);
      const info = getSubInfo(snapshots, subName);

      // Check if we need a new page
      if (needNewPage(y, rows.length)) {
        doc.addPage();
        pageNum++;
        drawPageHeader();
        drawPageFooter();
        y = m + pageHeaderH;
      }

      // ── Card Header (green bar) ──
      sf(GREEN);
      doc.roundedRect(m, y, totalCW, cardHeaderH, 1.5, 1.5, "F");

      // Left side: number + name
      let hx = m + 3;
      if (group) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        sc(WHITE);
        const noText = `${group.no}`;
        const noW = doc.getTextWidth(noText) + 4;
        sf(GREEN_DARK);
        doc.roundedRect(hx, y + 1.5, noW, 5, 1, 1, "F");
        sc(WHITE);
        doc.text(noText, hx + 2, y + 4);
        hx += noW + 3;
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      sc(WHITE);
      doc.text(subName, hx, y + 5.2);

      // Right side: bobot + satuan
      let rx = m + totalCW - 3;
      if (info.satuan) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const satW = doc.getTextWidth(info.satuan) + 6;
        sf([255, 255, 255, 40] as unknown as RGB);
        doc.setFillColor(255, 255, 255, 0.15);
        // Use a slightly transparent effect by using lighter green
        sf([0, 160, 80]);
        doc.roundedRect(rx - satW, y + 2, satW, 4.5, 1, 1, "F");
        sc([220, 255, 230] as RGB);
        doc.text(info.satuan, rx - satW + 3, y + 4.8);
        rx -= satW + 3;
      }

      if (info.bobot > 0) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        const bobText = `Bobot ${info.bobot}%`;
        const bobW = doc.getTextWidth(bobText) + 6;
        sf([255, 255, 255, 40] as unknown as RGB);
        sf([0, 160, 80]);
        doc.roundedRect(rx - bobW, y + 2, bobW, 4.5, 1, 1, "F");
        sc(WHITE);
        doc.text(bobText, rx - bobW + 3, y + 4.8);
      }

      y += cardHeaderH;

      // ── Table Header ──
      sf([240, 240, 240] as RGB);
      doc.rect(m, y, totalCW, tableHeadH, "F");

      // Bottom border of header
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(m, y + tableHeadH, m + totalCW, y + tableHeadH);

      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      sc([80, 80, 80] as RGB);

      const headY = y + tableHeadH / 2 + 1.2;
      doc.text("OUTLET", colX.outlet + 2, headY);
      doc.text("TARGET TAHUNAN", colX.target + cols.target - 2, headY, { align: "right" });
      doc.text(snapA.date, colX.realA + cols.realA - 2, headY, { align: "right" });
      doc.text(snapB.date, colX.realB + cols.realB - 2, headY, { align: "right" });
      doc.text("SELISIH", colX.selisih + cols.selisih - 2, headY, { align: "right" });
      doc.text("ACH", colX.ach + cols.ach / 2, headY, { align: "center" });
      doc.text("SELISIH RKAP", colX.selisihRkap + cols.selisihRkap - 2, headY, { align: "right" });
      doc.text("PENCAPAIAN", colX.pencapaianHarian + cols.pencapaianHarian - 2, headY, { align: "right" });
      doc.text(`TARGET (${remainingWorkDays} hr)`, colX.targetHarian + cols.targetHarian - 2, headY, { align: "right" });

      // Vertical dividers
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      ["target", "realA", "realB", "selisih", "ach", "selisihRkap", "pencapaianHarian", "targetHarian"].forEach(key => {
        doc.line(colX[key], y, colX[key], y + tableHeadH);
      });

      y += tableHeadH;

      // ── Data Rows ──
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const textY = y + rowH / 2 + 1.2;

        // Check page break mid-table
        if (y + rowH > ph - m - footerH) {
          doc.addPage();
          pageNum++;
          drawPageHeader();
          drawPageFooter();
          y = m + pageHeaderH;

          // Re-draw card header
          sf(GREEN);
          doc.roundedRect(m, y, totalCW, cardHeaderH, 1.5, 1.5, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          sc(WHITE);
          doc.text(`${group ? group.no + ". " : ""}${subName} (lanjutan)`, m + 3, y + 5.2);
          y += cardHeaderH;

          // Re-draw table header
          sf([240, 240, 240] as RGB);
          doc.rect(m, y, totalCW, tableHeadH, "F");
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(m, y + tableHeadH, m + totalCW, y + tableHeadH);
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          sc([80, 80, 80] as RGB);
          const rhy = y + tableHeadH / 2 + 1.2;
          doc.text("OUTLET", colX.outlet + 2, rhy);
          doc.text("TARGET TAHUNAN", colX.target + cols.target - 2, rhy, { align: "right" });
          doc.text(snapA.date, colX.realA + cols.realA - 2, rhy, { align: "right" });
          doc.text(snapB.date, colX.realB + cols.realB - 2, rhy, { align: "right" });
          doc.text("SELISIH", colX.selisih + cols.selisih - 2, rhy, { align: "right" });
          doc.text("ACH", colX.ach + cols.ach / 2, rhy, { align: "center" });
          doc.text("SELISIH RKAP", colX.selisihRkap + cols.selisihRkap - 2, rhy, { align: "right" });
          doc.text("PENCAPAIAN", colX.pencapaianHarian + cols.pencapaianHarian - 2, rhy, { align: "right" });
          doc.text(`TARGET (${remainingWorkDays} hr)`, colX.targetHarian + cols.targetHarian - 2, rhy, { align: "right" });
          y += tableHeadH;
        }

        // Alternating row background
        if (i % 2 === 1) {
          sf(LGRAY);
          doc.rect(m, y, totalCW, rowH, "F");
        }

        // Light bottom border
        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.08);
        doc.line(m, y + rowH, m + totalCW, y + rowH);

        doc.setFontSize(6.5);
        // Outlet
        doc.setFont("helvetica", "normal");
        sc(BLACK);
        doc.text(row.outletName, colX.outlet + 2, textY);

        // Target
        doc.text(formatNum(row.targetTahunan), colX.target + cols.target - 2, textY, { align: "right" });

        // Real A
        sc(GRAY);
        doc.text(formatNum(row.realisasiA), colX.realA + cols.realA - 2, textY, { align: "right" });

        // Real B
        sc(BLACK);
        doc.setFont("helvetica", "bold");
        doc.text(formatNum(row.realisasiB), colX.realB + cols.realB - 2, textY, { align: "right" });

        // Selisih
        doc.setFont("helvetica", "normal");
        const selText = (row.selisih >= 0 ? "+" : "") + formatNum(row.selisih);
        sc(row.selisih >= 0 ? GREEN_L : RED);
        doc.text(selText, colX.selisih + cols.selisih - 2, textY, { align: "right" });

        // ACH with background badge
        const achPct = (row.ach * 100).toFixed(1) + "%";
        const achColors = getAchColors(row.ach);
        const achTextW = doc.getTextWidth(achPct);
        const badgePadX = 2.5;
        const badgeW = achTextW + badgePadX * 2;
        const badgeH = 4.5;
        const badgeX = colX.ach + (cols.ach - badgeW) / 2;
        const badgeY = y + (rowH - badgeH) / 2;
        if (achColors.bg) {
          sf(achColors.bg);
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "F");
        }
        sc(achColors.text);
        doc.setFont("helvetica", row.ach >= 1.0 ? "bold" : "normal");
        doc.text(achPct, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.8, { align: "center", baseline: "middle" });

        // Selisih RKAP
        const rkapText = (row.selisihRkap >= 0 ? "+" : "") + formatNum(row.selisihRkap);
        sc(row.selisihRkap >= 0 ? GREEN_L : RED);
        doc.setFont("helvetica", "normal");
        doc.text(rkapText, colX.selisihRkap + cols.selisihRkap - 2, textY, { align: "right" });

        // Pencapaian Harian
        sc(GRAY);
        doc.setFont("helvetica", "normal");
        doc.text(
          row.pencapaianHarian !== 0 ? formatNum(row.pencapaianHarian) : "-",
          colX.pencapaianHarian + cols.pencapaianHarian - 2,
          textY,
          { align: "right" }
        );

        // Target Harian
        sc(GRAY);
        doc.setFont("helvetica", "normal");
        doc.text(
          row.targetHarian > 0 ? formatNum(row.targetHarian) : "-",
          colX.targetHarian + cols.targetHarian - 2,
          textY,
          { align: "right" }
        );

        y += rowH;
      }

      // ── Grand Total Row ──
      if (rows.length > 0) {
        const t = rows.reduce(
          (acc, r) => ({
            target: acc.target + r.targetTahunan,
            realA: acc.realA + r.realisasiA,
            realB: acc.realB + r.realisasiB,
            selisih: acc.selisih + r.selisih,
          }),
          { target: 0, realA: 0, realB: 0, selisih: 0 }
        );
        const totalAch = t.target > 0 ? t.realB / t.target : 0;
        const totalSelisihRkap = t.target - t.realB;
        const totalPencapaianHarian = t.selisih / periodWorkDays;
        const totalTargetHarian = totalSelisihRkap > 0 ? totalSelisihRkap / remainingWorkDays : 0;
        const totalTextY = y + totalRowH / 2 + 1.3;

        sf(GREEN);
        doc.rect(m, y, totalCW, totalRowH, "F");

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        sc(WHITE);

        doc.text("Grand Total", colX.outlet + 2, totalTextY);
        doc.text(formatNum(t.target), colX.target + cols.target - 2, totalTextY, { align: "right" });

        sc([200, 240, 215] as RGB);
        doc.text(formatNum(t.realA), colX.realA + cols.realA - 2, totalTextY, { align: "right" });

        sc(WHITE);
        doc.text(formatNum(t.realB), colX.realB + cols.realB - 2, totalTextY, { align: "right" });

        const totalSelText = (t.selisih >= 0 ? "+" : "") + formatNum(t.selisih);
        doc.text(totalSelText, colX.selisih + cols.selisih - 2, totalTextY, { align: "right" });

        doc.text((totalAch * 100).toFixed(1) + "%", colX.ach + cols.ach / 2, totalTextY, { align: "center" });

        const totalRkapText = (totalSelisihRkap >= 0 ? "+" : "") + formatNum(totalSelisihRkap);
        sc(WHITE);
        doc.text(totalRkapText, colX.selisihRkap + cols.selisihRkap - 2, totalTextY, { align: "right" });

        sc([200, 240, 215] as RGB);
        doc.text(
          totalPencapaianHarian !== 0 ? formatNum(totalPencapaianHarian) : "-",
          colX.pencapaianHarian + cols.pencapaianHarian - 2,
          totalTextY,
          { align: "right" }
        );

        sc([200, 240, 215] as RGB);
        doc.text(
          totalTargetHarian > 0 ? formatNum(totalTargetHarian) : "-",
          colX.targetHarian + cols.targetHarian - 2,
          totalTextY,
          { align: "right" }
        );

        y += totalRowH;
      }

      return y + cardGap;
    }

    // ── BUILD PDF ──
    drawPageHeader();
    drawPageFooter();

    let y = m + pageHeaderH;

    // Build and draw each sub-komponen card
    const defaultSort = { key: "ach", dir: "desc" };
    for (const subName of selectedSubs) {
      let rows = buildRowsForSub(subName, snapA, snapB, periodWorkDays, remainingWorkDays);
      if (rows.length > 0) {
        rows = sortRowsForPdf(rows, sortStates?.[subName], defaultSort);
        y = drawCard(subName, rows, y);
      }
    }

    // ── Outer border around all content ──
    // (skip — cards have their own borders)

    // ── Output ──
    const dateFile = `${snapA.date}_sd_${snapB.date}`.replace(/\s+/g, "_");
    const filename = `Monev_Komponen_${dateFile}.pdf`;
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (error) {
    console.error("Monev PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}