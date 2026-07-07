import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// ── Minimal PDF builder (zero dependencies, pure string concatenation) ──

class SimplePDF {
  private buf: string[] = [];
  private objCount = 0;
  private pages: { objs: string[]; height: number }[] = [];
  private currentPage: string[] = [];
  private currentY = 0;
  private pageHeight = 210;
  private pageWidth = 297;
  private margin = 10;
  private fontSize = 7;
  private fontName = "Helvetica";

  private addObj(content: string): number {
    const n = ++this.objCount;
    this.buf.push(`${n} 0 obj\n${content}\nendobj`);
    return n;
  }

  newPage() {
    if (this.currentPage.length > 0) {
      this.pages.push({ objs: this.currentPage, height: this.pageHeight });
    }
    this.currentPage = [];
    this.currentY = this.pageHeight - this.margin;
  }

  setFontSize(size: number) { this.fontSize = size; }
  get currentHeight() { return this.currentY; }

  private escText(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  text(text: string, x: number, y: number, opts?: { align?: "left" | "center" | "right"; bold?: boolean }) {
    const font = opts?.bold ? "Helvetica-Bold" : this.fontName;
    const fs = this.fontSize;
    let tx = x;
    if (opts?.align === "center") tx = x; // caller handles centering
    if (opts?.align === "right") tx = x; // caller handles right-align
    const pdfY = y; // already in PDF coords (bottom-up)
    this.currentPage.push(`BT /${font} ${fs} Tf ${tx} ${pdfY} Td (${this.escText(text)}) Tj ET`);
  }

  rect(x: number, y: number, w: number, h: number, fillColor?: [number, number, number], strokeColor?: [number, number, number]) {
    const ops: string[] = [];
    if (fillColor) {
      ops.push(`${fillColor[0] / 255} ${fillColor[1] / 255} ${fillColor[2] / 255} rg`);
    }
    if (strokeColor) {
      ops.push(`${strokeColor[0] / 255} ${strokeColor[1] / 255} ${strokeColor[2] / 255} RG 0.3 w`);
    }
    ops.push(`${x} ${y} ${w} ${h} re`);
    if (fillColor && strokeColor) ops.push("B");
    else if (fillColor) ops.push("f");
    else if (strokeColor) ops.push("S");
    this.currentPage.push(ops.join(" "));
  }

  line(x1: number, y1: number, x2: number, y2: number, color?: [number, number, number]) {
    if (color) {
      this.currentPage.push(`${color[0] / 255} ${color[1] / 255} ${color[2] / 255} RG 0.3 w`);
    }
    this.currentPage.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  setFont(bold: boolean) {
    this.fontName = bold ? "Helvetica-Bold" : "Helvetica";
  }

  getYForText(rowH: number): number {
    // Returns PDF Y coordinate (bottom-up) for current position
    return this.currentY;
  }

  advanceY(amount: number) {
    this.currentY -= amount;
  }

  needsNewPage(neededHeight: number): boolean {
    return this.currentY - neededHeight < this.margin + 10;
  }

  build(filename: string): Uint8Array {
    this.newPage(); // flush last page

    const catalogNum = 1;
    const pagesNum = 2;

    // Build page objects
    const pageObjNums: number[] = [];
    const contentObjNums: number[] = [];
    const fontNums: [number, number] = [0, 0]; // [helvetica, helvetica-bold]

    // Register fonts ( objs 3, 4 )
    fontNums[0] = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    fontNums[1] = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    // Build page content streams and page objects
    for (const page of this.pages) {
      const content = page.objs.join("\n");
      const contentNum = this.addObj(
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
      );
      contentObjNums.push(contentNum);

      const pageNum = this.addObj(
        `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${this.pageWidth} ${page.height}] ` +
        `/Contents ${contentNum} 0 R ` +
        `/Resources << /Font << /F1 ${fontNums[0]} 0 R /F2 ${fontNums[1]} 0 R >> >> >>`
      );
      pageObjNums.push(pageNum);
    }

    // Pages object
    const kids = pageObjNums.map(n => `${n} 0 R`).join(" ");
    this.buf.splice(1, 0, `${pagesNum} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjNums.length} >>\nendobj`);
    // Re-number: we inserted at position 1, so shift all object numbers after 1
    // Actually, let's just rebuild cleanly

    // Clean rebuild with proper numbering
    this.buf = [];
    this.objCount = 0;

    const obj1 = this.addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const obj2 = this.addObj(`<< /Type /Pages /Kids [${pageObjNums.map((_, i) => `${i + 4} 0 R`).join(" ")}] /Count ${this.pages.length} >>`);
    const obj3 = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const obj4 = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    // Rebuild content streams and page objects
    const newContentNums: number[] = [];
    for (let i = 0; i < this.pages.length; i++) {
      const content = this.pages[i].objs.join("\n");
      const cn = this.addObj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      newContentNums.push(cn);

      this.addObj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pages[i].height}] ` +
        `/Contents ${cn} 0 R ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      );
    }

    // Assemble PDF
    const objects = this.buf.join("\n");
    let pdf = `%PDF-1.4\n`;
    const offsets: number[] = [];

    const lines = objects.split("\n");
    for (const line of lines) {
      if (line.match(/^\d+ 0 obj$/)) {
        offsets.push(pdf.length);
      }
      pdf += line + "\n";
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${this.objCount + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 0; i < this.objCount; i++) {
      pdf += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${this.objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const encoder = new TextEncoder();
    return encoder.encode(pdf);
  }
}

// ── KPI Data helpers ──

import type { KpiUnit } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "@/lib/kpi-types";

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

// Approximate text width (Helvetica ~0.52 * fontSize per char)
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

// ── Main handler ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit, unitLabel, date, prevUnit, compareLabel } = body as {
      unit: KpiUnit; unitLabel: string; date: string; prevUnit?: KpiUnit; compareLabel?: string;
    };

    const pdf = new SimplePDF();
    const m = pdf["margin"] as number;
    const pw = pdf["pageWidth"] as number;
    const ph = pdf["pageHeight"] as number;

    const GREEN = [0, 134, 61] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    const LGRAY = [240, 240, 240] as [number, number, number];
    const GRAY = [100, 100, 100] as [number, number, number];
    const BLACK = [30, 30, 30] as [number, number, number];

    // Column widths (total ~277mm)
    const colW = { no: 8, komp: 36, sub: 42, cap: 14, bobot: 14, rkap: 26, exceed: 26, real: 26, ach: 14, kem: 12, hari: 12, delta: 12, selRkap: 20, selEx: 20 };
    const colKeys = Object.keys(colW) as (keyof typeof colW)[];
    const totalCW = Object.values(colW).reduce((a, b) => a + b, 0);

    function colX(...keys: (keyof typeof colW)[]) { return m + keys.reduce((s, k) => s + colW[k], 0); }

    const rows = buildRows(unit, prevUnit);
    const headerH = 12;
    const rowH = 6.5;

    function drawHeader() {
      const y = pdf.currentHeight;
      // Green header background
      pdf.rect(m, y - headerH, totalCW, headerH, GREEN);

      pdf.setFontSize(6.5);
      const headers = [
        { t: "NO", k: ["no"] }, { t: "KOMPONEN KPI", k: ["no", "komp"] },
        { t: "SUB KOMPONEN KPI", k: ["no", "komp", "sub"] },
        { t: "CAPPING", k: ["no", "komp", "sub", "cap"] },
        { t: "BOBOT", k: ["no", "komp", "sub", "cap", "bobot"] },
        { t: "TARGET", k: ["no", "komp", "sub", "cap", "bobot", "rkap"], span: 2 },
        { t: "REALISASI", k: ["no", "komp", "sub", "cap", "bobot", "rkap", "exceed"] },
        { t: "ACH(%)", k: ["no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real"] },
        { t: "KPI TAHUNAN", k: ["no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach"], span: 2 },
        { t: "DELTA", k: ["no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem"] },
        { t: "SELISIH TARGET", k: ["no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta"], span: 2 },
      ];

      headers.forEach((h) => {
        const x = colX(...h.k);
        const w = h.span ? colKeys.slice(colKeys.indexOf(h.k[0]) + 1).slice(0, h.span).reduce((s, k) => s + colW[k], 0) + colW[h.k[0]] : colW[h.k[h.k.length - 1]];
        // Actually simpler: just use the total width from this col to the next header's start
        pdf.text(h.t, x + 1, y - 3.5, { bold: true });
      });

      pdf.currentY -= headerH;
    }

    function drawPageHeader() {
      // Title
      pdf.setFontSize(14);
      pdf.setFont(true);
      pdf.text("MONEV KPI / TEGALBOTO 2026", m, ph - m);

      pdf.setFontSize(8);
      pdf.setFont(false);
      pdf.text("Laporan Monitoring Kinerja", m, ph - m - 6);

      // Period right-aligned
      pdf.setFontSize(7);
      pdf.text("Periode", pw - m - 50, ph - m);
      pdf.setFontSize(10);
      pdf.setFont(true);
      pdf.text(date, pw - m - 50, ph - m - 6);

      // Green line
      pdf.line(m, ph - m - 11, pw - m, ph - m - 11, GREEN);

      // Unit name
      pdf.setFontSize(10);
      pdf.text(unitLabel, m, ph - m - 16);

      // KPI score
      const kpiText = unit.total_kpi.toFixed(2);
      const kpiColor = unit.total_kpi >= 85 ? [5, 150, 105] : unit.total_kpi >= 70 ? [217, 119, 6] : unit.total_kpi >= 55 ? [234, 88, 12] : [220, 38, 38];
      const bw = textWidth(kpiText, 10) + 8;
      const badgeX = m + textWidth(unitLabel, 10) + 6;
      pdf.rect(badgeX, ph - m - 20, bw, 6, kpiColor as [number, number, number]);
      pdf.text(kpiText, badgeX + 4, ph - m - 16.5);

      if (compareLabel) {
        pdf.setFontSize(7);
        pdf.setFont(false);
        pdf.text(`Bandingkan: ${compareLabel}`, badgeX + bw + 6, ph - m - 16);
      }

      pdf.setFontSize(7);
      pdf.text(`${unit.components.length} komponen KPI`, m, ph - m - 22);

      pdf.currentY = ph - m - 30;
    }

    function drawFooter(pageNum: number) {
      const fy = m + 4;
      pdf.line(m, fy + 4, pw - m, fy + 4, [200, 200, 200]);
      pdf.setFontSize(5);
      pdf.text("MONEV KPI TEGALBOTO 2026 - Dokumen otomatis", m, fy);
      pdf.text(`Hal ${pageNum}`, pw - m - 15, fy);
    }

    // ── Build PDF ──
    drawPageHeader();
    drawHeader();

    let pageNum = 1;
    drawFooter(pageNum);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (pdf.needsNewPage(rowH + 2)) {
        pdf.newPage();
        pageNum++;
        drawHeader();
        drawFooter(pageNum);
      }

      const y = pdf.currentHeight;

      if (row.isTotal) {
        pdf.rect(m, y - rowH, totalCW, rowH, GREEN);
        pdf.setFontSize(7);
        pdf.text("TOTAL", m + 2, y - 2.5);
        pdf.text("100", colX("no", "komp", "sub", "cap") + 1, y - 2.5);
        pdf.text(row.kem, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach") + 2, y - 2.5);
        pdf.text(row.hari, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem") + 2, y - 2.5);
        pdf.text(row.delta, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta") + 2, y - 2.5);
      } else {
        if (i % 2 === 1) pdf.rect(m, y - rowH, totalCW, rowH, LGRAY);
        pdf.line(m, y - rowH, m + totalCW, y - rowH, [230, 230, 230]);

        pdf.setFontSize(5.5);
        if (row.no) pdf.setFont(true); else pdf.setFont(false);
        pdf.text(row.no, colX("no") + 3, y - 2.5);

        if (row.komp) { pdf.setFont(true); pdf.text(row.komp, colX("no", "komp") + 1, y - 2.5); }
        pdf.setFont(false);
        pdf.text(row.sub, colX("no", "komp", "sub") + 1, y - 2.5);

        pdf.text(row.cap, colX("no", "komp", "sub", "cap") + 3, y - 2.5);
        if (!row.isInactive) pdf.setFont(true);
        pdf.text(row.bobot, colX("no", "komp", "sub", "cap", "bobot") + 3, y - 2.5);

        pdf.setFont(false);
        // Right-aligned numbers
        const rkapX = colX("no", "komp", "sub", "cap", "bobot", "rkap") + colW.rkap - 2;
        const exceedX = colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed") + colW.exceed - 2;
        const realX = colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real") + colW.real - 2;
        pdf.text(row.rkap, rkapX, y - 2.5);
        pdf.text(row.exceed, exceedX, y - 2.5);
        pdf.text(row.real, realX, y - 2.5);

        // ACH
        if (!row.isInactive) pdf.setFont(row.achPct >= 100);
        pdf.text(row.ach, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach") + 3, y - 2.5);

        pdf.setFont(false);
        pdf.text(row.kem, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem") + 2, y - 2.5);
        if (!row.isInactive) pdf.setFont(true);
        pdf.text(row.hari, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari") + 2, y - 2.5);

        pdf.setFont(false);
        pdf.text(row.delta, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta") + 2, y - 2.5);
        pdf.text(row.selRkap, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRkap") + colW.selRkap - 2, y - 2.5);
        pdf.text(row.selEx, colX("no", "komp", "sub", "cap", "bobot", "rkap", "exceed", "real", "ach", "kem", "hari", "delta", "selRkap", "selEx") + colW.selEx - 2, y - 2.5);
      }

      pdf.currentY -= rowH;
    }

    const unitShort = unitLabel.replace(/\s+/g, "_");
    const dateFile = date.replace(/\s+/g, "_");
    const filename = `KPI_${unitShort}_${dateFile}.pdf`;

    const pdfBytes = pdf.build(filename);

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