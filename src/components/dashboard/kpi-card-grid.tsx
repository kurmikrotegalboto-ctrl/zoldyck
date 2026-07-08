"use client";

import React from "react";
import type { KpiUnit, SnapshotData } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub, getAchBadge, getUnitBadge } from "@/lib/kpi-types";

interface KpiCardGridProps {
  unit: KpiUnit;
  unitLabel: string;
  prevUnit?: KpiUnit;
}

export function KpiCardGrid({ unit, unitLabel, prevUnit }: KpiCardGridProps) {
  const unitBadge = getUnitBadge(unit.total_kpi);
  const totalDelta = prevUnit ? parseFloat((unit.total_kpi - prevUnit.total_kpi).toFixed(2)) : 0;

  return (
    <div className="space-y-4">
      {/* Unit summary header */}
      <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-gray-800">{unitLabel}</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {unit.components.filter(c => c.bobot > 0).length} komponen aktif
          </p>
        </div>
        <div className="flex items-center gap-3">
          {prevUnit && (
            <span className={`text-xs font-semibold ${totalDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalDelta >= 0 ? "▲" : "▼"} {Math.abs(totalDelta).toFixed(2)}
            </span>
          )}
          <span className={`text-2xl font-black ${unit.total_kpi >= 85 ? "text-emerald-600" : unit.total_kpi >= 70 ? "text-amber-600" : unit.total_kpi >= 55 ? "text-orange-600" : "text-red-600"}`}>
            {unit.total_kpi.toFixed(2)}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${unitBadge.bg} ${unitBadge.text}`}>
            {unitBadge.label}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {KOMPONEN_GROUPS.map((group) => (
          group.subKomponen.map((sub) => {
            const comp = getKpiForSub(unit, sub);
            const prevComp = prevUnit ? getKpiForSub(prevUnit, sub) : undefined;
            const bobot = comp?.bobot ?? 0;
            const isInactive = bobot === 0;

            if (isInactive) return null;

            const ach = comp?.ach ?? 0;
            const badge = getAchBadge(ach, bobot);
            const achPct = ach * 100;
            const kpiScore = comp?.kpi_score ?? 0;
            const prevKpiScore = prevComp?.kpi_score ?? kpiScore;
            const delta = prevComp ? parseFloat((kpiScore - prevKpiScore).toFixed(2)) : 0;
            const capping = CAPPING_MAP[sub] || "-";
            const realisasi = comp?.realisasi ?? 0;
            const target = comp?.target ?? 0;
            const selisih = realisasi - target;

            return (
              <div
                key={sub}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-3 flex flex-col"
              >
                {/* Badge & komponen group */}
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">{group.name}</span>
                </div>

                {/* Sub komponen name */}
                <h3 className="text-[11px] font-bold text-gray-700 leading-tight mb-2 line-clamp-2 min-h-[2rem]">
                  {sub}
                </h3>

                {/* ACH% big */}
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black tabular-nums ${
                      achPct >= 100 ? "text-emerald-600" :
                      achPct >= 80 ? "text-amber-600" :
                      achPct >= 50 ? "text-orange-600" : "text-red-600"
                    }`}>
                      {achPct.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">%</span>
                  </div>

                  {/* KPI Score */}
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                    <div className="text-[10px] text-gray-500">
                      <span className="font-medium text-gray-600">{kpiScore.toFixed(2)}</span> pts
                    </div>
                    {prevComp && (
                      <span className={`text-[10px] font-semibold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Target vs Realisasi */}
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-gray-400">
                      {formatNum(target)} / {formatNum(realisasi)}
                    </span>
                    <span className={selisih >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                      {selisih >= 0 ? "+" : ""}{formatNum(selisih)}
                    </span>
                  </div>

                  {/* Capping */}
                  <div className="mt-1 text-[9px] text-gray-300">
                    Cap: {capping} · Bobot: {bobot}
                  </div>
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.?0+$/, "") + "M";
  }
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.?0+$/, "") + "Jt";
  }
  if (Math.abs(n) >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "Rb";
  }
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}