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

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pw = 297;
    const ph = 210;
    const m = 5; // tight margin

    // ── Colors ──
    const GREEN: RGB = [0, 134, 61];
    const WHITE: RGB = [255, 255, 255];
    const LGRAY: RGB = [245, 245, 245];
    const BLACK: RGB = [30, 30, 30];
    const GRAY: RGB = [160, 160, 160];
    const GREEN_L: RGB = [5, 150, 105];
    const AMBER: RGB = [217, 119, 6];
    const ORANGE: RGB = [234, 88, 12];
    const RED: RGB = [220, 38, 38];

    // ── Column widths — total must equal pw - 2*m = 287 ──
    const cols = {
      no:     6,
      komp:   28,
      sub:    46,
      cap:    13,
      bobot:  10,
      rkap:   23,
      exceed: 23,
      real:   23,
      ach:    15,
      kem:    14,
      hari:   14,
      delta:  14,
      selRk:  22,
      selEx:  22,
    };
    const totalCW = Object.values(cols).reduce((a, b) => a + b, 0); // 273

    // Left-align x position for each column
    const cx = (key: string): number =>
      m + Object.entries(cols).slice(0, Object.keys(cols).indexOf(key)).reduce((s, [, v]) => s + v, 0);

    // ── Helpers ──
    const sc = (c: RGB) => { doc.setTextColor(c[0], c[1], c[2]); };
    const sf = (c: RGB) => { doc.setFillColor(c[0], c[1], c[2]); };

    // Truncate text to fit column width
    const fitText = (text: string, maxW: number, fontSize: number): string => {
      doc.setFontSize(fontSize);
      if (doc.getTextWidth(text) <= maxW) return text;
      let t = text;
      while (t.length > 0 && doc.getTextWidth(t + "...") > maxW) t = t.slice(0, -1);
      return t + "...";
    };

    // ── Layout constants ──
    const headerAreaH = 16;  // compact page header
    const tableHeadH = 11;   // 2-row table header
    const rowH = 5.2;        // compact data row
    const footerH = 4;
    const dataAreaTop = m + headerAreaH + tableHeadH;
    const dataAreaBottom = ph - m - footerH;

    const rows = buildRows(unit, prevUnit);
    const numRows = rows.length;

    // ── PAGE HEADER ──
    let y = m;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    sc(BLACK);
    doc.text("MONEV KPI / TEGALBOTO 2026", m, y + 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Laporan Monitoring Kinerja", m, y + 8);

    // Period (right)
    doc.setFontSize(6);
    doc.text("Periode", pw - m - 50, y + 4);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(date, pw - m - 50, y + 8);

    // Green line
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.4);
    doc.line(m, y + 10, pw - m, y + 10);

    // Unit + KPI badge
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(unitLabel, m, y + 14);

    const kpiText = unit.total_kpi.toFixed(2);
    const kpiColor: RGB = unit.total_kpi >= 85 ? GREEN_L : unit.total_kpi >= 70 ? AMBER : unit.total_kpi >= 55 ? ORANGE : RED;
    const labelW = doc.getTextWidth(unitLabel);
    const scoreW = doc.getTextWidth(kpiText);
    const badgeX = m + labelW + 3;
    const badgeW = scoreW + 6;

    sf(kpiColor);
    doc.roundedRect(badgeX, y + 10.8, badgeW, 5, 1, 1, "F");
    doc.setFontSize(8);
    sc(WHITE);
    doc.text(kpiText, badgeX + 3, y + 14);

    if (compareLabel) {
      sc(BLACK);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Bandingkan: ${compareLabel}`, badgeX + badgeW + 3, y + 14);
    }

    // ── TABLE HEADER (2 rows) ──
    y = m + headerAreaH;
    sf(GREEN);
    doc.rect(m, y, totalCW, tableHeadH, "F");

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    sc(WHITE);

    // Row 1: merged group headers
    const r1y = y + 4;
    doc.text("NO", cx("no") + 1, r1y);
    doc.text("KOMPONEN", cx("komp") + 1, r1y);
    doc.text("SUB KOMPONEN", cx("sub") + 1, r1y);
    doc.text("CAPPING", cx("cap") + 1, r1y);
    doc.text("BOBOT", cx("bobot") + 1, r1y);

    // TARGET spans rkap + exceed
    const targetCenterX = cx("rkap") + (cols.rkap + cols.exceed) / 2;
    doc.text("TARGET", targetCenterX, r1y, { align: "center" });
    doc.text("REALISASI", cx("real") + cols.real / 2, r1y, { align: "center" });
    doc.text("ACH", cx("ach") + cols.ach / 2, r1y, { align: "center" });

    // KPI TAHUNAN spans kem + hari
    const kpiCenterX = cx("kem") + (cols.kem + cols.hari) / 2;
    doc.text("KPI TAHUNAN", kpiCenterX, r1y, { align: "center" });

    doc.text("DELTA", cx("delta") + cols.delta / 2, r1y, { align: "center" });

    // SELISIH TARGET spans selRk + selEx
    const selCenterX = cx("selRk") + (cols.selRk + cols.selEx) / 2;
    doc.text("SELISIH TARGET", selCenterX, r1y, { align: "center" });

    // Sub-header divider
    doc.setDrawColor(0, 100, 40);
    doc.setLineWidth(0.2);
    doc.line(m, y + 5.5, m + totalCW, y + 5.5);

    // Row 2: sub-headers
    const r2y = y + 9;
    doc.text("(%)", cx("ach") + cols.ach / 2, r2y, { align: "center" });
    doc.text("KEMARIN", cx("kem") + cols.kem / 2, r2y, { align: "center" });
    doc.text("HARI INI", cx("hari") + cols.hari / 2, r2y, { align: "center" });
    doc.text("RKAP", cx("rkap") + cols.rkap / 2, r2y, { align: "center" });
    doc.text("EXCEED", cx("exceed") + cols.exceed / 2, r2y, { align: "center" });
    doc.text("RKAP", cx("selRk") + cols.selRk / 2, r2y, { align: "center" });
    doc.text("EXCEED", cx("selEx") + cols.selEx / 2, r2y, { align: "center" });

    // Thin border around header
    doc.setDrawColor(0, 100, 40);
    doc.setLineWidth(0.3);
    doc.rect(m, y, totalCW, tableHeadH, "S");

    // Vertical dividers in header
    const vDividers = ["komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRk", "selEx"];
    vDividers.forEach((key) => {
      doc.line(cx(key), y, cx(key), y + tableHeadH);
    });

    sc(BLACK);

    // ── DATA ROWS ──
    y = dataAreaTop;

    for (let i = 0; i < numRows; i++) {
      const row = rows[i];
      const textY = y + rowH / 2 + 1.1;

      if (row.isTotal) {
        // ── TOTAL ROW ──
        sf(GREEN);
        doc.rect(m, y, totalCW, rowH, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        sc(WHITE);
        doc.text("TOTAL", cx("komp") + 1, textY);
        doc.text("100", cx("bobot") + 1, textY);
        doc.text(row.kem, cx("kem") + cols.kem / 2, textY, { align: "center" });
        doc.text(row.hari, cx("hari") + cols.hari / 2, textY, { align: "center" });

        if (row.deltaVal > 0) sc([100, 220, 130]);
        else if (row.deltaVal < 0) sc([255, 120, 120]);
        doc.text(row.delta, cx("delta") + cols.delta / 2, textY, { align: "center" });
        sc(BLACK);
      } else {
        // ── NORMAL ROW ──
        // Alternating background
        if (i % 2 === 1) {
          sf(LGRAY);
          doc.rect(m, y, totalCW, rowH, "F");
        }

        // Light bottom border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.08);
        doc.line(m, y + rowH, m + totalCW, y + rowH);

        const tc = row.isInactive ? GRAY : BLACK;
        const fSize = 5.5;

        // NO
        if (row.no) {
          doc.setFontSize(fSize);
          doc.setFont("helvetica", "bold");
          sc(BLACK);
          doc.text(row.no, cx("no") + 1, textY);
        }

        // KOMPONEN (bold, truncate)
        if (row.komp) {
          doc.setFontSize(fSize);
          doc.setFont("helvetica", "bold");
          sc(BLACK);
          doc.text(fitText(row.komp, cols.komp - 2, fSize), cx("komp") + 1, textY);
        }

        // SUB KOMPONEN (truncate to fit)
        doc.setFontSize(fSize);
        doc.setFont("helvetica", "normal");
        sc(tc);
        doc.text(fitText(row.sub, cols.sub - 2, fSize), cx("sub") + 1, textY);

        // CAPPING
        doc.setFontSize(fSize - 0.5);
        sc(GRAY);
        doc.text(row.cap, cx("cap") + 1, textY);

        // BOBOT
        doc.setFontSize(fSize);
        if (!row.isInactive) doc.setFont("helvetica", "bold");
        sc(tc);
        doc.text(row.bobot, cx("bobot") + cols.bobot - 1, textY, { align: "right" });

        // TARGET RKAP
        doc.setFontSize(fSize);
        doc.setFont("helvetica", "normal");
        sc(tc);
        doc.text(row.rkap, cx("rkap") + cols.rkap - 1, textY, { align: "right" });

        // TARGET EXCEED
        doc.text(row.exceed, cx("exceed") + cols.exceed - 1, textY, { align: "right" });

        // REALISASI
        doc.text(row.real, cx("real") + cols.real - 1, textY, { align: "right" });

        // ACH %
        doc.setFontSize(fSize);
        if (!row.isInactive) {
          if (row.achPct >= 100) { sc(GREEN_L); doc.setFont("helvetica", "bold"); }
          else if (row.achPct >= 80) { sc(AMBER); doc.setFont("helvetica", "normal"); }
          else { sc(RED); doc.setFont("helvetica", "normal"); }
        } else {
          sc(GRAY);
          doc.setFont("helvetica", "normal");
        }
        doc.text(row.ach, cx("ach") + cols.ach / 2, textY, { align: "center" });

        // KPI KEMARIN
        doc.setFontSize(fSize);
        doc.setFont("helvetica", "normal");
        sc(tc);
        doc.text(row.kem, cx("kem") + cols.kem / 2, textY, { align: "center" });

        // KPI HARI INI
        if (!row.isInactive) doc.setFont("helvetica", "bold");
        doc.text(row.hari, cx("hari") + cols.hari / 2, textY, { align: "center" });

        // DELTA
        doc.setFontSize(fSize);
        doc.setFont("helvetica", "normal");
        if (!row.isInactive) {
          if (row.deltaVal > 0) sc(GREEN_L);
          else if (row.deltaVal < 0) sc(RED);
          else sc(BLACK);
        } else {
          sc(GRAY);
        }
        doc.text(row.delta, cx("delta") + cols.delta / 2, textY, { align: "center" });

        // SELISIH RKAP
        if (!row.isInactive) {
          sc(row.selRkapVal >= 0 ? GREEN_L : RED);
        } else {
          sc(GRAY);
        }
        doc.text(row.selRkap, cx("selRk") + cols.selRk - 1, textY, { align: "right" });

        // SELISIH EXCEED
        if (!row.isInactive) {
          sc(row.selExVal >= 0 ? GREEN_L : RED);
        } else {
          sc(GRAY);
        }
        doc.text(row.selEx, cx("selEx") + cols.selEx - 1, textY, { align: "right" });

        sc(BLACK);
      }

      y += rowH;
    }

    // ── TABLE BORDER (around all data) ──
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(m, m + headerAreaH, totalCW, y - (m + headerAreaH), "S");

    // ── FOOTER ──
    const fy = ph - 3;
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("MONEV KPI TEGALBOTO 2026 - Dokumen otomatis", m, fy);
    doc.text(date, pw - m - 30, fy);

    // ── Output ──
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