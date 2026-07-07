import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import type { KpiUnit } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "@/lib/kpi-types";

interface PdfRequestBody {
  unit: KpiUnit;
  unitLabel: string;
  date: string;
  prevUnit?: KpiUnit;
  compareLabel?: string;
}

function getKpiColorHex(totalKpi: number): [number, number, number] {
  if (totalKpi >= 85) return [5, 150, 105];
  if (totalKpi >= 70) return [217, 119, 6];
  if (totalKpi >= 55) return [234, 88, 12];
  return [220, 38, 38];
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

function buildRows(unit: KpiUnit, prevUnit?: KpiUnit): Row[] {
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

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const body: PdfRequestBody = await req.json();
    const { unit, unitLabel, date, prevUnit, compareLabel } = body;

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // Colors
    const GREEN = [0, 134, 61] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    const GRAY_LIGHT = [245, 245, 245] as [number, number, number];
    const GRAY_TEXT = [100, 100, 100] as [number, number, number];
    const BLACK = [30, 30, 30] as [number, number, number];

    // Column widths
    const colW = { no: 8, komp: 36, sub: 42, cap: 14, bobot: 14, rkap: 26, exceed: 26, real: 26, ach: 14, kem: 12, hari: 12, delta: 12, selRkap: 20, selEx: 20 };
    const totalColW = Object.values(colW).reduce((a, b) => a + b, 0);

    const rows = buildRows(unit, prevUnit);

    const headerH1 = 7;
    const headerH2 = 5.5;
    const rowH = 6.5;

    // Helpers
    function colX(...keys: (keyof typeof colW)[]) {
      return margin + keys.reduce((sum, k) => sum + colW[k], 0);
    }

    function drawHeader(y: number): number {
      pdf.setFillColor(...GREEN);
      pdf.rect(margin, y, totalColW, headerH1, "F");
      pdf.setTextColor(...WHITE);
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "bold");

      const h1 = [
        { t: "NO", x: colX("no"), w: colW.no },
        { t: "KOMPONEN KPI", x: colX("no", "komp"), w: colW.komp },
        { t: "SUB KOMPONEN KPI", x: colX("no", "komp", "sub"), w: colW.sub },
        { t: "CAPPING", x: colX("no", "komp", "sub", "cap"), w: colW.cap },
        { t: "BOBOT KPI", x: colX("no", "komp", "sub", "cap", "bobot"), w: colW.bobot },
        { t: "TARGET", x: colX("no", "komp", "sub", "cap", "bobot", "rkap"), w: colW.rkap + colW.exceed },
        { t: "REALISASI", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed"), w: colW.real },
        { t: "ACH (%)", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real"), w: colW.ach },
        { t: "KPI TAHUNAN", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach"), w: colW.kem + colW.hari },
        { t: "DELTA HARIAN", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem"), w: colW.delta },
        { t: "SELISIH TARGET", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta"), w: colW.selRkap + colW.selEx },
      ];
      h1.forEach((h) => pdf.text(h.t, h.x + h.w / 2, y + headerH1 / 2, { align: "center", baseline: "middle" }));

      // Sub-headers
      const y2 = y + headerH1;
      pdf.setFillColor(...GREEN);
      pdf.rect(margin, y2, totalColW, headerH2, "F");
      pdf.setFontSize(5.5);

      const h2 = [
        { t: "RKAP", x: colX("no", "komp", "sub", "cap", "bobot"), w: colW.rkap },
        { t: "EXCEED", x: colX("no", "komp", "sub", "cap", "bobot", "rkap"), w: colW.exceed },
        { t: "KEMARIN", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach"), w: colW.kem },
        { t: "HARI INI", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem"), w: colW.hari },
        { t: "RKAP", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta"), w: colW.selRkap },
        { t: "EXCEED", x: colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRkap"), w: colW.selEx },
      ];
      h2.forEach((h) => pdf.text(h.t, h.x + h.w / 2, y2 + headerH2 / 2, { align: "center", baseline: "middle" }));

      return y2 + headerH2;
    }

    function drawPageHeader(y: number): number {
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...GREEN);
      pdf.text("MONEV KPI / TEGALBOTO 2026", margin, y);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...GRAY_TEXT);
      pdf.text("Laporan Monitoring Kinerja", margin, y + 6);

      pdf.setFontSize(7);
      pdf.text("Periode", pageWidth - margin - 50, y);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...BLACK);
      pdf.text(date, pageWidth - margin - 50, y + 6);

      pdf.setDrawColor(...GREEN);
      pdf.setLineWidth(0.8);
      pdf.line(margin, y + 11, pageWidth - margin, y + 11);

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
      const badgeX = margin + pdf.getTextWidth(unitLabel) + 8;
      const bw = kpiTextW + 8;
      pdf.rect(badgeX, yUnit - 4, bw, 6, "F");
      pdf.setTextColor(...WHITE);
      pdf.setFontSize(10);
      pdf.text(kpiText, badgeX + bw / 2, yUnit - 4 + 3, { align: "center", baseline: "middle" });

      if (compareLabel) {
        pdf.setTextColor(...GRAY_TEXT);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Bandingkan dengan: ${compareLabel}`, badgeX + bw + 8, yUnit);
      }

      pdf.setTextColor(...GRAY_TEXT);
      pdf.setFontSize(7);
      pdf.text(`${unit.components.length} komponen KPI`, margin, yUnit + 5);

      return yUnit + 12;
    }

    function drawPageFooter(pageNum: number) {
      const fy = pageHeight - 8;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, fy - 2, pageWidth - margin, fy - 2);
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      pdf.text("MONEV KPI TEGALBOTO 2026 - Dokumen dihasilkan otomatis", margin, fy);
      pdf.text(`Halaman ${pageNum}`, pageWidth - margin, fy, { align: "right" });
    }

    function drawRows(startY: number, startIdx: number): { endY: number; lastIdx: number } {
      let y = startY;
      let i = startIdx;

      while (i < rows.length) {
        if (y + rowH > pageHeight - margin - 15) {
          return { endY: y, lastIdx: i };
        }

        const row = rows[i];

        if (row.isTotal) {
          pdf.setFillColor(...GREEN);
          pdf.rect(margin, y, totalColW, rowH, "F");
          pdf.setTextColor(...WHITE);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.text("TOTAL", margin + 2, y + rowH / 2, { baseline: "middle" });
          pdf.text("100", colX("no", "komp", "sub", "cap") + 1, y + rowH / 2, { baseline: "middle" });

          const kemX = colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach");
          pdf.text(row.kem, kemX + colW.kem / 2, y + rowH / 2, { align: "center", baseline: "middle" });
          pdf.text(row.hari, kemX + colW.kem + colW.hari / 2, y + rowH / 2, { align: "center", baseline: "middle" });
          pdf.text(row.delta, kemX + colW.kem + colW.hari + colW.delta / 2, y + rowH / 2, { align: "center", baseline: "middle" });
        } else {
          pdf.setFillColor(i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245, i % 2 === 0 ? 255 : 245);
          pdf.rect(margin, y, totalColW, rowH, "F");
          pdf.setDrawColor(230, 230, 230);
          pdf.setLineWidth(0.2);
          pdf.line(margin, y + rowH, margin + totalColW, y + rowH);

          pdf.setFontSize(6);
          if (row.isInactive) {
            pdf.setTextColor(180, 180, 180);
          } else {
            pdf.setTextColor(...BLACK);
          }

          // NO
          pdf.setFont(row.no ? "helvetica" : "helvetica", row.no ? "bold" : "normal");
          pdf.text(row.no, colX("no") + colW.no / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // KOMPONEN
          if (row.komp) { pdf.setFont("helvetica", "bold"); pdf.text(row.komp, colX("no", "komp") + 2, y + rowH / 2, { baseline: "middle" }); }

          // SUB KOMPONEN
          pdf.setFont("helvetica", "normal");
          pdf.text(row.sub, colX("no", "komp", "sub") + 2, y + rowH / 2, { baseline: "middle" });

          // CAPPING
          pdf.setTextColor(...GRAY_TEXT);
          pdf.text(row.cap, colX("no", "komp", "sub", "cap") + colW.cap / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // BOBOT
          if (!row.isInactive) { pdf.setTextColor(...BLACK); pdf.setFont("helvetica", "bold"); }
          pdf.text(row.bobot, colX("no", "komp", "sub", "cap", "bobot") + colW.bobot / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // RKAP, EXCEED, REALISASI
          pdf.setFont("helvetica", "normal");
          if (!row.isInactive) pdf.setTextColor(...BLACK);
          pdf.text(row.rkap, colX("no", "komp", "sub", "cap", "bobot", "rkap") + colW.rkap - 2, y + rowH / 2, { align: "right", baseline: "middle" });
          pdf.text(row.exceed, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed") + colW.exceed - 2, y + rowH / 2, { align: "right", baseline: "middle" });
          pdf.text(row.real, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real") + colW.real - 2, y + rowH / 2, { align: "right", baseline: "middle" });

          // ACH
          if (!row.isInactive) { pdf.setTextColor(...getAchColorHex(row.achPct)); pdf.setFont("helvetica", row.achPct >= 100 ? "bold" : "normal"); }
          pdf.text(row.ach, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach") + colW.ach / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // KPI KEMARIN & HARI INI
          if (!row.isInactive) pdf.setTextColor(...BLACK);
          pdf.setFont("helvetica", "normal");
          pdf.text(row.kem, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem") + colW.kem / 2, y + rowH / 2, { align: "center", baseline: "middle" });
          if (!row.isInactive) pdf.setFont("helvetica", "bold");
          pdf.text(row.hari, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari") + colW.hari / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // DELTA
          if (!row.isInactive) {
            pdf.setTextColor(row.deltaVal > 0 ? 5 : row.deltaVal < 0 ? 220 : 180, row.deltaVal > 0 ? 150 : row.deltaVal < 0 ? 38 : 180, row.deltaVal > 0 ? 105 : row.deltaVal < 0 ? 38 : 180);
          }
          pdf.setFont("helvetica", "normal");
          pdf.text(row.delta, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta") + colW.delta / 2, y + rowH / 2, { align: "center", baseline: "middle" });

          // SELISIH RKAP
          if (!row.isInactive) pdf.setTextColor(row.selRkapVal >= 0 ? 5 : 220, row.selRkapVal >= 0 ? 150 : 38, row.selRkapVal >= 0 ? 105 : 38);
          pdf.text(row.selRkap, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRkap") + colW.selRkap - 2, y + rowH / 2, { align: "right", baseline: "middle" });

          // SELISIH EXCEED
          if (!row.isInactive) pdf.setTextColor(row.selExVal >= 0 ? 5 : 220, row.selExVal >= 0 ? 150 : 38, row.selExVal >= 0 ? 105 : 38);
          pdf.text(row.selEx, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRkap", "selEx") + colW.selEx - 2, y + rowH / 2, { align: "right", baseline: "middle" });
        }

        y += rowH;
        i++;
      }
      return { endY: y, lastIdx: i };
    }

    // BUILD
    let y = drawPageHeader(margin + 2) + 2;
    y = drawHeader(y) + 1;

    let rowIdx = 0;
    let pageNum = 1;
    drawPageFooter(pageNum);

    while (rowIdx < rows.length) {
      const result = drawRows(y, rowIdx);
      rowIdx = result.lastIdx;
      if (rowIdx < rows.length) {
        pdf.addPage();
        pageNum++;
        y = drawHeader(margin + 2) + 1;
        drawPageFooter(pageNum);
      }
      y = result.endY;
    }

    // Return as downloadable PDF
    const pdfBytes = pdf.output("arraybuffer");
    const unitShort = unitLabel.replace(/\s+/g, "_");
    const dateFile = date.replace(/\s+/g, "_");
    const filename = `KPI_${unitShort}_${dateFile}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}