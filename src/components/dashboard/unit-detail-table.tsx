"use client";

import React, { useMemo } from "react";
import type { KpiUnit, SnapshotData } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "@/lib/kpi-types";

interface UnitDetailTableProps {
  unit: KpiUnit;
  unitLabel: string;
  prevUnit?: KpiUnit;
}

export function UnitDetailTable({ unit, unitLabel, prevUnit }: UnitDetailTableProps) {
  const rows = useMemo(() => {
    const result: {
      no: number | null;
      komponen: string;
      subKomponen: string;
      capping: string;
      bobot: number;
      target: number;
      exceed: number;
      realisasi: number;
      achPct: number;
      kpiKemarin: number;
      kpiHariIni: number;
      delta: number;
      selisihTarget: number;
      selisihExceed: number;
      isInactive: boolean;
    }[] = [];

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

        // Compute exceed target (110% of RKAP for capped, unlimited means no exceed)
        const capping = CAPPING_MAP[sub] || "-";
        let exceed = 0;
        if (capping === "110") {
          exceed = target * 1.1;
        } else if (capping === "Unlimited") {
          exceed = target * 1.1; // 10% above RKAP
        }

        const selisihTarget = realisasi - target;
        const selisihExceed = realisasi - exceed;

        const isInactive = bobot === 0;

        result.push({
          no: subIdx === 0 ? group.no : null,
          komponen: subIdx === 0 ? group.name : "",
          subKomponen: sub,
          capping,
          bobot,
          target,
          exceed,
          realisasi,
          achPct,
          kpiKemarin,
          kpiHariIni,
          delta,
          selisihTarget,
          selisihExceed,
          isInactive,
        });
      });
    });

    return result;
  }, [unit, prevUnit]);

  const totalKemarin = prevUnit?.total_kpi ?? unit.total_kpi;
  const totalHariIni = unit.total_kpi;
  const totalDelta = prevUnit ? parseFloat((totalHariIni - totalKemarin).toFixed(2)) : 0;

  return (
    <div className="w-full overflow-hidden rounded-md border">
      {/* Unit header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        <span className="text-sm font-bold">{unitLabel}</span>
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span>
            Total KPI: <strong className={totalHariIni >= 85 ? "text-emerald-600" : totalHariIni >= 70 ? "text-amber-600" : totalHariIni >= 55 ? "text-orange-600" : "text-red-600"}>{totalHariIni.toFixed(2)}</strong>
          </span>
          {prevUnit && (
            <span>
              Delta: <DeltaValue value={totalDelta} />
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse" style={{ fontFamily: "Calibri, sans-serif", minWidth: "900px" }}>
          <thead>
            {/* Row 1: Merged headers */}
            <tr>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", width: "30px" }}>NO</th>
              <th rowSpan={2} className="text-left text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", minWidth: "150px" }}>KOMPONEN KPI</th>
              <th rowSpan={2} className="text-left text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", minWidth: "180px" }}>SUB KOMPONEN KPI</th>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", width: "60px" }}>CAPPING</th>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", width: "50px" }}>BOBOT KPI</th>
              <th colSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>TARGET</th>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", minWidth: "120px" }}>REALISASI</th>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", width: "60px" }}>ACH (%)</th>
              <th colSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>KPI TAHUNAN</th>
              <th rowSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white", width: "60px" }}>DELTA HARIAN</th>
              <th colSpan={2} className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>SELISIH TARGET</th>
            </tr>
            {/* Row 2: Sub-headers */}
            <tr>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>RKAP</th>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>EXCEED</th>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>KEMARIN</th>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>HARI INI</th>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>RKAP</th>
              <th className="text-center text-[10px] font-bold p-1 border-b border-gray-300" style={{ backgroundColor: "#00863D", color: "white" }}>EXCEED</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <tr key={row.subKomponen} className={`${isEven ? "bg-white" : "bg-gray-50/60"} ${row.isInactive ? "opacity-50" : ""}`}>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
                    {row.no !== null ? row.no : ""}
                  </td>
                  <td className="text-left p-1.5 border-b border-gray-100 text-[11px] font-semibold whitespace-nowrap">
                    {row.komponen}
                  </td>
                  <td className="text-left p-1.5 border-b border-gray-100 text-[11px] whitespace-nowrap">
                    {row.subKomponen}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px] text-gray-500">
                    {row.capping}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px] font-semibold">
                    {row.bobot > 0 ? row.bobot : "-"}
                  </td>
                  <td className="text-right p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : formatNumber(row.target)}
                  </td>
                  <td className="text-right p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : formatNumber(row.exceed)}
                  </td>
                  <td className="text-right p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : formatNumber(row.realisasi)}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
                    {row.isInactive ? "-" : (
                      <AchCell value={row.achPct} />
                    )}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : row.kpiKemarin.toFixed(2)}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px] tabular-nums font-semibold">
                    {row.isInactive ? "-" : row.kpiHariIni.toFixed(2)}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
                    {row.isInactive ? "-" : <DeltaValue value={row.delta} />}
                  </td>
                  <td className="text-right p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : <SelisihValue value={row.selisihTarget} />}
                  </td>
                  <td className="text-right p-1.5 border-b border-gray-100 text-[11px] tabular-nums">
                    {row.isInactive ? "-" : <SelisihValue value={row.selisihExceed} />}
                  </td>
                </tr>
              );
            })}
            {/* TOTAL ROW */}
            <tr style={{ backgroundColor: "#00863D" }}>
              <td colSpan={4} className="text-left p-2 text-[11px] font-bold" style={{ color: "white" }}>
                TOTAL
              </td>
              <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>100</td>
              <td colSpan={3} style={{ backgroundColor: "#00863D" }}></td>
              <td style={{ backgroundColor: "#00863D" }}></td>
              <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
                {totalKemarin.toFixed(2)}
              </td>
              <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
                {totalHariIni.toFixed(2)}
              </td>
              <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
                {totalDelta > 0 ? "+" : ""}{totalDelta.toFixed(2)}
              </td>
              <td colSpan={2} style={{ backgroundColor: "#00863D" }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeltaValue({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400">0.00</span>;
  if (value > 0) return <span className="text-emerald-600 font-medium">+{value.toFixed(2)}</span>;
  return <span className="text-red-600 font-medium">{value.toFixed(2)}</span>;
}

function SelisihValue({ value }: { value: number }) {
  if (value >= 0) return <span className="text-emerald-600">{formatNumber(value)}</span>;
  return <span className="text-red-600">({formatNumber(Math.abs(value))})</span>;
}

function AchCell({ value }: { value: number }) {
  const cls = value >= 100
    ? "text-emerald-600 font-semibold"
    : value >= 80
    ? "text-amber-600"
    : value >= 50
    ? "text-orange-600"
    : "text-red-600 font-semibold";
  return <span className={cls}>{value.toFixed(2)}%</span>;
}

function formatNumber(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + " M";
  }
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + " Jt";
  }
  if (Math.abs(n) >= 1_000) {
    return n.toLocaleString("id-ID");
  }
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}