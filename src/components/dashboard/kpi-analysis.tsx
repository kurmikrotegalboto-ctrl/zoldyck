"use client";

import { useMemo } from "react";
import { Table2, ChevronDown, ChevronUp, Medal, AlertTriangle } from "lucide-react";
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

function getUnitLabel(code: string): string {
  return UNIT_LABELS[code] || code;
}

function formatNum(n: number, satuan?: string): string {
  if (n === 0) return "-";
  if (satuan === "%") {
    // Show raw decimal value without rounding
    return n.toLocaleString("id-ID", { maximumFractionDigits: 10, minimumFractionDigits: 2 });
  }
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function achColor(ach: number): string {
  if (ach >= 100) return "text-emerald-700 font-bold";
  if (ach >= 80) return "text-amber-700";
  if (ach >= 50) return "text-orange-700";
  return "text-red-700 font-bold";
}

function achBg(ach: number): string {
  if (ach >= 100) return "bg-emerald-50";
  if (ach >= 80) return "bg-amber-50";
  if (ach >= 50) return "bg-orange-50";
  return "bg-red-50";
}

function achBadge(ach: number): string {
  if (ach >= 100) return "bg-emerald-100 text-emerald-800";
  if (ach >= 80) return "bg-amber-100 text-amber-800";
  if (ach >= 50) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

interface UnitRow {
  rank: number;
  unitCode: string;
  unitLabel: string;
  ach: number;
  realisasi: number;
  target: number;
  bobot: number;
  satuan: string;
}

function buildUnitRows(subName: string, units: KpiUnit[]): { rows: UnitRow[]; bobot: number; satuan: string } {
  const rows: UnitRow[] = [];
  let bobot = 0;
  let satuan = "";

  units.forEach((unit) => {
    const comp = getKpiForSub(unit, subName);
    if (comp && comp.bobot > 0) {
      bobot = comp.bobot;
      satuan = comp.satuan;
      rows.push({
        rank: 0,
        unitCode: unit.code,
        unitLabel: getUnitLabel(unit.code),
        ach: comp.ach * 100,
        realisasi: comp.realisasi,
        target: comp.target,
        bobot: comp.bobot,
        satuan: comp.satuan,
      });
    }
  });

  // Sort by ACH descending
  rows.sort((a, b) => b.ach - a.ach);

  // Assign ranks
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  return { rows, bobot, satuan };
}

function SubKomponenCard({
  subName,
  groupNo,
  groupName,
  rows,
  bobot,
  satuan,
}: {
  subName: string;
  groupNo: number;
  groupName: string;
  rows: UnitRow[];
  bobot: number;
  satuan: string;
}) {
  if (rows.length === 0) return null;

  // Best and worst for medal/warning icons
  const best = rows[0];
  const worst = rows[rows.length - 1];

  // Calculate averages
  const avgAch = rows.reduce((s, r) => s + r.ach, 0) / rows.length;
  const avgReal = rows.reduce((s, r) => s + r.realisasi, 0) / rows.length;
  const avgTarget = rows.reduce((s, r) => s + r.target, 0) / rows.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Card header - green bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
            {groupNo}
          </span>
          <h3 className="text-xs font-bold text-white">{subName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {bobot > 0 && (
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">
              Bobot {bobot}%
            </span>
          )}
          {satuan && (
            <span className="text-[10px] bg-white/15 text-emerald-100 px-2 py-0.5 rounded-full">
              {satuan}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-center px-3 py-2 font-semibold text-gray-500 w-12">#</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">OUTLET</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-500 w-24">ACH</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 w-32">REALISASI</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 w-32">TARGET</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.unitCode}
                className={`border-b border-gray-50 transition-colors hover:bg-emerald-50/30 ${
                  idx % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                }`}
              >
                {/* Rank */}
                <td className="px-3 py-2 text-center">
                  {r.rank === 1 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700">
                      <Medal className="h-3 w-3" />
                    </span>
                  ) : r.rank === rows.length ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <span className="text-gray-400 tabular-nums">{r.rank}</span>
                  )}
                </td>
                {/* Outlet name */}
                <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                  {r.unitLabel}
                </td>
                {/* ACH with badge */}
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] tabular-nums ${achColor(r.ach)} ${achBg(r.ach)}`}
                  >
                    {r.ach.toFixed(1)}%
                  </span>
                </td>
                {/* Realisasi */}
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {formatNum(r.realisasi, r.satuan)}
                </td>
                {/* Target */}
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {formatNum(r.target, r.satuan)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Average row */}
          <tfoot>
            <tr className="bg-gray-100 border-t border-gray-200">
              <td className="px-3 py-2 text-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase">avg</span>
              </td>
              <td className="px-3 py-2 font-semibold text-gray-600 text-[10px] uppercase tracking-wide">
                Rata-rata
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] tabular-nums ${achColor(avgAch)} ${achBg(avgAch)}`}
                >
                  {avgAch.toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600 font-medium">
                {formatNum(avgReal, satuan)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                {formatNum(avgTarget, satuan)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function KpiAnalysis({ units, date }: KpiAnalysisProps) {
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
        <Table2 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Belum ada data unit</p>
      </div>
    );
  }

  // Build data per sub-komponen, maintaining KOMPONEN_GROUPS order
  const cards = useMemo(() => {
    const result: {
      subName: string;
      groupNo: number;
      groupName: string;
      rows: UnitRow[];
      bobot: number;
      satuan: string;
    }[] = [];

    KOMPONEN_GROUPS.forEach((group) => {
      group.subKomponen.forEach((subName) => {
        const { rows, bobot, satuan } = buildUnitRows(subName, units);
        if (rows.length > 0) {
          result.push({
            subName,
            groupNo: group.no,
            groupName: group.name,
            rows,
            bobot,
            satuan,
          });
        }
      });
    });

    return result;
  }, [units]);

  // Summary stats
  const totalActive = cards.length;
  const allBestAch = cards.map(c => c.rows[0]?.ach || 0);
  const overallBestAch = Math.max(...allBestAch);
  const allWorstAch = cards.map(c => c.rows[c.rows.length - 1]?.ach || 999);
  const overallWorstAch = Math.min(...allWorstAch);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-800">Analisis KPI</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Ranking ACH per sub komponen &middot; {units.length} outlet &middot; Periode {date}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Medal className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] text-gray-500">Terbaik</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[10px] text-gray-500">Terendah</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {cards.map((card) => (
          <SubKomponenCard
            key={card.subName}
            subName={card.subName}
            groupNo={card.groupNo}
            groupName={card.groupName}
            rows={card.rows}
            bobot={card.bobot}
            satuan={card.satuan}
          />
        ))}
      </div>
    </div>
  );
}