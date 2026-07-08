"use client";

import { useState, useMemo } from "react";
import {
  Target, Clock, Infinity, Lock, Zap, TrendingUp, AlertTriangle,
  ChevronDown, ChevronRight, ArrowUpRight, Medal, Flame, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CAPPING_MAP } from "@/lib/kpi-types";
import type { KpiUnit } from "@/lib/kpi-types";

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

// ─── Working days calculation ────────────────────────────────────────────

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

interface CappedGap {
  name: string;
  bobot: number;
  achPct: number;
  currentScore: number;
  maxScore: number;
  gap: number;
}

interface UnlimitedInfo {
  name: string;
  bobot: number;
  achPct: number;
  currentScore: number;
  pointsPerPct: number;
}

interface ScenarioResult {
  label: string;
  unlimitedConfig: { gadai: number; emas: number; dep: number };
  total: number;
  achievable110: boolean;
  achievable115: boolean;
}

interface UnitTargetAnalysis {
  unit: KpiUnit;
  label: string;
  totalKpi: number;
  gapTo110: number;
  gapTo115: number;
  cappedMaxTotal: number;
  cappedCurrent: number;
  cappedGapPotential: number;
  unlimitedCurrent: number;
  unlimitedBobot: number;
  needFromUnlimitedFor110: number;
  needFromUnlimitedFor115: number;
  cappedGaps: CappedGap[];
  unlimited: UnlimitedInfo[];
  scenarios: ScenarioResult[];
  cappedMaxed: number;
  cappedTotal: number;
  priorityActions: PriorityAction[];
}

interface PriorityAction {
  phase: string;
  component: string;
  action: string;
  impact: string;
  type: "capped" | "unlimited";
}

// ─── Analysis engine (per unit) ──────────────────────────────────────────

function analyzeUnit(unit: KpiUnit): UnitTargetAnalysis {
  const cappedGaps: CappedGap[] = [];
  const unlimited: UnlimitedInfo[] = [];
  let cappedMaxTotal = 0;
  let unlimitedCurrent = 0;
  let unlimitedBobot = 0;

  for (const c of unit.components) {
    if (c.bobot === 0) continue;
    const cap = CAPPING_MAP[c.kpi_name];
    const achPct = Math.round(c.ach * 1000) / 10;

    if (cap === "Unlimited") {
      unlimitedBobot += c.bobot;
      unlimitedCurrent += c.kpi_score;
      const pointsPerPct = c.bobot / 100;
      unlimited.push({
        name: c.kpi_name,
        bobot: c.bobot,
        achPct,
        currentScore: Math.round(c.kpi_score * 100) / 100,
        pointsPerPct: Math.round(pointsPerPct * 1000) / 1000,
      });
    } else if (cap === "110") {
      const maxScore = c.bobot * 1.1;
      cappedMaxTotal += maxScore;
      const gap = maxScore - c.kpi_score;
      cappedGaps.push({
        name: c.kpi_name,
        bobot: c.bobot,
        achPct,
        currentScore: Math.round(c.kpi_score * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        gap: Math.round(gap * 100) / 100,
      });
    }
  }

  cappedGaps.sort((a, b) => b.gap - a.gap);

  const needFor110 = 110 - cappedMaxTotal;
  const needFor115 = 115 - cappedMaxTotal;

  const scenarios: ScenarioResult[] = [
    { label: "Konservatif", unlimitedConfig: { gadai: 120, emas: 115, dep: 110 }, total: 0, achievable110: false, achievable115: false },
    { label: "Moderat", unlimitedConfig: { gadai: 130, emas: 125, dep: 110 }, total: 0, achievable110: false, achievable115: false },
    { label: "Agresif", unlimitedConfig: { gadai: 140, emas: 135, dep: 115 }, total: 0, achievable110: false, achievable115: false },
  ];

  const unliNames = ["OSL AKTIF RATA-RATA GADAI", "OSL AKTIF RATA-RATA EMAS", "DEPOSITO EMAS"];

  for (const s of scenarios) {
    const { gadai, emas, dep } = s.unlimitedConfig;
    let unliScore = 0;
    const configs = [gadai, emas, dep];
    for (let i = 0; i < unliNames.length; i++) {
      const comp = unlimited.find((u) => u.name === unliNames[i]);
      if (comp) {
        unliScore += comp.bobot * (configs[i] / 100);
      }
    }
    s.total = Math.round((cappedMaxTotal + unliScore) * 100) / 100;
    s.achievable110 = s.total >= 110;
    s.achievable115 = s.total >= 115;
  }

  const currentCapped = cappedGaps.reduce((s, g) => s + g.currentScore, 0);

  // Build priority actions based on this unit's actual data
  const priorityActions = buildPriorityActions(cappedGaps, unlimited, cappedGapPotential, unit.total_kpi);

  return {
    unit,
    label: UNIT_LABELS[unit.code] || unit.name,
    totalKpi: unit.total_kpi,
    gapTo110: Math.round((110 - unit.total_kpi) * 100) / 100,
    gapTo115: Math.round((115 - unit.total_kpi) * 100) / 100,
    cappedMaxTotal: Math.round(cappedMaxTotal * 100) / 100,
    cappedCurrent: Math.round(currentCapped * 100) / 100,
    cappedGapPotential: Math.round((cappedMaxTotal - currentCapped) * 100) / 100,
    unlimitedCurrent: Math.round(unlimitedCurrent * 100) / 100,
    unlimitedBobot,
    needFromUnlimitedFor110: Math.round(needFor110 * 100) / 100,
    needFromUnlimitedFor115: Math.round(needFor115 * 100) / 100,
    cappedGaps,
    unlimited,
    scenarios,
    cappedMaxed: cappedGaps.filter((g) => g.gap < 0.01).length,
    cappedTotal: cappedGaps.length,
    priorityActions,
  };
}

// ─── Dynamic priority builder ────────────────────────────────────────────

function buildPriorityActions(cappedGaps: CappedGap[], unlimited: UnlimitedInfo[], cappedGapPotential: number, totalKpi: number): PriorityAction[] {
  const actions: PriorityAction[] = [];

  // Phase 1: Fix critical capped (below 60% ACH) and unlimited below 100%
  const criticalCapped = cappedGaps.filter(g => g.achPct < 60).sort((a, b) => a.achPct - b.achPct);
  const weakCapped = cappedGaps.filter(g => g.achPct >= 60 && g.achPct < 100).sort((a, b) => a.achPct - b.achPct);
  const weakUnlimited = unlimited.filter(u => u.achPct < 100);

  for (const c of criticalCapped) {
    actions.push({
      phase: "TAHAP 1",
      component: c.name,
      action: getActionSuggestion(c.name, c.achPct),
      impact: `+${c.gap.toFixed(2)} poin potensi (ke max 110%)`,
      type: "capped",
    });
  }

  for (const u of weakUnlimited) {
    actions.push({
      phase: "TAHAP 1",
      component: u.name,
      action: getActionSuggestion(u.name, u.achPct),
      impact: `+${((1 - u.achPct / 100) * u.bobot).toFixed(2)} poin per 1% kenaikan`,
      type: "unlimited",
    });
  }

  // Phase 2: Push capped to 110%
  for (const c of weakCapped) {
    actions.push({
      phase: "TAHAP 2",
      component: c.name,
      action: getActionSuggestion(c.name, c.achPct),
      impact: `+${c.gap.toFixed(2)} poin (ke max 110%)`,
      type: "capped",
    });
  }

  // Phase 3: Push unlimited beyond 110%
  const strongUnlimited = unlimited.filter(u => u.achPct >= 100);
  for (const u of strongUnlimited) {
    actions.push({
      phase: "TAHAP 3",
      component: u.name,
      action: `Dorong ACH ke 130%+. Setiap 1% = +${u.pointsPerPct} poin.`,
      impact: `Unlimited — tidak ada batas atas`,
      type: "unlimited",
    });
  }

  return actions;
}

function getActionSuggestion(name: string, achPct: number): string {
  if (name.includes("LABA USAHA")) return achPct < 50
    ? "Review fundamental efisiensi operasional, tekan biaya non-productif, optimasi spread margin pembiayaan."
    : "Tingkatkan produktivitas aset dan kontrol biaya untuk capai target laba.";
  if (name.includes("FREKUENSI TRING")) return "Intensifkan edukasi transaksi digital, libatkan seluruh frontliner untuk cross-selling Tring! setiap transaksi.";
  if (name.includes("DEPOSITO EMAS")) return "Kampanye literasi keuangan emas, target upgrade nasabah tabungan emas ke Deposito Emas.";
  if (name.includes("NASABAH PEMBIAYAAN")) return "Perluas jangkauan digital dan agen, percepat proses credit approval untuk tingkatkan konversi.";
  if (name.includes("TE SINERGI")) return "Perkuat koordinasi dengan entitas Sinergi Holding, tentukan target bersama dan monitoring mingguan.";
  if (name.includes("GRAMASI GALERI")) return "Aktifkan event penjualan emas, tingkatkan visibilitas produk Galeri 24 dan promosi tematik.";
  if (name.includes("NASABAH TRING")) return "Follow-up nasabah yang sudah download Tring! tapi belum aktif bertransaksi, berikan insentif first transaction.";
  if (name.includes("OSL GADAI") || name.includes("OSL NON GADAI")) return "Tingkatkan penyaluran pembiayaan, perluas segmen nasabah, strategi marketing agresif.";
  if (name.includes("OSL EMAS")) return "Perkuat produk pembiayaan emas, sosialisasi keunggulan gadai emas dibanding kompetitor.";
  if (name.includes("LAR") || name.includes("NPL")) return "Perkuat proses collection dan early warning system, restrukturisasi nasabah potensial.";
  if (name.includes("CASHLESS")) return "Sosialisasikan manfaat pencairan cashless, berikan panduan dan asistensi proses pencairan digital.";
  if (name.includes("NASABAH BARU AGEN")) return "Rekrut dan aktivasi agen baru, berikan pelatihan dan insentif kompetitif.";
  if (name.includes("NASABAH BARU")) return "Perkuat akuisisi nasabah melalui referral, program komunitas, dan kerjasama agen.";
  if (name.includes("TABUNGAN EMAS")) return "Sosialisasikan fitur auto-debit, target payroll dan komunitas untuk akuisisi.";
  if (name.includes("OSL LAYANAN TRING")) return "Perluas penetrasi Tring! melalui bundling dengan produk pembiayaan aktif.";
  if (name.includes("OSL SINERGI")) return "Optimalkan sinergi holding melalui program referral dan cross-selling.";
  if (name.includes("CIR")) return "Evaluasi rasio biaya terhadap pendapatan, identifikasi efisiensi operasional.";
  if (name.includes("BRAND AWARENESS")) return "Tingkatkan eksposur brand melalui event komunitas dan digital marketing.";
  return "Review komprehensif strategi pencapaian komponen ini.";
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

function kpiBgColor(score: number): string {
  if (score >= 110) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 100) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 85) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 55) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
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

// ─── Check icon ──────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─── UNIT DETAIL PANEL ───────────────────────────────────────────────────

function UnitDetailPanel({ analysis }: { analysis: UnitTargetAnalysis }) {
  const phaseColors: Record<string, string> = {
    "TAHAP 1": "border-red-200 bg-red-50/50",
    "TAHAP 2": "border-amber-200 bg-amber-50/50",
    "TAHAP 3": "border-violet-200 bg-violet-50/50",
  };
  const phaseLabelColors: Record<string, string> = {
    "TAHAP 1": "text-red-600",
    "TAHAP 2": "text-amber-600",
    "TAHAP 3": "text-violet-600",
  };

  // Group actions by phase
  const groupedActions = useMemo(() => {
    const map = new Map<string, PriorityAction[]>();
    for (const a of analysis.priorityActions) {
      if (!map.has(a.phase)) map.set(a.phase, []);
      map.get(a.phase)!.push(a);
    }
    return map;
  }, [analysis]);

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
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min((analysis.totalKpi / 110) * 100, 100)}%` }}
            />
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
            <div
              className="h-2 rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min((analysis.totalKpi / 115) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.min(Math.round((analysis.totalKpi / 115) * 100), 100)}% dari target
          </p>
        </div>
      </div>

      {/* ═══ TWO COLUMN: Unlimited + Capped Gaps ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UNLIMITED COMPONENTS */}
        <div className="bg-white rounded-xl border p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-100">
              <Infinity className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Komponen Unlimited</h3>
              <p className="text-[10px] text-muted-foreground">Tidak ada batas atas. Kunci utama tembus 110.</p>
            </div>
          </div>
          {analysis.unlimited.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Tidak ada komponen unlimited</p>
          ) : (
            <div className="space-y-2">
              {analysis.unlimited.map((u) => (
                <div key={u.name} className="p-3 rounded-lg bg-violet-50/60 border border-violet-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-gray-800 leading-tight">{u.name}</p>
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px] font-bold shrink-0 ml-2">
                      +{u.pointsPerPct} poin/%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground">Bobot: <span className="font-bold text-gray-700">{u.bobot}</span></span>
                    <span className="text-muted-foreground">ACH: <span className={`font-bold ${u.achPct >= 110 ? "text-emerald-600" : u.achPct >= 80 ? "text-amber-600" : "text-red-600"}`}>{u.achPct}%</span></span>
                    <span className="text-muted-foreground">Skor: <span className="font-bold text-gray-700">{u.currentScore}</span></span>
                  </div>
                  {u.achPct < 100 && (
                    <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      Belum 100% — prioritaskan naikkan dulu
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {analysis.unlimited.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-violet-100/60 border border-violet-200">
              <p className="text-[11px] text-violet-800 font-medium">
                <Zap className="h-3 w-3 inline mr-1" />
                Jika semua capped max 110%, butuh <span className="font-bold">{analysis.needFromUnlimitedFor110} poin</span> dari unlimited untuk target 110, dan <span className="font-bold">{analysis.needFromUnlimitedFor115} poin</span> untuk target 115.
              </p>
            </div>
          )}
        </div>

        {/* CAPPED GAPS */}
        <div className="bg-white rounded-xl border p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <Lock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Komponen Capped (maks 110%)</h3>
                <p className="text-[10px] text-muted-foreground">
                  {analysis.cappedMaxed}/{analysis.cappedTotal} sudah max &middot; sisa potensi: {analysis.cappedGapPotential} poin
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {analysis.cappedGaps.map((g, idx) => (
              <div
                key={g.name}
                className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  g.gap < 0.01
                    ? "bg-emerald-50"
                    : g.gap >= 3
                    ? "bg-red-50"
                    : g.gap >= 1
                    ? "bg-amber-50"
                    : "bg-gray-50"
                }`}
              >
                <span className={`text-[10px] font-bold w-5 text-center tabular-nums ${
                  idx < 3 ? "text-red-500" : "text-gray-400"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium truncate ${g.gap < 0.01 ? "text-emerald-700" : "text-gray-700"}`}>
                    {g.name}
                    {g.gap < 0.01 && <CheckIcon className="h-3 w-3 inline ml-1 text-emerald-500" />}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">ACH {g.achPct}%</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[100px]">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          g.achPct >= 100 ? "bg-emerald-500" :
                          g.achPct >= 80 ? "bg-amber-400" :
                          g.achPct >= 50 ? "bg-orange-400" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(g.achPct / 110 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {g.gap < 0.01 ? (
                    <span className="text-[10px] font-bold text-emerald-600">MAX</span>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-red-600 tabular-nums">-{g.gap.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">poin</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SCENARIOS ═══ */}
      <div className="bg-white rounded-xl border p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-100">
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Skenario Pencapaian</h3>
            <p className="text-[10px] text-muted-foreground">Asumsi semua capped max 110%. Variasi hanya di unlimited.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {analysis.scenarios.map((s) => (
            <div
              key={s.label}
              className={`p-4 rounded-lg border-2 transition-colors ${
                s.total >= 115
                  ? "border-amber-300 bg-amber-50/50"
                  : s.total >= 110
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-gray-200 bg-gray-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{s.label}</p>
                <Badge className={`border-0 text-[10px] font-bold ${
                  s.total >= 115 ? "bg-amber-100 text-amber-700" :
                  s.total >= 110 ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {s.total >= 115 ? "Super Exceed" : s.total >= 110 ? "Exceed" : "Belum"}
                </Badge>
              </div>
              <p className={`text-2xl font-black tabular-nums ${
                s.total >= 115 ? "text-amber-600" : s.total >= 110 ? "text-emerald-600" : "text-gray-500"
              }`}>
                {s.total.toFixed(1)}
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  OSL Gadai: <span className="font-bold text-gray-700">{s.unlimitedConfig.gadai}%</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  OSL Emas: <span className="font-bold text-gray-700">{s.unlimitedConfig.emas}%</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Deposito Emas: <span className="font-bold text-gray-700">{s.unlimitedConfig.dep}%</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PRIORITY ACTIONS (dynamic per unit) ═══ */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-4 md:p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5" />
          <h3 className="text-sm font-bold">Strategi Prioritas — {analysis.label}</h3>
        </div>
        {groupedActions.size === 0 ? (
          <p className="text-emerald-100 text-xs">Semua komponen sudah optimal. Pertahankan pencapaian.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(groupedActions.entries()).map(([phase, actions]) => (
              <div key={phase} className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className={`text-[10px] font-bold text-emerald-200 mb-2 ${phaseLabelColors[phase] || ""}`}>
                  {phase} — {phase === "TAHAP 1" ? "Perbaikan Kritis" : phase === "TAHAP 2" ? "Optimalisasi Capped" : "Final Push Unlimited"}
                </p>
                <div className="space-y-2">
                  {actions.map((a, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-300 text-[10px] font-bold mt-0.5 shrink-0 w-4">{idx + 1}.</span>
                      <div>
                        <p className="text-[11px] leading-relaxed">
                          <strong>{a.component}</strong> — {a.action}
                        </p>
                        <p className="text-[10px] text-emerald-200 mt-0.5">
                          <ArrowUpRight className="h-2.5 w-2.5 inline mr-0.5" />
                          {a.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
    return units.map(u => analyzeUnit(u)).sort((a, b) => b.totalKpi - a.totalKpi);
  }, [units]);

  // Stats
  const exceedCount = allAnalysis.filter(a => a.totalKpi >= 110).length;
  const superExceedCount = allAnalysis.filter(a => a.totalKpi >= 115).length;
  const criticalCount = allAnalysis.filter(a => a.totalKpi < 55).length;
  const avgKpi = allAnalysis.length > 0
    ? Math.round((allAnalysis.reduce((s, a) => s + a.totalKpi, 0) / allAnalysis.length) * 100) / 100
    : 0;

  // If a specific unit is expanded, show detail view
  if (expandedUnit) {
    const selected = allAnalysis.find(a => a.unit.code === expandedUnit);
    if (!selected) {
      setExpandedUnit(null);
      return null;
    }
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setExpandedUnit(null);
            onUnitSelect?.(units[0]?.code || "");
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Kembali ke Ringkasan Semua Unit
        </button>
        <UnitDetailPanel analysis={selected} />
      </div>
    );
  }

  // OVERVIEW: All units
  return (
    <div className="space-y-4 animate-fade-up">
      {/* ═══ PAGE TITLE ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Analisis Target per Unit</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Gap analysis menuju Exceed (110) & Super Exceed (115) &middot; {units.length} unit
          </p>
        </div>
      </div>

      {/* ═══ TIME REMAINING ═══ */}
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

      {/* ═══ SUMMARY STATS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
              <Medal className="h-3 w-3 text-gray-500" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Rata-rata KPI</p>
          </div>
          <p className={`text-xl font-black tabular-nums ${kpiScoreColor(avgKpi)}`}>{avgKpi.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
              <Flame className="h-3 w-3 text-amber-500" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Super Exceed</p>
          </div>
          <p className="text-xl font-black tabular-nums text-amber-600">{superExceedCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Exceed (110+)</p>
          </div>
          <p className="text-xl font-black tabular-nums text-emerald-600">{exceedCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
        <div className="bg-white rounded-xl border p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 text-red-500" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Kritis (&lt;55)</p>
          </div>
          <p className="text-xl font-black tabular-nums text-red-600">{criticalCount}</p>
          <p className="text-[9px] text-muted-foreground">dari {units.length} unit</p>
        </div>
      </div>

      {/* ═══ UNIT CARDS ═══ */}
      <div className="space-y-2">
        {allAnalysis.map((a) => {
          const st = statusBadge(a.totalKpi);
          const topGap = a.cappedGaps.length > 0 ? a.cappedGaps[0] : null;
          const worstUnlimited = a.unlimited.filter(u => u.achPct < 100).sort((x, y) => x.achPct - y.achPct)[0];

          return (
            <div
              key={a.unit.code}
              className="bg-white rounded-xl border hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => {
                setExpandedUnit(a.unit.code);
                onUnitSelect?.(a.unit.code);
              }}
            >
              <div className="p-3 md:p-4">
                {/* Row 1: Unit name + Score + Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1"
                      style={{
                        backgroundColor: a.totalKpi >= 110 ? "#059669" : a.totalKpi >= 85 ? "#059669" : a.totalKpi >= 70 ? "#d97706" : a.totalKpi >= 55 ? "#ea580c" : "#dc2626",
                        ringColor: a.totalKpi >= 110 ? "#059669" : a.totalKpi >= 85 ? "#059669" : a.totalKpi >= 70 ? "#d97706" : a.totalKpi >= 55 ? "#ea580c" : "#dc2626",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.cappedMaxed}/{a.cappedTotal} capped max &middot; {a.unlimited.length} unlimited
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

                {/* Row 2: Gap bars to 110 and 115 */}
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">Target 110</span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {a.gapTo110 > 0 ? `- ${a.gapTo110.toFixed(1)} poin` : "Tercapai!"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${a.totalKpi >= 110 ? "bg-emerald-500" : "bg-emerald-400"}`}
                        style={{ width: `${Math.min((a.totalKpi / 110) * 100, 100)}%` }}
                      />
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
                      <div
                        className={`h-1.5 rounded-full transition-all ${a.totalKpi >= 115 ? "bg-amber-500" : "bg-amber-400"}`}
                        style={{ width: `${Math.min((a.totalKpi / 115) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Quick insight */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topGap && topGap.gap >= 1 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[9px] font-medium">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Gap terbesar: {topGap.name} ({topGap.achPct}%)
                    </span>
                  )}
                  {worstUnlimited && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[9px] font-medium">
                      <Infinity className="h-2.5 w-2.5" />
                      {worstUnlimited.name} {worstUnlimited.achPct}%
                    </span>
                  )}
                  {a.needFromUnlimitedFor110 > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-medium">
                      <Zap className="h-2.5 w-2.5" />
                      Butuh {a.needFromUnlimitedFor110} poin unlimited
                    </span>
                  )}
                  {a.cappedGapPotential > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-medium">
                      <Lock className="h-2.5 w-2.5" />
                      Potensi capped: +{a.cappedGapPotential} poin
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ RANKING TABLE ═══ */}
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
                <th className="text-right px-3 py-2 font-semibold text-gray-500 hidden md:table-cell">Unlimited Score</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {allAnalysis.map((a, idx) => {
                const st = statusBadge(a.totalKpi);
                return (
                  <tr
                    key={a.unit.code}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setExpandedUnit(a.unit.code);
                      onUnitSelect?.(a.unit.code);
                    }}
                  >
                    <td className="px-3 py-2 font-bold text-gray-400 tabular-nums">
                      {idx === 0 && <Medal className="h-3.5 w-3.5 text-amber-500 mx-auto" />}
                      {idx !== 0 && idx + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-700">{a.label}</td>
                    <td className={`px-3 py-2 text-right font-black tabular-nums ${kpiScoreColor(a.totalKpi)}`}>
                      {a.totalKpi.toFixed(1)}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${a.gapTo110 <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {a.gapTo110 > 0 ? `-${a.gapTo110.toFixed(1)}` : <CheckIcon className="h-3.5 w-3.5 text-emerald-500 inline" />}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${a.gapTo115 <= 0 ? "text-amber-600" : "text-red-500"}`}>
                      {a.gapTo115 > 0 ? `-${a.gapTo115.toFixed(1)}` : <CheckIcon className="h-3.5 w-3.5 text-amber-500 inline" />}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {a.cappedMaxed}/{a.cappedTotal}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      +{a.cappedGapPotential.toFixed(1)}
                    </td>
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