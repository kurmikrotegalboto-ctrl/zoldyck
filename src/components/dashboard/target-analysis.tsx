"use client";

import { useState, useMemo } from "react";
import {
  Target, Clock, ChevronRight, ChevronDown,
  Medal, Flame, ShieldCheck, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Check, Infinity, Zap,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CAPPING_MAP } from "@/lib/kpi-types";
import type { KpiUnit } from "@/lib/kpi-types";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constants ───────────────────────────────────────────────────────────

const UNIT_LABELS: Record<string, string> = {
  "14200_UPC": "UPC Tegalboto",
  "14200_CP": "CP Tegalboto",
  "14201": "Basuki Rahmad",
  "14202": "S. Parman",
  "14204": "Kalisat",
  "14205": "Mayang",
  "17506": "Colo Sumberjati",
};

// NPL/LAR: lower realisasi = better (ACH = target/realisasi)
const INVERSE_COMPONENTS = new Set([
  "NPL GADAI", "NPL NON GADAI", "NPL EMAS",
  "LAR GADAI", "LAR NON GADAI", "LAR EMAS",
]);

// ─── Working days ────────────────────────────────────────────────────────

function calcWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function getRemainingWorkDays(): { days: number; weeks: number; pctYear: number } {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const totalWorkDays = calcWorkingDays(yearStart, yearEnd);
  const elapsedWorkDays = calcWorkingDays(yearStart, now);
  const remainingWorkDays = calcWorkingDays(now, yearEnd);
  return {
    days: remainingWorkDays,
    weeks: Math.round((remainingWorkDays / 6) * 10) / 10,
    pctYear: Math.round(((elapsedWorkDays / totalWorkDays) * 100) * 10) / 10,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────

interface StrategyRow {
  name: string;
  satuan: string;
  bobot: number;
  isUnlimited: boolean;
  isInverse: boolean;
  currentAch: number;       // e.g. 93.68
  targetAch: number;        // 110, 115, or 120
  targetLabel: string;      // "Exceed" | "Super Exceed"
  gapInSatuan: number;      // positive = need to close (increase for normal, decrease for inverse)
  dailyTarget: number;
  status: "chase" | "super_chase" | "achieved";
}

interface UnitOverview {
  unit: KpiUnit;
  label: string;
  totalKpi: number;
  gapTo110: number;
  gapTo115: number;
  cappedMaxed: number;
  cappedTotal: number;
  cappedGapPotential: number;
  unlimitedCurrent: number;
  unlimitedCount: number;
}

// ─── Number formatting ──────────────────────────────────────────────────

function fmtVal(value: number, satuan: string): string {
  const abs = Math.abs(value);
  if (satuan === "Rp") {
    return `Rp ${Math.round(abs).toLocaleString("id-ID")}`;
  }
  if (satuan === "Jumlah") {
    return Math.round(abs).toLocaleString("id-ID");
  }
  if (satuan === "Gramasi") {
    return `${abs.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gram`;
  }
  if (satuan === "%") {
    return `${abs.toFixed(2).replace(".", ",")}%`;
  }
  return abs.toFixed(2);
}

function fmtDaily(value: number, satuan: string, isInverse: boolean): string {
  if (value === 0) return "-";
  const abs = Math.abs(value);
  const arrow = isInverse ? "\u2193" : "\u2191";
  if (satuan === "Rp") {
    return `${arrow} Rp ${Math.round(abs).toLocaleString("id-ID")}/hari`;
  }
  if (satuan === "Jumlah") {
    return `${arrow} ${Math.round(abs).toLocaleString("id-ID")}/hari`;
  }
  if (satuan === "Gramasi") {
    return `${arrow} ${abs.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gram/hari`;
  }
  if (satuan === "%") {
    return `${arrow} ${abs.toFixed(4).replace(".", ",")}%/hari`;
  }
  return `${arrow} ${abs.toFixed(2)}/hari`;
}

function satuanBadgeCls(satuan: string): string {
  if (satuan === "Rp") return "bg-teal-50 text-teal-700 ring-teal-200";
  if (satuan === "Jumlah") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (satuan === "Gramasi") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (satuan === "%") return "bg-purple-50 text-purple-700 ring-purple-200";
  return "bg-gray-50 text-gray-700 ring-gray-200";
}

// ─── Strategy table builder ─────────────────────────────────────────────

function buildStrategyRows(unit: KpiUnit, workDays: number): StrategyRow[] {
  const rows: StrategyRow[] = [];

  for (const c of unit.components) {
    if (c.bobot === 0) continue;
    const cap = CAPPING_MAP[c.kpi_name];
    if (cap === "-") continue;

    const isUnlimited = cap === "Unlimited";
    const isInverse = INVERSE_COMPONENTS.has(c.kpi_name);
    const achPct = Math.round(c.ach * 1000) / 10; // e.g. 93.68

    let targetAch: number;
    let targetLabel: string;
    let status: StrategyRow["status"];

    if (isUnlimited) {
      if (achPct >= 120) {
        targetAch = 120; targetLabel = "Super Exceed"; status = "achieved";
      } else {
        targetAch = 120; targetLabel = "Exceed"; status = "chase";
      }
    } else {
      // Capped
      if (achPct >= 115) {
        targetAch = 115; targetLabel = "Super Exceed"; status = "achieved";
      } else if (achPct >= 110) {
        targetAch = 115; targetLabel = "Super Exceed"; status = "super_chase";
      } else {
        targetAch = 110; targetLabel = "Exceed"; status = "chase";
      }
    }

    // Required realisasi to achieve targetAch
    let requiredRealisasi: number;
    if (isInverse) {
      requiredRealisasi = c.target / (targetAch / 100);
    } else {
      requiredRealisasi = c.target * (targetAch / 100);
    }

    // Gap in satuan
    let gap: number;
    if (isInverse) {
      gap = c.realisasi - requiredRealisasi; // positive = still too high
    } else {
      gap = requiredRealisasi - c.realisasi; // positive = need more
    }

    if (gap <= 0) {
      status = "achieved";
      gap = 0;
    }

    const dailyTarget = workDays > 0 ? gap / workDays : 0;

    rows.push({
      name: c.kpi_name,
      satuan: c.satuan,
      bobot: c.bobot,
      isUnlimited,
      isInverse,
      currentAch: achPct,
      targetAch,
      targetLabel,
      gapInSatuan: Math.round(gap * 100) / 100,
      dailyTarget: Math.round(dailyTarget * 100) / 100,
      status,
    });
  }

  // Sort: chase first (biggest gap), then super_chase (biggest gap), then achieved
  const order: Record<string, number> = { chase: 0, super_chase: 1, achieved: 2 };
  rows.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.gapInSatuan - a.gapInSatuan;
  });

  return rows;
}

// ─── Overview analysis (lightweight) ─────────────────────────────────────

function analyzeOverview(unit: KpiUnit): UnitOverview {
  let cappedMaxed = 0, cappedTotal = 0, cappedCurrent = 0, cappedMaxTotal = 0;
  let unlimitedCurrent = 0, unlimitedCount = 0;

  for (const c of unit.components) {
    if (c.bobot === 0) continue;
    const cap = CAPPING_MAP[c.kpi_name];
    if (cap === "Unlimited") {
      unlimitedCount++;
      unlimitedCurrent += c.kpi_score;
    } else if (cap === "110") {
      cappedTotal++;
      cappedCurrent += c.kpi_score;
      const maxScore = c.bobot * 1.1;
      cappedMaxTotal += maxScore;
      if (c.ach >= 1.10) cappedMaxed++;
    }
  }

  return {
    unit,
    label: UNIT_LABELS[unit.code] || unit.name,
    totalKpi: unit.total_kpi,
    gapTo110: Math.round((110 - unit.total_kpi) * 100) / 100,
    gapTo115: Math.round((115 - unit.total_kpi) * 100) / 100,
    cappedMaxed,
    cappedTotal,
    cappedGapPotential: Math.round((cappedMaxTotal - cappedCurrent) * 100) / 100,
    unlimitedCurrent: Math.round(unlimitedCurrent * 100) / 100,
    unlimitedCount,
  };
}

// ─── Color helpers ───────────────────────────────────────────────────────

function kpiScoreColor(score: number): string {
  if (score >= 110) return "text-emerald-600";
  if (score >= 100) return "text-emerald-600";
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  if (score >= 55) return "text-orange-600";
  return "text-red-600";
}

function statusBadge(score: number): { label: string; cls: string } {
  if (score >= 115) return { label: "Super Exceed", cls: "bg-amber-100 text-amber-700 border-0" };
  if (score >= 110) return { label: "Exceed", cls: "bg-emerald-100 text-emerald-700 border-0" };
  if (score >= 100) return { label: "Tercapai", cls: "bg-emerald-100 text-emerald-700 border-0" };
  if (score >= 85) return { label: "Baik", cls: "bg-blue-100 text-blue-700 border-0" };
  if (score >= 70) return { label: "Cukup", cls: "bg-amber-100 text-amber-700 border-0" };
  if (score >= 55) return { label: "Perlu Perhatian", cls: "bg-orange-100 text-orange-700 border-0" };
  return { label: "Kritis", cls: "bg-red-100 text-red-700 border-0" };
}

function achBarColor(ach: number): string {
  if (ach >= 110) return "bg-emerald-500";
  if (ach >= 100) return "bg-emerald-400";
  if (ach >= 80) return "bg-amber-400";
  if (ach >= 50) return "bg-orange-400";
  return "bg-red-400";
}

function achTextColor(ach: number): string {
  if (ach >= 110) return "text-emerald-600";
  if (ach >= 100) return "text-emerald-600";
  if (ach >= 80) return "text-amber-600";
  if (ach >= 50) return "text-orange-600";
  return "text-red-600";
}

// ─── UNIT DETAIL PANEL ───────────────────────────────────────────────────

type SortMode = "gap_desc" | "ach_asc" | "ach_desc" | "bobot_desc" | "name_asc";

const SORT_OPTIONS: { value: SortMode; label: string; icon: typeof ArrowUpDown; desc: string }[] = [
  { value: "gap_desc",  label: "Gap Terbesar",  icon: ArrowUpDown, desc: "Gap terbesar ke terkecil" },
  { value: "ach_asc",   label: "ACH Terendah",   icon: ArrowUp,     desc: "ACH terendah ke tertinggi" },
  { value: "ach_desc",  label: "ACH Tertinggi",  icon: ArrowDown,   desc: "ACH tertinggi ke terendah" },
  { value: "bobot_desc", label: "Bobot Terbesar", icon: ArrowUpDown, desc: "Bobot terbesar ke terkecil" },
  { value: "name_asc",  label: "Nama A-Z",       icon: Filter,     desc: "Urutkan nama komponen" },
];

function UnitDetailPanel({ analysis, workDays }: { analysis: UnitOverview; workDays: number }) {
  const [sortMode, setSortMode] = useState<SortMode>("gap_desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "chase" | "super_chase" | "achieved">("all");

  const rawRows = useMemo(() => buildStrategyRows(analysis.unit, workDays), [analysis.unit, workDays]);

  const rows = useMemo(() => {
    let filtered = rawRows;
    if (statusFilter !== "all") {
      filtered = rawRows.filter(r => r.status === statusFilter);
    }
    const sorted = [...filtered];
    switch (sortMode) {
      case "ach_asc":
        sorted.sort((a, b) => a.currentAch - b.currentAch);
        break;
      case "ach_desc":
        sorted.sort((a, b) => b.currentAch - a.currentAch);
        break;
      case "bobot_desc":
        sorted.sort((a, b) => b.bobot - a.bobot || b.gapInSatuan - a.gapInSatuan);
        break;
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "id"));
        break;
      case "gap_desc":
      default:
        // Original sort: chase → super_chase → achieved, then by gap desc
        const order: Record<string, number> = { chase: 0, super_chase: 1, achieved: 2 };
        sorted.sort((a, b) => {
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
          return b.gapInSatuan - a.gapInSatuan;
        });
        break;
    }
    return sorted;
  }, [rawRows, sortMode, statusFilter]);

  const chaseRows = rawRows.filter(r => r.status === "chase");
  const superChaseRows = rawRows.filter(r => r.status === "super_chase");
  const achievedRows = rawRows.filter(r => r.status === "achieved");

  // Running total poin simulation: shows cumulative KPI if each component is optimized in order
  const simulationData = useMemo(() => {
    const unit = analysis.unit;
    const currentTotal = analysis.totalKpi;
    let running = currentTotal;
    const steps: { name: string; gain: number; cumulative: number; milestone?: string }[] = [];
    // Always use rawRows (gap-desc order) for simulation to show optimal path
    for (const r of rawRows) {
      if (r.status === "achieved") {
        steps.push({ name: r.name, gain: 0, cumulative: running });
        continue;
      }
      const comp = unit.components.find(c => c.kpi_name === r.name);
      if (!comp) continue;
      let gain: number;
      const cap = CAPPING_MAP[r.name];
      if (cap === "Unlimited") {
        const targetScore = comp.bobot * (r.targetAch / 100);
        gain = Math.max(0, targetScore - comp.kpi_score);
      } else {
        const maxScore = comp.bobot * 1.10;
        gain = Math.max(0, maxScore - comp.kpi_score);
      }
      running += gain;
      const milestone = running >= 115 ? "115!" : running >= 110 ? "110!" : undefined;
      steps.push({ name: r.name, gain: Math.round(gain * 100) / 100, cumulative: Math.round(running * 100) / 100, milestone });
    }
    return steps;
  }, [rawRows, analysis.unit, analysis.totalKpi]);

  // Pre-compute urgent set (top 3 chase by gap) for row highlighting
  const urgentChaseNames = useMemo(
    () => new Set(rawRows.filter(r => r.status === "chase").slice(0, 3).map(r => r.name)),
    [rawRows]
  );

  // ─── Download Excel ──────────────────────────────────────────────────
  const handleDownload = () => {
    const unit = analysis.unit;
    const label = analysis.label;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

    // Build sheet rows from rawRows (always gap-desc order)
    const statusLabel = (s: string) => s === "chase" ? "Chase Exceed" : s === "super_chase" ? "Chase Super Exceed" : "Sudah Capai";
    const gapStr = (r: StrategyRow) => {
      if (r.status === "achieved") return "-";
      const abs = Math.abs(r.gapInSatuan);
      if (r.satuan === "Rp") return `Rp ${Math.round(abs).toLocaleString("id-ID")}`;
      if (r.satuan === "Jumlah") return Math.round(abs).toLocaleString("id-ID");
      if (r.satuan === "Gramasi") return `${abs.toLocaleString("id-ID", {minimumFractionDigits:1, maximumFractionDigits:1})} gram`;
      if (r.satuan === "%") return `${abs.toFixed(2).replace(".",",")}%`;
      return String(abs);
    };
    const dailyStr = (r: StrategyRow) => {
      if (r.status === "achieved") return "Sudah Capai";
      const abs = Math.abs(r.dailyTarget);
      const arrow = r.isInverse ? "↓" : "↑";
      if (r.satuan === "Rp") return `${arrow} Rp ${Math.round(abs).toLocaleString("id-ID")}/hari`;
      if (r.satuan === "Jumlah") return `${arrow} ${Math.round(abs).toLocaleString("id-ID")}/hari`;
      if (r.satuan === "Gramasi") return `${arrow} ${abs.toLocaleString("id-ID", {minimumFractionDigits:1, maximumFractionDigits:1})} gram/hari`;
      if (r.satuan === "%") return `${arrow} ${abs.toFixed(4).replace(".",",")}%/hari`;
      return `${arrow} ${abs.toFixed(2)}/hari`;
    };

    const headerRow = ["No", "Komponen", "Satuan", "Bobot", "ACH (%)", "Target (%)", "Label Target", "Status", "Gap (Satuan)", "Target / Hari", "Poin Gain", "KPI Kumulatif"];
    const dataRows = rawRows.map((r, i) => {
      const sim = simulationData.find(s => s.name === r.name);
      return [
        i + 1,
        r.name,
        r.satuan,
        r.bobot,
        r.currentAch,
        r.targetAch,
        r.targetLabel,
        statusLabel(r.status),
        gapStr(r),
        dailyStr(r),
        sim ? sim.gain : 0,
        sim ? sim.cumulative : analysis.totalKpi,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      // Title rows
      [`Gap Analysis KPI - ${label}`],
      [`Tanggal: ${dateStr}  |  Sisa Hari Kerja: ${workDays}  |  Skor KPI: ${analysis.totalKpi.toFixed(2)}`],
      [],
      headerRow,
      ...dataRows,
      [],
      [`Chase Exceed: ${chaseRows.length}  |  Chase Super Exceed: ${superChaseRows.length}  |  Sudah Capai: ${achievedRows.length}`],
    ]);

    // Column widths
    ws["!cols"] = [
      { wch: 4 },   // No
      { wch: 28 },  // Komponen
      { wch: 10 },  // Satuan
      { wch: 7 },   // Bobot
      { wch: 10 },  // ACH
      { wch: 10 },  // Target
      { wch: 16 },  // Label
      { wch: 20 },  // Status
      { wch: 30 },  // Gap
      { wch: 35 },  // Daily
      { wch: 12 },  // Gain
      { wch: 14 },  // Cumul
    ];

    // Merge title
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gap Analysis");
    XLSX.writeFile(wb, `Gap Analysis ${label} ${dateStr}.xlsx`);
  };

  // ─── Download PDF ────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const label = analysis.label;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const tglIndo = `${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "normal");

    // ── Title bar ──
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Gap Analysis KPI - ${label}`, 10, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal: ${tglIndo}  |  Sisa Hari Kerja: ${workDays} hari  |  Skor KPI: ${analysis.totalKpi.toFixed(2)}`, 10, 17);

    // ── Summary line ──
    const sumY = 28;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`Chase Exceed: ${chaseRows.length}`, 10, sumY);
    doc.setTextColor(217, 119, 6);
    doc.text(`Chase Super Exceed: ${superChaseRows.length}`, 80, sumY);
    doc.setTextColor(5, 150, 105);
    doc.text(`Sudah Capai: ${achievedRows.length}`, 170, sumY);

    // ── Helpers: NO unicode arrows, use ASCII-safe text ──
    const statusLabel = (s: string) => s === "chase" ? "Chase Exceed" : s === "super_chase" ? "Chase Super" : "Capai";
    const fmtNum = (n: number) => Math.round(n).toLocaleString("id-ID");
    const fmtGap = (r: StrategyRow) => {
      if (r.status === "achieved") return "-";
      const abs = Math.abs(r.gapInSatuan);
      if (r.satuan === "Rp") return `Rp ${fmtNum(abs)}`;
      if (r.satuan === "Jumlah") return fmtNum(abs);
      if (r.satuan === "Gramasi") return `${abs.toLocaleString("id-ID", {minimumFractionDigits:1, maximumFractionDigits:1})} g`;
      if (r.satuan === "%") return `${abs.toFixed(2).replace(".",",")}%`;
      return abs.toFixed(2);
    };
    const fmtDly = (r: StrategyRow) => {
      if (r.status === "achieved") return "Sudah Capai";
      const abs = Math.abs(r.dailyTarget);
      const dir = r.isInverse ? "TURUN" : "NAIK";
      if (r.satuan === "Rp") return `${dir} Rp ${fmtNum(abs)}/hari`;
      if (r.satuan === "Jumlah") return `${dir} ${fmtNum(abs)}/hari`;
      if (r.satuan === "Gramasi") return `${dir} ${abs.toLocaleString("id-ID", {minimumFractionDigits:1, maximumFractionDigits:1})} g/hari`;
      if (r.satuan === "%") return `${dir} ${abs.toFixed(4).replace(".",",")}%/hari`;
      return `${dir} ${abs.toFixed(2)}/hari`;
    };

    // ── Build table body ──
    const tableBody = rawRows.map((r, i) => {
      const sim = simulationData.find(s => s.name === r.name);
      return [
        i + 1,
        r.name,
        r.satuan,
        r.bobot,
        r.currentAch.toFixed(1) + "%",
        r.targetAch + "%",
        r.targetLabel,
        statusLabel(r.status),
        fmtGap(r),
        fmtDly(r),
        sim ? "+" + sim.gain.toFixed(2) : "0.00",
        sim ? sim.cumulative.toFixed(1) : "-",
      ];
    });

    const head = [["No", "Komponen", "Satuan", "Bobot", "ACH", "Target", "Label", "Status", "Gap (Satuan)", "Target / Hari", "Poin", "KPI Kum."]];

    autoTable(doc, {
      startY: sumY + 4,
      head,
      body: tableBody,
      theme: "grid",
      repeatHeader: true,
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 6.5,
        fontStyle: "bold",
        halign: "center",
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      },
      columnStyles: {
        0:  { halign: "center", cellWidth: 7 },    // No
        1:  { cellWidth: 48 },                      // Komponen
        2:  { halign: "center", cellWidth: 12 },    // Satuan
        3:  { halign: "center", cellWidth: 12 },    // Bobot
        4:  { halign: "right",  cellWidth: 14 },    // ACH
        5:  { halign: "center", cellWidth: 13 },    // Target
        6:  { halign: "center", cellWidth: 20 },    // Label
        7:  { halign: "center", cellWidth: 20 },    // Status
        8:  { halign: "right",  cellWidth: 40 },    // Gap
        9:  { halign: "right",  cellWidth: 44 },    // Daily
        10: { halign: "right",  cellWidth: 16 },    // Poin
        11: { halign: "right",  cellWidth: 16 },    // Kum
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        // Status column color
        if (data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === "Capai") data.cell.styles.textColor = [5, 150, 105];
          else if (val === "Chase Super") data.cell.styles.textColor = [217, 119, 6];
          else if (val === "Chase Exceed") data.cell.styles.textColor = [220, 38, 38];
        }
        // Row background by status
        if (data.column.index === 0) {
          const row = data.table.body[data.row.index];
          if (!row) return;
          const statusVal = String(row.cells[7]?.raw || "");
          if (statusVal === "Capai") {
            data.cell.styles.fillColor = [240, 253, 244]; // green-50
          } else if (statusVal === "Chase Super") {
            data.cell.styles.fillColor = [255, 251, 235]; // amber-50
          }
        }
      },
      margin: { left: 8, right: 8 },
    });

    // ── Footer on every page ──
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 160);
      doc.text(`Dicetak: ${tglIndo}  |  Gap Analysis KPI ${label}`, 8, pageH - 5);
      doc.text(`Halaman ${p} / ${pageCount}`, 289, pageH - 5, { align: "right" });
    }

    doc.save(`Gap Analysis ${label} ${dateStr}.pdf`);
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* ═══ HERO: Score vs Target ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4 md:p-5">
          <p className="text-[11px] text-muted-foreground font-medium mb-1">Skor KPI Saat Ini</p>
          <p className={`text-3xl md:text-4xl font-black tabular-nums ${kpiScoreColor(analysis.totalKpi)}`}>
            {analysis.totalKpi.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{analysis.label}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 md:p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-muted-foreground font-medium">Target Exceed (110)</p>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">
              {analysis.gapTo110 > 0 ? `${analysis.gapTo110.toFixed(1)} poin lagi` : "Tercapai!"}
            </Badge>
          </div>
          <p className="text-3xl md:text-4xl font-black tabular-nums text-emerald-600">110</p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min((analysis.totalKpi / 110) * 100, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.min(Math.round((analysis.totalKpi / 110) * 100), 100)}% dari target
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4 md:p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-muted-foreground font-medium">Target Super Exceed (115)</p>
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] font-bold">
              {analysis.gapTo115 > 0 ? `${analysis.gapTo115.toFixed(1)} poin lagi` : "Tercapai!"}
            </Badge>
          </div>
          <p className="text-3xl md:text-4xl font-black tabular-nums text-amber-600">115</p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min((analysis.totalKpi / 115) * 100, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.min(Math.round((analysis.totalKpi / 115) * 100), 100)}% dari target
          </p>
        </div>
      </div>

      {/* ═══ STRATEGY TABLE ═══ */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <h3 className="text-sm font-bold">Gap Analysis per Sub-Komponen</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold transition-all border border-white/20"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold transition-all border border-white/20"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </button>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <Clock className="h-3 w-3" />
                <span>{workDays} hari kerja tersisa</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Gap dalam satuan asli &divide; sisa hari efektif = target harian
          </p>
        </div>

        {/* Sort & Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-500">Urutkan:</span>
          </div>
          {SORT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isActive = sortMode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                }`}
                title={opt.desc}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-500">Filter:</span>
          </div>
          {(["all", "chase", "super_chase", "achieved"] as const).map(f => {
            const label = f === "all" ? "Semua" : f === "chase" ? "Chase" : f === "super_chase" ? "Super Chase" : "Capai";
            const count = f === "all" ? rawRows.length : f === "chase" ? chaseRows.length : f === "super_chase" ? superChaseRows.length : achievedRows.length;
            const isActive = statusFilter === f;
            const dotColor = f === "all" ? "bg-gray-400" : f === "chase" ? "bg-red-500" : f === "super_chase" ? "bg-amber-500" : "bg-emerald-500";
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
                  isActive
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-slate-400 hover:text-slate-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {label}
                <span className={`font-bold tabular-nums ${isActive ? "text-white/70" : "text-gray-400"}`}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Chase Exceed</p>
              <p className="text-sm font-black text-red-600 tabular-nums">{chaseRows.length}</p>
            </div>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Chase Super Exceed</p>
              <p className="text-sm font-black text-amber-600 tabular-nums">{superChaseRows.length}</p>
            </div>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Sudah Capai Target</p>
              <p className="text-sm font-black text-emerald-600 tabular-nums">{achievedRows.length}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-3 py-2 font-semibold text-gray-500 w-7">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Komponen</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-500 w-14">Satuan</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-500 w-12">Bobot</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-500 w-24">
                  <button onClick={() => setSortMode(sortMode === "ach_asc" ? "ach_desc" : "ach_asc")} className="inline-flex items-center gap-0.5 hover:text-emerald-600 transition-colors">
                    ACH
                    {sortMode === "ach_asc" && <ArrowUp className="h-2.5 w-2.5 text-emerald-600" />}
                    {sortMode === "ach_desc" && <ArrowDown className="h-2.5 w-2.5 text-emerald-600" />}
                  </button>
                </th>
                <th className="text-center px-2 py-2 font-semibold text-gray-500 w-20">Target</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500 w-36">Gap (Satuan)</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500 w-44">Target / Hari</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-500 w-14">Poin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const simStep = simulationData.find(s => s.name === r.name);
                const isUrgent = urgentChaseNames.has(r.name);
                const rowBg = r.status === "achieved"
                  ? "bg-emerald-50/40"
                  : r.status === "super_chase"
                  ? "bg-amber-50/30"
                  : isUrgent
                  ? "bg-red-50/40"
                  : idx % 2 === 0 ? "bg-white" : "bg-gray-50/30";

                const borderLeft = r.status === "achieved"
                  ? "border-l-emerald-400"
                  : r.status === "super_chase"
                  ? "border-l-amber-400"
                  : isUrgent
                  ? "border-l-red-400"
                  : "border-l-gray-300";

                return (
                  <tr key={r.name} className={`${rowBg} border-l-[3px] ${borderLeft} border-b border-gray-50 hover:bg-gray-50/80 transition-colors`}>
                    {/* # */}
                    <td className={`px-3 py-2.5 font-bold tabular-nums ${isUrgent ? "text-red-500" : r.status === "achieved" ? "text-emerald-400" : "text-gray-400"}`}>
                      {r.status === "achieved" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                      ) : (
                        idx + 1
                      )}
                    </td>

                    {/* Komponen name */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {r.isUnlimited && <Infinity className="h-3 w-3 text-violet-500 shrink-0" />}
                        <span className={`font-semibold ${r.status === "achieved" ? "text-emerald-700" : "text-gray-800"}`}>
                          {r.name}
                        </span>
                      </div>
                    </td>

                    {/* Satuan */}
                    <td className="px-2 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ring-1 ${satuanBadgeCls(r.satuan)}`}>
                        {r.satuan}
                      </span>
                    </td>

                    {/* Bobot */}
                    <td className="px-2 py-2.5 text-center font-bold text-gray-500 tabular-nums">{r.bobot}</td>

                    {/* ACH with mini bar */}
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold tabular-nums text-[11px] w-11 text-right ${achTextColor(r.currentAch)}`}>
                          {r.currentAch.toFixed(1)}%
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full min-w-[40px]">
                          <div
                            className={`h-1.5 rounded-full transition-all ${achBarColor(r.currentAch)}`}
                            style={{ width: `${Math.min(r.currentAch / (r.isUnlimited ? 120 : 115) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Target */}
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-black tabular-nums text-[12px] ${r.targetAch >= 115 ? "text-amber-600" : "text-emerald-600"}`}>
                          {r.targetAch}%
                        </span>
                        <span className={`text-[8px] font-bold ${r.targetAch >= 115 ? "text-amber-500" : "text-emerald-500"}`}>
                          {r.targetLabel}
                        </span>
                      </div>
                    </td>

                    {/* Gap in satuan */}
                    <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${r.status === "achieved" ? "text-emerald-500" : "text-gray-800"}`}>
                      {r.status === "achieved" ? (
                        <span className="text-emerald-500 font-medium">-</span>
                      ) : r.isInverse ? (
                        <div className="flex items-center justify-end gap-1">
                          <ArrowDownRight className="h-3 w-3 text-orange-500 shrink-0" />
                          <span>{fmtVal(r.gapInSatuan, r.satuan)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3 text-red-500 shrink-0" />
                          <span>{fmtVal(r.gapInSatuan, r.satuan)}</span>
                        </div>
                      )}
                    </td>

                    {/* Daily target */}
                    <td className="px-3 py-2.5 text-right">
                      {r.status === "achieved" ? (
                        <span className="text-emerald-500 font-medium text-[10px]">Sudah capai</span>
                      ) : (
                        <div className={`font-bold tabular-nums text-[11px] ${isUrgent ? "text-red-600" : "text-gray-700"}`}>
                          {fmtDaily(r.dailyTarget, r.satuan, r.isInverse)}
                        </div>
                      )}
                    </td>

                    {/* Poin: gain + cumulative total */}
                    <td className="px-2 py-2.5 text-center">
                      {r.status === "achieved" ? (
                        <span className="text-emerald-500 text-[10px] font-bold">MAX</span>
                      ) : simStep ? (
                        <div className="flex flex-col items-center">
                          {simStep.gain > 0 ? (
                            <span className="text-[9px] text-emerald-500 font-bold leading-tight">+{simStep.gain.toFixed(2)}</span>
                          ) : (
                            <span className="text-[9px] text-gray-400 leading-tight">0.00</span>
                          )}
                          <span className={`font-black tabular-nums text-[11px] leading-tight ${
                            simStep.milestone === "115!" ? "text-amber-600" :
                            simStep.milestone === "110!" ? "text-emerald-600" : "text-gray-600"
                          }`}>
                            {simStep.cumulative.toFixed(1)}
                          </span>
                          {simStep.milestone && (
                            <Badge className={`mt-0.5 border-0 text-[7px] font-black px-1 py-0 leading-tight ${
                              simStep.milestone === "115!" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {simStep.milestone}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
            <span className="text-muted-foreground">
              <strong className="text-gray-700">{rows.length}</strong> komponen aktif
            </span>
            <span className="text-muted-foreground">
              <strong className="text-gray-700">{analysis.cappedMaxed}/{analysis.cappedTotal}</strong> capped max
            </span>
            <span className="text-muted-foreground">
              <strong className="text-gray-700">{analysis.unlimitedCount}</strong> unlimited
            </span>
            {analysis.cappedGapPotential > 0 && (
              <span className="text-emerald-600 font-medium">
                Potensi capped: +{analysis.cappedGapPotential.toFixed(1)} poin
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

interface TargetAnalysisProps {
  units: KpiUnit[];
  selectedUnitCode?: string | null;
  onUnitSelect?: (code: string) => void;
}

export function TargetAnalysis({ units, selectedUnitCode, onUnitSelect }: TargetAnalysisProps) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(selectedUnitCode || null);
  const workInfo = useMemo(() => getRemainingWorkDays(), []);

  const allAnalysis = useMemo(() => {
    return units.map(u => analyzeOverview(u)).sort((a, b) => b.totalKpi - a.totalKpi);
  }, [units]);

  const exceedCount = allAnalysis.filter(a => a.totalKpi >= 110).length;
  const superExceedCount = allAnalysis.filter(a => a.totalKpi >= 115).length;
  const criticalCount = allAnalysis.filter(a => a.totalKpi < 55).length;
  const avgKpi = allAnalysis.length > 0
    ? Math.round((allAnalysis.reduce((s, a) => s + a.totalKpi, 0) / allAnalysis.length) * 100) / 100
    : 0;

  // Detail view
  if (expandedUnit) {
    const selected = allAnalysis.find(a => a.unit.code === expandedUnit);
    if (!selected) { setExpandedUnit(null); return null; }
    return (
      <div className="space-y-4">
        <button onClick={() => { setExpandedUnit(null); onUnitSelect?.(units[0]?.code || ""); }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Kembali ke Ringkasan Semua Unit
        </button>
        <UnitDetailPanel analysis={selected} workDays={workInfo.days} />
      </div>
    );
  }

  // Overview
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Analisis Target per Unit</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Gap analysis menuju Exceed (110) & Super Exceed (115) &middot; {units.length} unit
          </p>
        </div>
      </div>

      {/* Time remaining */}
      <div className="bg-white rounded-xl border p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold">Sisa Waktu sampai 31 Desember 2026</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-black text-emerald-700 tabular-nums">{workInfo.days}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Hari Kerja</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-black text-gray-700 tabular-nums">{workInfo.weeks}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Minggu</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-black text-gray-700 tabular-nums">{workInfo.pctYear}%</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tahun Berjalan</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center"><Medal className="h-3 w-3 text-gray-500" /></div>
            <p className="text-[10px] text-muted-foreground font-medium">Rata-rata KPI</p>
          </div>
          <p className={`text-xl font-black tabular-nums ${kpiScoreColor(avgKpi)}`}>{avgKpi.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center"><Flame className="h-3 w-3 text-amber-500" /></div>
            <p className="text-[10px] text-muted-foreground font-medium">Super Exceed</p>
          </div>
          <p className="text-xl font-black tabular-nums text-amber-600">{superExceedCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center"><ShieldCheck className="h-3 w-3 text-emerald-500" /></div>
            <p className="text-[10px] text-muted-foreground font-medium">Exceed (110+)</p>
          </div>
          <p className="text-xl font-black tabular-nums text-emerald-600">{exceedCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center"><AlertTriangle className="h-3 w-3 text-red-500" /></div>
            <p className="text-[10px] text-muted-foreground font-medium">Kritis (&lt;55)</p>
          </div>
          <p className="text-xl font-black tabular-nums text-red-600">{criticalCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
      </div>

      {/* Unit cards */}
      <div className="space-y-2">
        {allAnalysis.map((a) => {
          const st = statusBadge(a.totalKpi);
          return (
            <div key={a.unit.code}
              className="bg-white rounded-xl border hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => { setExpandedUnit(a.unit.code); onUnitSelect?.(a.unit.code); }}>
              <div className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1"
                      style={{
                        backgroundColor: a.totalKpi >= 110 ? "#059669" : a.totalKpi >= 85 ? "#059669" : a.totalKpi >= 70 ? "#d97706" : a.totalKpi >= 55 ? "#ea580c" : "#dc2626",
                        ringColor: a.totalKpi >= 110 ? "#059669" : a.totalKpi >= 85 ? "#059669" : a.totalKpi >= 70 ? "#d97706" : a.totalKpi >= 55 ? "#ea580c" : "#dc2626",
                      }} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.cappedMaxed}/{a.cappedTotal} capped max &middot; {a.unlimitedCount} unlimited
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${st.cls} text-[10px] font-bold px-2`}>{st.label}</Badge>
                    <p className={`text-lg font-black tabular-nums min-w-[60px] text-right ${kpiScoreColor(a.totalKpi)}`}>
                      {a.totalKpi.toFixed(1)}
                    </p>
                    <ChevronDown className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">Target 110</span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {a.gapTo110 > 0 ? `- ${a.gapTo110.toFixed(1)} poin` : "Tercapai!"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${a.totalKpi >= 110 ? "bg-emerald-500" : "bg-emerald-400"}`}
                        style={{ width: `${Math.min((a.totalKpi / 110) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">Target 115</span>
                      <span className="text-[10px] font-bold text-amber-600">
                        {a.gapTo115 > 0 ? `- ${a.gapTo115.toFixed(1)} poin` : "Tercapai!"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${a.totalKpi >= 115 ? "bg-amber-500" : "bg-amber-400"}`}
                        style={{ width: `${Math.min((a.totalKpi / 115) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
                {a.cappedGapPotential > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-medium">
                      <Zap className="h-2.5 w-2.5" />
                      Potensi capped: +{a.cappedGapPotential.toFixed(1)} poin
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-700">Peringkat Pencapaian Seluruh Unit</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 py-2 font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Unit</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">KPI</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Gap 110</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Gap 115</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Capped Max</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Potensi Capped</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500 hidden md:table-cell">Unlimited</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {allAnalysis.map((a, idx) => {
                const st = statusBadge(a.totalKpi);
                return (
                  <tr key={a.unit.code}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                    onClick={() => { setExpandedUnit(a.unit.code); onUnitSelect?.(a.unit.code); }}>
                    <td className="px-3 py-2 font-bold text-gray-400 tabular-nums">
                      {idx === 0 && <Medal className="h-3.5 w-3.5 text-amber-500 mx-auto" />}
                      {idx !== 0 && idx + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-700">{a.label}</td>
                    <td className={`px-3 py-2 text-right font-black tabular-nums ${kpiScoreColor(a.totalKpi)}`}>
                      {a.totalKpi.toFixed(1)}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${a.gapTo110 <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {a.gapTo110 > 0 ? `-${a.gapTo110.toFixed(1)}` : <Check className="h-3.5 w-3.5 text-emerald-500 inline" />}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${a.gapTo115 <= 0 ? "text-amber-600" : "text-red-500"}`}>
                      {a.gapTo115 > 0 ? `-${a.gapTo115.toFixed(1)}` : <Check className="h-3.5 w-3.5 text-amber-500 inline" />}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{a.cappedMaxed}/{a.cappedTotal}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">+{a.cappedGapPotential.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-violet-600 font-medium hidden md:table-cell">
                      {a.unlimitedCurrent.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`${st.cls} text-[9px] font-bold px-1.5`}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}