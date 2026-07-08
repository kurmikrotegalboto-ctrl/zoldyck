"use client";

import { useMemo } from "react";
import { Target, Clock, ArrowUpRight, Infinity, Lock, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CAPPING_MAP } from "@/lib/kpi-types";
import type { KpiUnit, KpiComponent } from "@/lib/kpi-types";

// ─── Working days calculation ────────────────────────────────────────────

function calcWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) count++; // Mon-Sat
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
  achievable: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────

export function TargetAnalysis({ unit }: { unit: KpiUnit }) {
  const workInfo = useMemo(() => getRemainingWorkDays(), []);

  const analysis = useMemo(() => {
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

    // Scenarios
    const needFor110 = 110 - cappedMaxTotal;
    const needFor115 = 115 - cappedMaxTotal;

    const scenarios: ScenarioResult[] = [
      {
        label: "Konservatif",
        unlimitedConfig: { gadai: 120, emas: 115, dep: 110 },
        total: 0,
        achievable: false,
      },
      {
        label: "Moderat",
        unlimitedConfig: { gadai: 130, emas: 125, dep: 110 },
        total: 0,
        achievable: false,
      },
      {
        label: "Agresif",
        unlimitedConfig: { gadai: 140, emas: 135, dep: 115 },
        total: 0,
        achievable: false,
      },
    ];

    for (const s of scenarios) {
      const { gadai, emas, dep } = s.unlimitedConfig;
      // Map to unlimited components by order: OSL GADAI, OSL EMAS, DEPOSITO EMAS
      const unliNames = ["OSL AKTIF RATA-RATA GADAI", "OSL AKTIF RATA-RATA EMAS", "DEPOSITO EMAS"];
      let unliScore = 0;
      const configs = [gadai, emas, dep];
      for (let i = 0; i < unliNames.length; i++) {
        const comp = unlimited.find((u) => u.name === unliNames[i]);
        if (comp) {
          unliScore += comp.bobot * (configs[i] / 100);
        }
      }
      s.total = Math.round((cappedMaxTotal + unliScore) * 100) / 100;
      s.achievable = s.total >= 110;
    }

    const currentCapped = cappedGaps.reduce((s, g) => s + g.currentScore, 0);

    return {
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
    };
  }, [unit]);

  return (
    <div className="space-y-4">
      {/* ═══ HERO: Score vs Target ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Current Score */}
        <div className="bg-white rounded-xl border p-4 md:p-5 col-span-1 md:col-span-1">
          <p className="text-[11px] text-muted-foreground font-medium mb-1">Skor KPI Saat Ini</p>
          <p className={`text-3xl md:text-4xl font-black tabular-nums ${
            analysis.totalKpi >= 85 ? "text-emerald-600" :
            analysis.totalKpi >= 70 ? "text-amber-600" :
            analysis.totalKpi >= 55 ? "text-orange-600" : "text-red-600"
          }`}>
            {analysis.totalKpi.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{unit.name}</p>
        </div>

        {/* Target 110 */}
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

        {/* Target 115 */}
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
              <p className="text-[10px] text-muted-foreground">Satu-satunya jalan tembus 110. Tidak ada batas atas.</p>
            </div>
          </div>
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
                {u.achPct < 110 && (
                  <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Belum mencapai 110% — perlu diprioritaskan dulu
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-violet-100/60 border border-violet-200">
            <p className="text-[11px] text-violet-800 font-medium">
              <Zap className="h-3 w-3 inline mr-1" />
              Jika semua capped mencapai 110%, butuh <span className="font-bold">{analysis.needFromUnlimitedFor110} poin</span> dari unlimited untuk target 110, dan <span className="font-bold">{analysis.needFromUnlimitedFor115} poin</span> untuk target 115.
            </p>
          </div>
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
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
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
                    {g.gap < 0.01 && (
                      <CheckIcon className="h-3 w-3 inline ml-1 text-emerald-500" />
                    )}
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
            <p className="text-[10px] text-muted-foreground">Asumsi semua komponen capped mencapai 110%. Hanya unlimited yang bervariasi.</p>
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
                  s.total >= 115
                    ? "bg-amber-100 text-amber-700"
                    : s.total >= 110
                    ? "bg-emerald-100 text-emerald-700"
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

      {/* ═══ STRATEGY SUMMARY ═══ */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-4 md:p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5" />
          <h3 className="text-sm font-bold">Strategi Prioritas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-200 mb-1">TAHAP 1 — Jul-Agu</p>
            <p className="text-[11px] leading-relaxed">
              Fokus berat ke <strong>LABA USAHA</strong> dan <strong>FREKUENSI TRING!</strong> (gap terbesar). 
              Tarik <strong>DEPOSITO EMAS</strong> ke minimal 100%.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-200 mb-1">TAHAP 2 — Sep-Okt</p>
            <p className="text-[11px] leading-relaxed">
              Pastikan semua capped mendekati 110%. Dorong <strong>NASABAH PEMBIAYAAN</strong>, <strong>GALERI 24</strong>, dan <strong>NASABAH TRING!</strong> ke atas 100%.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-200 mb-1">TAHAP 3 — Nov-Des</p>
            <p className="text-[11px] leading-relaxed">
              Semua capped capai 110%. Final push <strong>OSL GADAI</strong> ke 130%+ dan <strong>OSL EMAS</strong> ke 125%+ lewat unlimited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small check icon ────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}