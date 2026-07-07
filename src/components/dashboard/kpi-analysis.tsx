"use client";

import { useMemo } from "react";
import { Trophy, AlertTriangle, ArrowUpRight, ArrowDownRight, Medal, Target } from "lucide-react";
import type { KpiUnit } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, getKpiForSub } from "@/lib/kpi-types";

const UNIT_LABELS: Record<string, string> = {
  "14200_UPC": "UPC Tegalboto",
  "14200_CP": "CP Tegalboto",
  "14201": "Basuki Rahmad",
  "14202": "S. Parman",
  "14204": "Kalisat",
  "14205": "Mayang",
  "17506": "Colo Sumberjati",
};

interface KpiAnalysisProps {
  units: KpiUnit[];
  date: string;
}

interface SubAnalysis {
  subName: string;
  groupName: string;
  groupNo: number;
  best: { unitCode: string; unitLabel: string; ach: number; realisasi: number; target: number } | null;
  worst: { unitCode: string; unitLabel: string; ach: number; realisasi: number; target: number } | null;
  avgAch: number;
  allUnits: { unitCode: string; unitLabel: string; ach: number; bobot: number; isInactive: boolean }[];
}

function getUnitLabel(code: string): string {
  return UNIT_LABELS[code] || code;
}

function achColor(ach: number): string {
  if (ach >= 100) return "text-emerald-600";
  if (ach >= 80) return "text-amber-600";
  if (ach >= 50) return "text-orange-600";
  return "text-red-600";
}

function achBg(ach: number): string {
  if (ach >= 100) return "bg-emerald-50 border-emerald-200";
  if (ach >= 80) return "bg-amber-50 border-amber-200";
  if (ach >= 50) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function achBadge(ach: number): string {
  if (ach >= 100) return "bg-emerald-100 text-emerald-700";
  if (ach >= 80) return "bg-amber-100 text-amber-700";
  if (ach >= 50) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function achBarColor(ach: number): string {
  if (ach >= 100) return "bg-emerald-500";
  if (ach >= 80) return "bg-amber-500";
  if (ach >= 50) return "bg-orange-500";
  return "bg-red-500";
}

export function KpiAnalysis({ units, date }: KpiAnalysisProps) {
  const analysis = useMemo((): { subs: SubAnalysis[]; overall: { bestSub: SubAnalysis | null; worstSub: SubAnalysis | null } } => {
    const subs: SubAnalysis[] = [];

    KOMPONEN_GROUPS.forEach((group) => {
      group.subKomponen.forEach((subName) => {
        const allUnits: SubAnalysis["allUnits"] = [];

        units.forEach((unit) => {
          const comp = getKpiForSub(unit, subName);
          if (comp && comp.bobot > 0) {
            allUnits.push({
              unitCode: unit.code,
              unitLabel: getUnitLabel(unit.code),
              ach: comp.ach * 100,
              bobot: comp.bobot,
              isInactive: false,
            });
          }
        });

        if (allUnits.length === 0) return;

        const activeUnits = allUnits.filter((u) => !u.isInactive);
        const sorted = [...activeUnits].sort((a, b) => b.ach - a.ach);
        const bestUnit = sorted[0] || null;
        const worstUnit = sorted[sorted.length - 1] || null;
        const avgAch = activeUnits.length > 0
          ? activeUnits.reduce((s, u) => s + u.ach, 0) / activeUnits.length
          : 0;

        const bestComp = bestUnit
          ? (() => { const c = getKpiForSub(units.find((u) => u.code === bestUnit.unitCode)!, subName); return c; })()
          : null;
        const worstComp = worstUnit
          ? (() => { const c = getKpiForSub(units.find((u) => u.code === worstUnit.unitCode)!, subName); return c; })()
          : null;

        subs.push({
          subName,
          groupName: group.name,
          groupNo: group.no,
          best: bestComp && bestUnit ? {
            unitCode: bestUnit.unitCode,
            unitLabel: bestUnit.unitLabel,
            ach: bestUnit.ach,
            realisasi: bestComp.realisasi,
            target: bestComp.target,
          } : null,
          worst: worstComp && worstUnit ? {
            unitCode: worstUnit.unitCode,
            unitLabel: worstUnit.unitLabel,
            ach: worstUnit.ach,
            realisasi: worstComp.realisasi,
            target: worstComp.target,
          } : null,
          avgAch,
          allUnits,
        });
      });
    });

    const activeSubs = subs.filter((s) => s.best && s.worst);
    const bestSub = activeSubs.length > 0
      ? [...activeSubs].sort((a, b) => (b.best?.ach || 0) - (a.best?.ach || 0))[0]
      : null;
    const worstSub = activeSubs.length > 0
      ? [...activeSubs].sort((a, b) => (a.worst?.ach || 999) - (b.worst?.ach || 999))[0]
      : null;

    return { subs, overall: { bestSub, worstSub } };
  }, [units]);

  const { subs, overall } = analysis;
  const totalUnits = units.length;

  // Group subs by komponen group
  const grouped = useMemo(() => {
    const map = new Map<string, SubAnalysis[]>();
    KOMPONEN_GROUPS.forEach((g) => { map.set(g.name, []); });
    subs.forEach((s) => {
      const arr = map.get(s.groupName);
      if (arr) arr.push(s);
    });
    return map;
  }, [subs]);

  return (
    <div className="space-y-4 animate-fade-up">
      {/* ── Page Title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Analisis KPI Antar Unit</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Perbandingan pencapaian {totalUnits} unit &middot; Periode {date}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] font-medium text-gray-500">Berdasarkan ACH%</span>
        </div>
      </div>

      {/* ── HERO SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Best Achievement */}
        {overall.bestSub && (
          <div className={`relative overflow-hidden rounded-xl border p-4 ${achBg(overall.bestSub.best!.ach)}`}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
              style={{ backgroundColor: overall.bestSub.best!.ach >= 100 ? '#059669' : overall.bestSub.best!.ach >= 80 ? '#d97706' : '#dc2626' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Pencapaian Tertinggi</span>
              </div>
              <p className="text-sm font-bold text-gray-800 leading-tight">{overall.bestSub.subName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-black tabular-nums" style={{ color: overall.bestSub.best!.ach >= 100 ? '#059669' : '#d97706' }}>
                  {overall.bestSub.best!.ach.toFixed(1)}%
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 font-semibold text-gray-600">
                  {overall.bestSub.best!.unitLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Worst Achievement */}
        {overall.worstSub && (
          <div className={`relative overflow-hidden rounded-xl border p-4 ${achBg(overall.worstSub.worst!.ach)}`}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
              style={{ backgroundColor: '#dc2626' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Pencapaian Terendah</span>
              </div>
              <p className="text-sm font-bold text-gray-800 leading-tight">{overall.worstSub.subName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-black tabular-nums text-red-600">
                  {overall.worstSub.worst!.ach.toFixed(1)}%
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 font-semibold text-gray-600">
                  {overall.worstSub.worst!.unitLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Average Overview */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-emerald-500 opacity-5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Medal className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Rata-rata Keseluruhan</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tabular-nums text-gray-800">
                {units.length > 0 ? (units.reduce((s, u) => s + u.total_kpi, 0) / units.length).toFixed(1) : "0"}
              </span>
              <span className="text-xs text-gray-400 font-medium">KPI Score</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-gray-500">
                  {units.filter((u) => u.total_kpi >= 85).length} unit baik
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-500">
                  {units.filter((u) => u.total_kpi < 55).length} unit kritis
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DETAILED BREAKDOWN BY GROUP ── */}
      {KOMPONEN_GROUPS.map((group) => {
        const groupSubs = grouped.get(group.name);
        if (!groupSubs || groupSubs.length === 0) return null;
        return (
          <div key={group.no} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Group Header */}
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {group.no}
              </span>
              <h3 className="text-xs font-bold text-gray-700">{group.name}</h3>
              <span className="text-[10px] text-gray-400 ml-auto">{groupSubs.length} sub-komponen</span>
            </div>

            {/* Sub-komponen rows */}
            <div className="divide-y divide-gray-50">
              {groupSubs.map((sub) => {
                const maxAch = Math.max(sub.best?.ach || 0, 100); // cap bar at 100%
                const barWidth = (sub.best?.ach || 0) / maxAch * 100;

                return (
                  <div key={sub.subName} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Sub name + avg bar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-800 truncate">{sub.subName}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 max-w-[140px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${achBarColor(sub.avgAch)}`}
                              style={{ width: `${Math.min(sub.avgAch, 120) / 1.2}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold tabular-nums ${achColor(sub.avgAch)}`}>
                            rata-rata {sub.avgAch.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Right: Best & Worst */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Best */}
                        {sub.best && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${achBg(sub.best.ach)}`}>
                            <ArrowUpRight className={`h-3 w-3 ${achColor(sub.best.ach)}`} />
                            <div className="text-right">
                              <p className="text-[9px] text-gray-400 leading-none">{sub.best.unitLabel}</p>
                              <p className={`text-[11px] font-bold tabular-nums leading-tight mt-0.5 ${achColor(sub.best.ach)}`}>
                                {sub.best.ach.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Worst */}
                        {sub.worst && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${achBg(sub.worst.ach)}`}>
                            <ArrowDownRight className={`h-3 w-3 ${achColor(sub.worst.ach)}`} />
                            <div className="text-right">
                              <p className="text-[9px] text-gray-400 leading-none">{sub.worst.unitLabel}</p>
                              <p className={`text-[11px] font-bold tabular-nums leading-tight mt-0.5 ${achColor(sub.worst.ach)}`}>
                                {sub.worst.ach.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unit breakdown mini row */}
                    {sub.allUnits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sub.allUnits
                          .sort((a, b) => b.ach - a.ach)
                          .map((u) => (
                            <span
                              key={u.unitCode}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${achBadge(u.ach)}`}
                            >
                              {u.unitLabel} {u.ach.toFixed(0)}%
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}