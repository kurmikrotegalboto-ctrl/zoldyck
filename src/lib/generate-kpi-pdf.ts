import type { KpiUnit } from "./kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "./kpi-types";

interface PdfOptions {
  unit: KpiUnit;
  unitLabel: string;
  date: string;
  prevUnit?: KpiUnit;
  compareLabel?: string;
}

function getKpiColorHex(totalKpi: number): [number, number, number] {
  if (totalKpi >= 85) return [5, 150, 105];   // emerald
  if (totalKpi >= 70) return [217, 119, 6];    // amber
  if (totalKpi >= 55) return [234, 88, 12];    // orange
  return [220, 38, 38];                         // red
}

function getAchColorHex(achPct: number): [number, number, number] {
  if (achPct >= 100) return [5, 150, 105];
  if (achPct >= 80) return [217, 119, 6];
  if (achPct >= 50) return [234, 88, 12];
  return [220, 38, 38];
}

function formatNumber(n: number): string {
  if (n === 0) return "0";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export async function generateKpiPdf({
  unit,
  unitLabel,
  date,
  prevUnit,
  compareLabel,
}: PdfOptions) {
  const { jsPDF } = await import("jspdf");

  // Use landscape A4 for wide table
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // ── Color palette ──
  const GREEN = [0, 134, 61] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const GRAY_LIGHT = [245, 245, 245] as [number, number, number];
  const GRAY_TEXT = [100, 100, 100] as [number, number, number];
  const BLACK = [30, 30, 30] as [number, number, number];

  // ── Column widths (total ~277mm for landscape A4 with margins) ──
  const colW = {
    no: 8,
    komp: 36,
    sub: 42,
    cap: 14,
    bobot: 14,
    rkap: 26,
    exceed: 26,
    real: 26,
    ach: 14,
    kem: 12,
    hari: 12,
    delta: 12,
    selRkap: 20,
    selEx: 20,
  };
  const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);

  // ── Build rows ──
  interface Row {
    no: string;
    komp: string;
    sub: string;
    cap: string;
    bobot: string;
    rkap: string;
    exceed: string;
    real: string;
    ach: string;
    achPct: number;
    kem: string;
    hari: string;
    delta: string;
    deltaVal: number;
    selRkap: string;
    selRkapVal: number;
    selEx: string;
    selExVal: number;
    isInactive: boolean;
    isTotal: boolean;
  }

  const rows: Row[] = [];

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
      if (capping === "110" || capping === "Unlimited") {
        exceed = target * 1.1;
      }

      const selisihTarget = realisasi - target;
      const selisihExceed = realisasi - exceed;
      const isInactive = bobot === 0;

      rows.push({
        no: subIdx === 0 ? String(group.no) : "",
        komp: subIdx === 0 ? group.name : "",
        sub,
        cap: capping,
        bobot: isInactive ? "-" : String(bobot),
        rkap: isInactive ? "-" : formatNumber(target),
        exceed: isInactive ? "-" : formatNumber(exceed),
        real: isInactive ? "-" : formatNumber(realisasi),
        ach: isInactive ? "-" : `${achPct.toFixed(2)}%`,
        achPct,
        kem: isInactive ? "-" : kpiKemarin.toFixed(2),
        hari: isInactive ? "-" : kpiHariIni.toFixed(2),
        delta: isInactive ? "-" : (delta === 0 ? "0.00" : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)),
        deltaVal: delta,
        selRkap: isInactive ? "-" : (selisihTarget >= 0 ? formatNumber(selisihTarget) : `(${formatNumber(Math.abs(selisihTarget))})`),
        selRkapVal: selisihTarget,
        selEx: isInactive ? "-" : (selisihExceed >= 0 ? formatNumber(selisihExceed) : `(${formatNumber(Math.abs(selisihExceed))})`),
        selExVal: selisihExceed,
        isInactive,
        isTotal: false,
      });
    });
  });

  // Total row
  const totalKem = prevUnit?.total_kpi ?? unit.total_kpi;
  const totalHari = unit.total_kpi;
  const totalDelta = prevUnit ? parseFloat((totalHari - totalKem).toFixed(2)) : 0;

  rows.push({
    no: "",
    komp: "TOTAL",
    sub: "",
    cap: "",
    bobot: "100",
    rkap: "",
    exceed: "",
    real: "",
    ach: "",
    achPct: 0,
    kem: totalKem.toFixed(2),
    hari: totalHari.toFixed(2),
    delta: totalDelta === 0 ? "0.00" : totalDelta > 0 ? `+${totalDelta.toFixed(2)}` : totalDelta.toFixed(2),
    deltaVal: totalDelta,
    selRkap: "",
    selRkapVal: 0,
    selEx: "",
    selExVal: 0,
    isInactive: false,
    isTotal: true,
  });

  // ── Helper: draw table header ──
  const headerH1 = 7;
  const headerH2 = 5.5;
  const rowH = 6.5;

  function drawHeader(y: number): number {
    // Row 1: merged headers
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");

    const headers1: { text: string; x: number; w: number; rowSpan?: number }[] = [
      { text: "NO", x: margin, w: colW.no, rowSpan: 2 },
      { text: "KOMPONEN KPI", x: margin + colW.no, w: colW.komp, rowSpan: 2 },
      { text: "SUB KOMPONEN KPI", x: margin + colW.no + colW.komp, w: colW.sub, rowSpan: 2 },
      { text: "CAPPING", x: margin + colW.no + colW.komp + colW.sub, w: colW.cap, rowSpan: 2 },
      { text: "BOBOT KPI", x: margin + colW.no + colW.komp + colW.sub + colW.cap, w: colW.bobot, rowSpan: 2 },
      { text: "TARGET", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot, w: colW.rkap + colW.exceed },
      { text: "REALISASI", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed, w: colW.real, rowSpan: 2 },
      { text: "ACH (%)", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real, w: colW.ach, rowSpan: 2 },
      { text: "KPI TAHUNAN", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach, w: colW.kem + colW.hari },
      { text: "DELTA\nHARIAN", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach + colW.kem + colW.hari, w: colW.delta, rowSpan: 2 },
      { text: "SELISIH TARGET", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach + colW.kem + colW.hari + colW.delta, w: colW.selRkap + colW.selEx },
    ];

    // Draw green background for header row 1
    pdf.setFillColor(...GREEN);
    pdf.rect(margin, y, totalColW, headerH1, "F");

    headers1.forEach((h) => {
      pdf.setTextColor(...WHITE);
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "bold");
      // Center the text in cell
      const textY = y + headerH1 / 2;
      const textX = h.x + h.w / 2;
      pdf.text(h.text, textX, textY, { align: "center", baseline: "middle" });
    });

    // Row 2: sub-headers
    const y2 = y + headerH1;
    pdf.setFillColor(...GREEN);
    pdf.rect(margin, y2, totalColW, headerH2, "F");

    const subHeaders: { text: string; x: number; w: number }[] = [
      { text: "RKAP", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot, w: colW.rkap },
      { text: "EXCEED", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap, w: colW.exceed },
      { text: "KEMARIN", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach, w: colW.kem },
      { text: "HARI INI", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach + colW.kem, w: colW.hari },
      { text: "RKAP", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach + colW.kem + colW.hari + colW.delta, w: colW.selRkap },
      { text: "EXCEED", x: margin + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach + colW.kem + colW.hari + colW.delta + colW.selRkap, w: colW.selEx },
    ];

    pdf.setFontSize(5.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...WHITE);

    subHeaders.forEach((h) => {
      const textX = h.x + h.w / 2;
      pdf.text(h.text, textX, y2 + headerH2 / 2, { align: "center", baseline: "middle" });
    });

    return y + headerH1 + headerH2;
  }

  // ── Helper: draw data rows ──
  function drawRows(startY: number, startIdx: number): { endY: number; lastIdx: number } {
    let y = startY;
    let i = startIdx;

    while (i < rows.length) {
      // Check if we need a new page
      if (y + rowH > pageHeight - margin - 15) {
        return { endY: y, lastIdx: i };
      }

      const row = rows[i];
      const xPos = margin;

      if (row.isTotal) {
        // Total row: green background
        pdf.setFillColor(...GREEN);
        pdf.rect(margin, y, totalColW, rowH, "F");
        pdf.setTextColor(...WHITE);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);

        pdf.text("TOTAL", xPos + 2, y + rowH / 2, { baseline: "middle" });
        pdf.text("100", xPos + colW.no + colW.komp + colW.sub + colW.cap + 1, y + rowH / 2, { baseline: "middle" });

        const kemX = xPos + colW.no + colW.komp + colW.sub + colW.cap + colW.bobot + colW.rkap + colW.exceed + colW.real + colW.ach;
        pdf.text(row.kem, kemX + colW.kem / 2, y + rowH / 2, { align: "center", baseline: "middle" });
        pdf.text(row.hari, kemX + colW.kem + colW.hari / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        const deltaX = kemX + colW.kem + colW.hari;
        pdf.text(row.delta, deltaX + colW.delta / 2, y + rowH / 2, { align: "center", baseline: "middle" });
      } else {
        // Regular row
        if (i % 2 === 0) {
          pdf.setFillColor(...WHITE);
        } else {
          pdf.setFillColor(...GRAY_LIGHT);
        }
        pdf.rect(margin, y, totalColW, rowH, "F");

        // Bottom border
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + rowH, margin + totalColW, y + rowH);

        if (row.isInactive) {
          pdf.setTextColor(180, 180, 180);
        } else {
          pdf.setTextColor(...BLACK);
        }

        pdf.setFontSize(6);

        // NO
        if (row.no) {
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(row.no, xPos + colW.no / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // KOMPONEN
        let cx = xPos + colW.no;
        if (row.komp) {
          pdf.setFont("helvetica", "bold");
          pdf.text(row.komp, cx + 2, y + rowH / 2, { baseline: "middle" });
        }

        // SUB KOMPONEN
        cx += colW.komp;
        pdf.setFont("helvetica", "normal");
        pdf.text(row.sub, cx + 2, y + rowH / 2, { baseline: "middle" });

        // CAPPING
        cx += colW.sub;
        pdf.setTextColor(...GRAY_TEXT);
        pdf.text(row.cap, cx + colW.cap / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // BOBOT
        cx += colW.cap;
        if (!row.isInactive) {
          pdf.setTextColor(...BLACK);
          pdf.setFont("helvetica", "bold");
        }
        pdf.text(row.bobot, cx + colW.bobot / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // RKAP
        cx += colW.bobot;
        pdf.setFont("helvetica", "normal");
        if (!row.isInactive) pdf.setTextColor(...BLACK);
        pdf.text(row.rkap, cx + colW.rkap - 2, y + rowH / 2, { align: "right", baseline: "middle" });

        // EXCEED
        cx += colW.rkap;
        pdf.text(row.exceed, cx + colW.exceed - 2, y + rowH / 2, { align: "right", baseline: "middle" });

        // REALISASI
        cx += colW.exceed;
        pdf.text(row.real, cx + colW.real - 2, y + rowH / 2, { align: "right", baseline: "middle" });

        // ACH
        cx += colW.real;
        if (!row.isInactive) {
          const achColor = getAchColorHex(row.achPct);
          pdf.setTextColor(...achColor);
          pdf.setFont("helvetica", row.achPct >= 100 ? "bold" : "normal");
        }
        pdf.text(row.ach, cx + colW.ach / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // KPI KEMARIN
        cx += colW.ach;
        if (!row.isInactive) pdf.setTextColor(...BLACK);
        pdf.setFont("helvetica", "normal");
        pdf.text(row.kem, cx + colW.kem / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // KPI HARI INI
        cx += colW.kem;
        if (!row.isInactive) pdf.setFont("helvetica", "bold");
        pdf.text(row.hari, cx + colW.hari / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // DELTA
        cx += colW.hari;
        if (!row.isInactive) {
          if (row.deltaVal > 0) pdf.setTextColor(5, 150, 105);
          else if (row.deltaVal < 0) pdf.setTextColor(220, 38, 38);
          else pdf.setTextColor(180, 180, 180);
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(row.delta, cx + colW.delta / 2, y + rowH / 2, { align: "center", baseline: "middle" });

        // SELISIH TARGET RKAP
        cx += colW.delta;
        if (!row.isInactive) {
          if (row.selRkapVal >= 0) pdf.setTextColor(5, 150, 105);
          else pdf.setTextColor(220, 38, 38);
        }
        pdf.setFont("helvetica", "normal");
        pdf.text(row.selRkap, cx + colW.selRkap - 2, y + rowH / 2, { align: "right", baseline: "middle" });

        // SELISIH TARGET EXCEED
        cx += colW.selRkap;
        if (!row.isInactive) {
          if (row.selExVal >= 0) pdf.setTextColor(5, 150, 105);
          else pdf.setTextColor(220, 38, 38);
        }
        pdf.text(row.selEx, cx + colW.selEx - 2, y + rowH / 2, { align: "right", baseline: "middle" });
      }

      y += rowH;
      i++;
    }

    return { endY: y, lastIdx: i };
  }

  // ── Helper: draw page header ──
  function drawPageHeader(y: number) {
    // Left side
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...GREEN);
    pdf.text("ZOLDYCK", margin, y);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...GRAY_TEXT);
    pdf.text("Laporan Monitoring Kinerja", margin, y + 6);

    // Right side: period
    pdf.setFontSize(7);
    pdf.setTextColor(...GRAY_TEXT);
    pdf.text("Periode", pageWidth - margin - 50, y);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...BLACK);
    pdf.text(date, pageWidth - margin - 50, y + 6);

    // Separator line
    pdf.setDrawColor(...GREEN);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y + 11, pageWidth - margin, y + 11);

    // Unit name + KPI score
    const yUnit = y + 16;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...BLACK);
    pdf.text(unitLabel, margin, yUnit);

    // KPI badge
    const kpiColor = getKpiColorHex(unit.total_kpi);
    const kpiText = unit.total_kpi.toFixed(2);
    pdf.setFillColor(kpiColor[0], kpiColor[1], kpiColor[2]);
    const kpiTextW = pdf.getTextWidth(kpiText);
    const badgePadX = 4;
    const badgePadY = 2;
    const badgeX = margin + pdf.getTextWidth(unitLabel) + 8;
    // Rounded rect approximation
    const bw = kpiTextW + badgePadX * 2;
    const bh = 6;
    pdf.roundedRect(badgeX, yUnit - 4, bw, bh, 1.5, 1.5, "F");
    pdf.setTextColor(...WHITE);
    pdf.setFontSize(10);
    pdf.text(kpiText, badgeX + bw / 2, yUnit - 4 + bh / 2, { align: "center", baseline: "middle" });

    // Compare label
    if (compareLabel) {
      pdf.setTextColor(...GRAY_TEXT);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Bandingkan dengan: ${compareLabel}`, badgeX + bw + 8, yUnit);
    }

    // Component count
    pdf.setTextColor(...GRAY_TEXT);
    pdf.setFontSize(7);
    const compCount = unit.components.length;
    pdf.text(`${compCount} komponen KPI`, margin, yUnit + 5);

    return yUnit + 12;
  }

  // ── Helper: draw page footer ──
  function drawPageFooter(pageNum: number) {
    const fy = pageHeight - 8;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, fy - 2, pageWidth - margin, fy - 2);

    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    pdf.text("ZOLDYCK - Dokumen dihasilkan otomatis", margin, fy);
    pdf.text(`Halaman ${pageNum}`, pageWidth - margin, fy, { align: "right" });
  }

  // ── BUILD PDF ──
  let y = drawPageHeader(margin + 2);
  y += 2;
  y = drawHeader(y);
  y += 1;

  let rowIdx = 0;
  let pageNum = 1;
  drawPageFooter(pageNum);

  // Draw all rows with pagination
  while (rowIdx < rows.length) {
    const result = drawRows(y, rowIdx);
    rowIdx = result.lastIdx;

    if (rowIdx < rows.length) {
      // New page
      pdf.addPage();
      pageNum++;
      y = margin + 2;
      y = drawHeader(y);
      y += 1;
      drawPageFooter(pageNum);
    } else {
      drawPageFooter(pageNum);
    }

    y = result.endY;
  }

  // Download
  const unitShort = unitLabel.replace(/\s+/g, "_");
  const dateFile = date.replace(/\s+/g, "_");
  pdf.save(`KPI_${unitShort}_${dateFile}.pdf`);
}