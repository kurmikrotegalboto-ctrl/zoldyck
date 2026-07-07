import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export const maxDuration = 30;

import type { KpiUnit } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "@/lib/kpi-types";

// ── Color type helper ──
type RGB = [number, number, number];

// ── KPI Data helpers ──

function formatNumber(n: number): string {
  if (n === 0) return "0";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

interface RowData {
  no: string; komp: string; sub: string; cap: string; bobot: string;
  rkap: string; exceed: string; real: string; ach: string; achPct: number;
  kem: string; hari: string; delta: string; deltaVal: number;
  selRkap: string; selRkapVal: number; selEx: string; selExVal: number;
  isInactive: boolean; isTotal: boolean;
}

function buildRows(unit: KpiUnit, prevUnit?: KpiUnit): RowData[] {
  const rows: RowData[] = [];
  KOMPONEN_GROUPS.forEach((group) => {
    group.subKomponen.forEach((sub, subIdx) => {
      const comp = getKpiForSub(unit, sub);
      const prevComp = prevUnit ? getKpiForSub(prevUnit, sub) : undefined;
      const bobot = comp?.bobot ?? 0;
      const target = comp?.target ?? 0;
      const realisasi = comp?.realisasi ?? 0;
      const achPct = comp?.ach ? comp.ach * 100 : 0;
      const kpiHariIni = comp?.kpi_score ?? 0;
      const kpiKemarin = prevComp?.kpi_score ?? kpiHariIni;
      const delta = prevComp ? parseFloat((kpiHariIni - kpiKemarin).toFixed(2)) : 0;
      const capping = CAPPING_MAP[sub] || "-";
      let exceed = 0;
      if (capping === "110" || capping === "Unlimited") exceed = target * 1.1;
      const selisihTarget = realisasi - target;
      const selisihExceed = realisasi - exceed;
      const isInactive = bobot === 0;
      rows.push({
        no: subIdx === 0 ? String(group.no) : "", komp: subIdx === 0 ? group.name : "", sub,
        cap: capping, bobot: isInactive ? "-" : String(bobot),
        rkap: isInactive ? "-" : formatNumber(target), exceed: isInactive ? "-" : formatNumber(exceed),
        real: isInactive ? "-" : formatNumber(realisasi),
        ach: isInactive ? "-" : `${achPct.toFixed(2)}%`, achPct,
        kem: isInactive ? "-" : kpiKemarin.toFixed(2), hari: isInactive ? "-" : kpiHariIni.toFixed(2),
        delta: isInactive ? "-" : (delta === 0 ? "0.00" : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)),
        deltaVal: delta,
        selRkap: isInactive ? "-" : (selisihTarget >= 0 ? formatNumber(selisihTarget) : `(${formatNumber(Math.abs(selisihTarget))})`),
        selRkapVal: selisihTarget,
        selEx: isInactive ? "-" : (selisihExceed >= 0 ? formatNumber(selisihExceed) : `(${formatNumber(Math.abs(selisihExceed))})`),
        selExVal: selisihExceed, isInactive, isTotal: false,
      });
    });
  });
  const totalKem = prevUnit?.total_kpi ?? unit.total_kpi;
  const totalHari = unit.total_kpi;
  const totalDelta = prevUnit ? parseFloat((totalHari - totalKem).toFixed(2)) : 0;
  rows.push({
    no: "", komp: "TOTAL", sub: "", cap: "", bobot: "100", rkap: "", exceed: "", real: "", ach: "",
    achPct: 0, kem: totalKem.toFixed(2), hari: totalHari.toFixed(2),
    delta: totalDelta === 0 ? "0.00" : totalDelta > 0 ? `+${totalDelta.toFixed(2)}` : totalDelta.toFixed(2),
    deltaVal: totalDelta, selRkap: "", selRkapVal: 0, selEx: "", selExVal: 0, isInactive: false, isTotal: true,
  });
  return rows;
}

// ── Main handler ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit, unitLabel, date, prevUnit, compareLabel } = body as {
      unit: KpiUnit; unitLabel: string; date: string; prevUnit?: KpiUnit; compareLabel?: string;
    };

    // ── Create jsPDF document (A4 landscape, mm units) ──
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pw = 297;   // A4 landscape width
    const ph = 210;   // A4 landscape height
    const m = 8;      // margin

    // Colors (RGB 0-255) — typed as tuples for safe spread
    const GREEN: RGB = [0, 134, 61];
    const WHITE: RGB = [255, 255, 255];
    const LGRAY: RGB = [242, 242, 242];
    const BLACK: RGB = [30, 30, 30];
    const GRAY: RGB = [160, 160, 160];
    const GREEN_LIGHT: RGB = [5, 150, 105];
    const AMBER: RGB = [217, 119, 6];
    const ORANGE: RGB = [234, 88, 12];
    const RED: RGB = [220, 38, 38];
    const GREEN_DELTA: RGB = [100, 220, 130];
    const RED_DELTA: RGB = [255, 120, 120];

    // Column layout (widths in mm)
    const colW: Record<string, number> = {
      no: 7, komp: 32, sub: 40, cap: 14, bobot: 12,
      rkap: 26, exceed: 26, real: 26, ach: 14,
      kem: 13, hari: 13, delta: 13,
      selRkap: 22, selEx: 22,
    };
    const totalCW = Object.values(colW).reduce((a, b) => a + b, 0);

    const colX = (...keys: string[]): number =>
      m + keys.reduce((s, k) => s + (colW[k] || 0), 0);

    const rows = buildRows(unit, prevUnit);
    const headerH = 9;
    const rowH = 5.8;
    const pageHeaderH = 28;
    const footerH = 8;
    const usableH = ph - m - footerH;

    // ── Helper: set text color from tuple ──
    const setColor = (c: RGB) => { doc.setTextColor(c[0], c[1], c[2]); };
    const setFill = (c: RGB) => { doc.setFillColor(c[0], c[1], c[2]); };
    const setDraw = (c: RGB) => { doc.setDrawColor(c[0], c[1], c[2]); };

    // ── Helper: draw table header row ──
    const drawTableHeader = (y: number): number => {
      setFill(GREEN);
      doc.rect(m, y, totalCW, headerH, "F");

      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      setColor(WHITE);

      const headers: { t: string; x: number }[] = [
        { t: "NO", x: colX("no") },
        { t: "KOMPONEN KPI", x: colX("komp") },
        { t: "SUB KOMPONEN KPI", x: colX("sub") },
        { t: "CAPPING", x: colX("cap") },
        { t: "BOBOT", x: colX("bobot") },
        { t: "TARGET", x: colX("rkap") },
        { t: "REALISASI", x: colX("real") },
        { t: "ACH(%)", x: colX("ach") },
        { t: "KPI TAHUNAN", x: colX("kem") },
        { t: "DELTA", x: colX("delta") },
        { t: "SELISIH TARGET", x: colX("selRkap") },
      ];

      headers.forEach((h) => {
        doc.text(h.t, h.x + 1, y + headerH / 2 + 1.5);
      });

      setColor(BLACK);
      return y + headerH;
    };

    // ── Helper: draw page header ──
    const drawPageHeader = (y: number): number => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      setColor(BLACK);
      doc.text("MONEV KPI / TEGALBOTO 2026", m, y + 5);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Laporan Monitoring Kinerja", m, y + 10);

      // Period (right side)
      doc.setFontSize(7);
      doc.text("Periode", pw - m - 55, y + 5);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(date, pw - m - 55, y + 10);

      // Green line
      setDraw(GREEN);
      doc.setLineWidth(0.5);
      doc.line(m, y + 13, pw - m, y + 13);

      // Unit name + KPI badge
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(unitLabel, m, y + 18);

      // KPI score badge
      const kpiText = unit.total_kpi.toFixed(2);
      const kpiColor: RGB = unit.total_kpi >= 85
        ? GREEN_LIGHT
        : unit.total_kpi >= 70
        ? AMBER
        : unit.total_kpi >= 55
        ? ORANGE
        : RED;

      const labelW = doc.getTextWidth(unitLabel);
      const scoreW = doc.getTextWidth(kpiText);
      const badgeX = m + labelW + 4;
      const badgeW = scoreW + 6;
      const badgeY = y + 14.5;

      setFill(kpiColor);
      doc.roundedRect(badgeX, badgeY, badgeW, 5.5, 1, 1, "F");
      doc.setFontSize(9);
      setColor(WHITE);
      doc.text(kpiText, badgeX + 3, badgeY + 4);
      setColor(BLACK);

      if (compareLabel) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`Bandingkan: ${compareLabel}`, badgeX + badgeW + 4, y + 18);
      }

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`${unit.components.length} komponen KPI`, m, y + 23);

      return y + pageHeaderH;
    };

    // ── Helper: draw footer ──
    const drawFooter = (pageNum: number): void => {
      const fy = ph - 5;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(m, fy - 2, pw - m, fy - 2);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130, 130, 130);
      doc.text("MONEV KPI TEGALBOTO 2026 - Dokumen otomatis", m, fy);
      doc.text(`Halaman ${pageNum}`, pw - m - 20, fy);
      setColor(BLACK);
    };

    // ── Build PDF pages ──
    let y = drawPageHeader(m);
    y = drawTableHeader(y);
    let pageNum = 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Check if we need a new page
      if (y + rowH > usableH) {
        drawFooter(pageNum);
        doc.addPage();
        pageNum++;
        y = drawPageHeader(m);
        y = drawTableHeader(y);
      }

      if (row.isTotal) {
        // Total row - green background
        setFill(GREEN);
        doc.rect(m, y, totalCW, rowH, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        setColor(WHITE);
        doc.text("TOTAL", m + 2, y + rowH / 2 + 1.5);
        doc.text("100", colX("bobot") + 2, y + rowH / 2 + 1.5);
        doc.text(row.kem, colX("kem") + 2, y + rowH / 2 + 1.5);
        doc.text(row.hari, colX("hari") + 2, y + rowH / 2 + 1.5);

        // Color the delta
        if (row.deltaVal > 0) setColor(GREEN_DELTA);
        else if (row.deltaVal < 0) setColor(RED_DELTA);
        doc.text(row.delta, colX("delta") + 2, y + rowH / 2 + 1.5);

        setColor(BLACK);
      } else {
        // Alternating row background
        if (i % 2 === 1) {
          setFill(LGRAY);
          doc.rect(m, y, totalCW, rowH, "F");
        }

        // Bottom border line
        doc.setDrawColor(225, 225, 225);
        doc.setLineWidth(0.1);
        doc.line(m, y + rowH, m + totalCW, y + rowH);

        const textY = y + rowH / 2 + 1.3;
        const txtColor = row.isInactive ? GRAY : BLACK;

        // NO column
        doc.setFontSize(5);
        if (row.no) {
          doc.setFont("helvetica", "bold");
          setColor(BLACK);
          doc.text(row.no, colX("no") + 2, textY);
        }

        // KOMPONEN column
        if (row.komp) {
          doc.setFont("helvetica", "bold");
          setColor(BLACK);
          doc.text(row.komp, colX("komp") + 1, textY);
        }

        // SUB KOMPONEN column
        doc.setFont("helvetica", "normal");
        setColor(txtColor);
        doc.text(row.sub, colX("sub") + 1, textY, { maxWidth: colW.sub - 2 });

        // CAPPING column
        setColor(GRAY);
        doc.text(row.cap, colX("cap") + 2, textY);

        // BOBOT column
        if (!row.isInactive) doc.setFont("helvetica", "bold");
        setColor(txtColor);
        doc.text(row.bobot, colX("bobot") + 2, textY);

        // Right-aligned numeric columns
        doc.setFont("helvetica", "normal");
        setColor(txtColor);

        // RKAP
        doc.text(row.rkap, colX("rkap") + colW.rkap - 2, textY, { align: "right" });
        // EXCEED
        doc.text(row.exceed, colX("exceed") + colW.exceed - 2, textY, { align: "right" });
        // REALISASI
        doc.text(row.real, colX("real") + colW.real - 2, textY, { align: "right" });

        // ACH %
        if (!row.isInactive) {
          if (row.achPct >= 100) {
            setColor(GREEN_LIGHT);
            doc.setFont("helvetica", "bold");
          } else if (row.achPct >= 80) {
            setColor(AMBER);
          } else {
            setColor(RED);
          }
        } else {
          setColor(GRAY);
        }
        doc.text(row.ach, colX("ach") + 2, textY);

        // KPI TAHUNAN - KEMARIN
        doc.setFont("helvetica", "normal");
        setColor(txtColor);
        doc.text(row.kem, colX("kem") + 2, textY);

        // KPI TAHUNAN - HARI INI
        if (!row.isInactive) doc.setFont("helvetica", "bold");
        doc.text(row.hari, colX("hari") + 2, textY);

        // DELTA
        doc.setFont("helvetica", "normal");
        if (!row.isInactive) {
          if (row.deltaVal > 0) setColor(GREEN_LIGHT);
          else if (row.deltaVal < 0) setColor(RED);
          else setColor(BLACK);
        } else {
          setColor(GRAY);
        }
        doc.text(row.delta, colX("delta") + 2, textY);

        // SELISIH TARGET RKAP
        if (!row.isInactive) {
          setColor(row.selRkapVal >= 0 ? GREEN_LIGHT : RED);
        } else {
          setColor(GRAY);
        }
        doc.text(row.selRkap, colX("selRkap") + colW.selRkap - 2, textY, { align: "right" });

        // SELISIH TARGET EXCEED
        if (!row.isInactive) {
          setColor(row.selExVal >= 0 ? GREEN_LIGHT : RED);
        } else {
          setColor(GRAY);
        }
        doc.text(row.selEx, colX("selEx") + colW.selEx - 2, textY, { align: "right" });

        setColor(BLACK);
      }

      y += rowH;
    }

    // Final footer
    drawFooter(pageNum);

    // ── Output PDF ──
    const unitShort = unitLabel.replace(/\s+/g, "_");
    const dateFile = date.replace(/\s+/g, "_");
    const filename = `KPI_${unitShort}_${dateFile}.pdf`;

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
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}