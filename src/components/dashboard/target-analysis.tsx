"use client";

import { useState, useMemo } from "react";
import {
  Target, Clock, Infinity, Lock, Zap, TrendingUp, AlertTriangle,
  ChevronDown, ChevronRight, Medal, Flame, ShieldCheck
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

interface GapStep {
  step: number;
  component: string;
  type: "capped" | "unlimited";
  currentAch: number;
  targetAch: number;
  pointsGain: number;
  cumulativeTotal: number;
  milestone?: "110" | "115";
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
  gapPath: GapStep[];
  pathMaxCappedTotal: number;
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
        name: c.kpi_name, bobot: c.bobot, achPct,
        currentScore: Math.round(c.kpi_score * 100) / 100,
        pointsPerPct: Math.round(pointsPerPct * 1000) / 1000,
      });
    } else if (cap === "110") {
      const maxScore = c.bobot * 1.1;
      cappedMaxTotal += maxScore;
      const gap = maxScore - c.kpi_score;
      cappedGaps.push({
        name: c.kpi_name, bobot: c.bobot, achPct,
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
      if (comp) unliScore += comp.bobot * (configs[i] / 100);
    }
    s.total = Math.round((cappedMaxTotal + unliScore) * 100) / 100;
    s.achievable110 = s.total >= 110;
    s.achievable115 = s.total >= 115;
  }

  const currentCapped = cappedGaps.reduce((s, g) => s + g.currentScore, 0);
  const cappedGapPotential = Math.round((cappedMaxTotal - currentCapped) * 100) / 100;

  // Build gap closure path
  const { gapPath, pathMaxCappedTotal } = buildGapClosurePath(cappedGaps, unlimited, unit.total_kpi, cappedMaxTotal);

  return {
    unit, label: UNIT_LABELS[unit.code] || unit.name,
    totalKpi: unit.total_kpi,
    gapTo110: Math.round((110 - unit.total_kpi) * 100) / 100,
    gapTo115: Math.round((115 - unit.total_kpi) * 100) / 100,
    cappedMaxTotal: Math.round(cappedMaxTotal * 100) / 100,
    cappedCurrent: Math.round(currentCapped * 100) / 100,
    cappedGapPotential,
    unlimitedCurrent: Math.round(unlimitedCurrent * 100) / 100,
    unlimitedBobot,
    needFromUnlimitedFor110: Math.round(needFor110 * 100) / 100,
    needFromUnlimitedFor115: Math.round(needFor115 * 100) / 100,
    cappedGaps, unlimited, scenarios,
    cappedMaxed: cappedGaps.filter((g) => g.gap < 0.01).length,
    cappedTotal: cappedGaps.length,
    gapPath,
    pathMaxCappedTotal: Math.round(pathMaxCappedTotal * 100) / 100,
  };
}

// ─── Gap Closure Path Builder ────────────────────────────────────────────

function buildGapClosurePath(
  cappedGaps: CappedGap[],
  unlimited: UnlimitedInfo[],
  currentTotal: number,
  cappedMaxTotal: number
): { gapPath: GapStep[]; pathMaxCappedTotal: number } {
  const steps: GapStep[] = [];
  let cumulative = currentTotal;
  let stepNum = 0;

  // PHASE 1: Maximize all capped (sorted by gap descending = biggest impact first)
  const sortedCapped = [...cappedGaps].sort((a, b) => b.gap - a.gap);
  for (const c of sortedCapped) {
    if (c.gap < 0.01) continue;
    stepNum++;
    cumulative += c.gap;
    const milestone = cumulative >= 115 ? "115" as const : cumulative >= 110 ? "110" as const : undefined;
    steps.push({
      step: stepNum, component: c.name, type: "capped",
      currentAch: c.achPct, targetAch: 110,
      pointsGain: Math.round(c.gap * 100) / 100,
      cumulativeTotal: Math.round(cumulative * 100) / 100,
      milestone,
    });
  }

  const totalAfterCapped = cumulative;

  // PHASE 2: If below 110, push unlimited
  if (totalAfterCapped < 110 && unlimited.length > 0) {
    // First bring unlimited below 100% up to 100%
    const below100 = unlimited.filter(u => u.achPct < 100).sort((a, b) => a.achPct - b.achPct);
    for (const u of below100) {
      const achGain = 100 - u.achPct;
      const gain = u.bobot * (achGain / 100);
      cumulative += gain;
      stepNum++;
      const milestone = cumulative >= 115 ? "115" as const : cumulative >= 110 ? "110" as const : undefined;
      steps.push({
        step: stepNum, component: u.name, type: "unlimited",
        currentAch: u.achPct, targetAch: 100,
        pointsGain: Math.round(gain * 100) / 100,
        cumulativeTotal: Math.round(cumulative * 100) / 100,
        milestone,
      });
    }

    // Then push unlimited to reach exactly 110
    if (cumulative < 110) {
      const sorted = [...unlimited].sort((a, b) => b.pointsPerPct - a.pointsPerPct);
      const achAdjustments = new Map<string, number>();
      for (const s of steps) { if (s.type === "unlimited") achAdjustments.set(s.component, s.targetAch); }

      for (const u of sorted) {
        if (cumulative >= 110) break;
        const currentAch = achAdjustments.get(u.name) ?? u.achPct;
        const remaining = 110 - cumulative;
        const achNeeded = remaining / u.pointsPerPct;
        const targetAch = Math.round((currentAch + achNeeded) * 10) / 10;
        cumulative += remaining;
        stepNum++;
        steps.push({
          step: stepNum, component: u.name, type: "unlimited",
          currentAch, targetAch,
          pointsGain: Math.round(remaining * 100) / 100,
          cumulativeTotal: Math.round(cumulative * 100) / 100,
          milestone: "110",
        });
        achAdjustments.set(u.name, targetAch);
      }
    }
  }

  // PHASE 3: Push unlimited to reach 115
  if (cumulative < 115 && unlimited.length > 0) {
    const sorted = [...unlimited].sort((a, b) => b.pointsPerPct - a.pointsPerPct);
    const achAdjustments = new Map<string, number>();
    for (const s of steps) { if (s.type === "unlimited") achAdjustments.set(s.component, s.targetAch); }

    for (const u of sorted) {
      if (cumulative >= 115) break;
      const currentAch = achAdjustments.get(u.name) ?? u.achPct;
      const remaining = 115 - cumulative;
      const achNeeded = remaining / u.pointsPerPct;
      const targetAch = Math.round((currentAch + achNeeded) * 10) / 10;
      cumulative += remaining;
      stepNum++;
      steps.push({
        step: stepNum, component: u.name, type: "unlimited",
        currentAch, targetAch,
        pointsGain: Math.round(remaining * 100) / 100,
        cumulativeTotal: Math.round(cumulative * 100) / 100,
        milestone: "115",
      });
      achAdjustments.set(u.name, targetAch);
    }
  }

  return { gapPath: steps, pathMaxCappedTotal: totalAfterCapped };
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
  const cappedSteps = analysis.gapPath.filter(s => s.type === "capped");
  const unlimitedSteps = analysis.gapPath.filter(s => s.type === "unlimited");

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
              <div key={g.name}
                className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  g.gap < 0.01 ? "bg-emerald-50"
                  : g.gap >= 3 ? "bg-red-50"
                  : g.gap >= 1 ? "bg-amber-50"
                  : "bg-gray-50"
                }`}>
                <span className={`text-[10px] font-bold w-5 text-center tabular-nums ${idx < 3 ? "text-red-500" : "text-gray-400"}`}>
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
                      <div className={`h-1.5 rounded-full transition-all ${
                        g.achPct >= 100 ? "bg-emerald-500" :
                        g.achPct >= 80 ? "bg-amber-400" :
                        g.achPct >= 50 ? "bg-orange-400" : "bg-red-400"
                      }`} style={{ width: `${Math.min(g.achPct / 110 * 100, 100)}%` }} />
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
            <div key={s.label}
              className={`p-4 rounded-lg border-2 transition-colors ${
                s.total >= 115 ? "border-amber-300 bg-amber-50/50"
                : s.total >= 110 ? "border-emerald-300 bg-emerald-50/50"
                : "border-gray-200 bg-gray-50/50"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{s.label}</p>
                <Badge className={`border-0 text-[10px] font-bold ${
                  s.total >= 115 ? "bg-amber-100 text-amber-700"
                  : s.total >= 110 ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
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
                <p className="text-[10px] text-muted-foreground">OSL Gadai: <span className="font-bold text-gray-700">{s.unlimitedConfig.gadai}%</span></p>
                <p className="text-[10px] text-muted-foreground">OSL Emas: <span className="font-bold text-gray-700">{s.unlimitedConfig.emas}%</span></p>
                <p className="text-[10px] text-muted-foreground">Deposito Emas: <span className="font-bold text-gray-700">{s.unlimitedConfig.dep}%</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ JALUR PENCAPAIAN 110 / 115 ═══ */}
      <div className="bg-white rounded-xl border p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-emerald-100">
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Jalur Pencapaian 110 / 115</h3>
            <p className="text-[10px] text-muted-foreground">
              Simulasi step-by-step: urutkan dari gap terbesar, hitung skor kumulatif.
            </p>
          </div>
        </div>

        {/* Starting point */}
        <div className="mt-3 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
          <span className="text-[10px] font-bold text-gray-400 w-16 shrink-0">MULAI</span>
          <span className="text-[11px] text-gray-500 flex-1">Skor saat ini</span>
          <span className={`text-base font-black tabular-nums ${kpiScoreColor(analysis.totalKpi)}`}>
            {analysis.totalKpi.toFixed(2)}
          </span>
        </div>

        {/* Capped steps */}
        {cappedSteps.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
              Langkah 1 — Maksimalkan Capped (ke 110%)
            </p>
            <div className="space-y-1">
              {cappedSteps.map((s) => (
                <div key={s.step}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    s.milestone === "115" ? "bg-amber-50 border-amber-200"
                    : s.milestone === "110" ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-gray-100 hover:border-gray-200"
                  }`}>
                  <span className="text-[10px] font-bold text-gray-400 w-16 shrink-0 tabular-nums">#{s.step}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-gray-700 truncate">{s.component}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.currentAch.toFixed(1)}% → <span className="font-bold text-emerald-600">110%</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600">+{s.pointsGain.toFixed(2)}</span>
                    <span className={`text-sm font-black tabular-nums min-w-[55px] text-right ${
                      s.milestone === "115" ? "text-amber-600"
                      : s.milestone === "110" ? "text-emerald-600"
                      : "text-gray-700"
                    }`}>
                      {s.cumulativeTotal.toFixed(1)}
                    </span>
                    {s.milestone && (
                      <Badge className={`border-0 text-[9px] font-bold px-1.5 py-0 shrink-0 ${
                        s.milestone === "115" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {s.milestone}!
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Summary bar */}
            <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-medium">
                <Lock className="h-3 w-3 inline mr-1" />
                Jika semua capped max → Total: <span className="font-black">{analysis.pathMaxCappedTotal.toFixed(2)}</span>
                {analysis.pathMaxCappedTotal >= 110
                  ? " — 110 sudah tercapai tanpa unlimited!"
                  : ` — Kurang ${(110 - analysis.pathMaxCappedTotal).toFixed(2)} poin ke 110, perlu dorong unlimited.`}
              </p>
            </div>
          </div>
        )}

        {/* Unlimited steps */}
        {unlimitedSteps.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
              Langkah 2 — Dorong Unlimited (tanpa batas)
            </p>
            <div className="space-y-1">
              {unlimitedSteps.map((s) => (
                <div key={s.step}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    s.milestone === "115" ? "bg-amber-50 border-amber-200"
                    : s.milestone === "110" ? "bg-emerald-50 border-emerald-200"
                    : "bg-violet-50/50 border-violet-100 hover:border-violet-200"
                  }`}>
                  <span className="text-[10px] font-bold text-gray-400 w-16 shrink-0 tabular-nums">#{s.step}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Infinity className="h-3 w-3 text-violet-500 shrink-0" />
                      <span className="text-[11px] font-semibold text-gray-700 truncate">{s.component}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.currentAch.toFixed(1)}% → <span className="font-bold text-violet-600">{s.targetAch.toFixed(1)}%</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-violet-600">+{s.pointsGain.toFixed(2)}</span>
                    <span className={`text-sm font-black tabular-nums min-w-[55px] text-right ${
                      s.milestone === "115" ? "text-amber-600"
                      : s.milestone === "110" ? "text-emerald-600"
                      : "text-violet-700"
                    }`}>
                      {s.cumulativeTotal.toFixed(1)}
                    </span>
                    {s.milestone && (
                      <Badge className={`border-0 text-[9px] font-bold px-1.5 py-0 shrink-0 ${
                        s.milestone === "115" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {s.milestone}!
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.gapPath.length === 0 && (
          <div className="mt-3 text-center py-4">
            <CheckIcon className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-emerald-600">Semua komponen sudah optimal!</p>
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
        <UnitDetailPanel analysis={selected} />
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
          const topGap = a.cappedGaps.length > 0 ? a.cappedGaps[0] : null;
          const worstUnlimited = a.unlimited.filter(u => u.achPct < 100).sort((x, y) => x.achPct - y.achPct)[0];
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
                      {a.gapTo110 > 0 ? `-${a.gapTo110.toFixed(1)}` : <CheckIcon className="h-3.5 w-3.5 text-emerald-500 inline" />}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${a.gapTo115 <= 0 ? "text-amber-600" : "text-red-500"}`}>
                      {a.gapTo115 > 0 ? `-${a.gapTo115.toFixed(1)}` : <CheckIcon className="h-3.5 w-3.5 text-amber-500 inline" />}
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