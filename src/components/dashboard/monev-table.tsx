"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Table2, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_SUB_KOMPONEN, KOMPONEN_GROUPS } from "@/lib/kpi-types";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";

interface MonevTableProps {
  snapshots: SnapshotData[];
}

interface MonevRow {
  outletCode: string;
  outletName: string;
  targetTahunan: number;
  realisasiA: number;
  realisasiB: number;
  selisih: number;
  ach: number;
  harian: number;
}

type SortKey = "outlet" | "target" | "realB" | "selisih" | "ach";
type SortDir = "asc" | "desc";

function getGroupForSub(subName: string): string {
  for (const g of KOMPONEN_GROUPS) {
    if (g.subKomponen.includes(subName)) return g.name;
  }
  return "";
}

function formatNum(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatAch(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function achColor(ach: number): string {
  if (ach >= 1.0) return "text-emerald-700 font-bold";
  if (ach >= 0.8) return "text-amber-700";
  if (ach >= 0.5) return "text-orange-700";
  return "text-red-700 font-bold";
}

function achBg(ach: number): string {
  if (ach >= 1.0) return "bg-emerald-50";
  if (ach >= 0.8) return "bg-amber-50";
  if (ach >= 0.5) return "bg-orange-50";
  return "bg-red-50";
}

export function MonevTable({ snapshots }: MonevTableProps) {
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [dateIndexA, setDateIndexA] = useState<number>(0);
  const [dateIndexB, setDateIndexB] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey>("outlet");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Available sub-komponen (only those that exist in data)
  const availableSubs = useMemo(() => {
    const nameSet = new Set<string>();
    snapshots.forEach((snap) => {
      snap.units.forEach((u) => {
        u.components.forEach((c) => {
          if (c.bobot > 0) nameSet.add(c.kpi_name);
        });
      });
    });
    return ALL_SUB_KOMPONEN.filter((name) => nameSet.has(name));
  }, [snapshots]);

  // Date list
  const dateList = useMemo(
    () => snapshots.map((s) => ({ label: s.date, sort: s.dateSort })),
    [snapshots]
  );

  // Set defaults
  const effectiveDateA = dateIndexA;
  const effectiveDateB = dateIndexB;

  // Get 2 snapshots
  const snapA = snapshots[effectiveDateA];
  const snapB = snapshots[effectiveDateB];

  // Calculate remaining working days in year
  const remainingDays = useMemo(() => {
    if (!snapB) return 1;
    const now = new Date(snapB.dateSort);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    // Approximate working days (exclude weekends)
    let count = 0;
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    while (d <= endOfYear) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return Math.max(count, 1);
  }, [snapB]);

  // Build rows
  const rows = useMemo<MonevRow[]>(() => {
    if (!selectedSub || !snapA || !snapB) return [];

    const result: MonevRow[] = [];

    // Collect all units from both snapshots
    const unitMapA = new Map<string, KpiUnit>();
    const unitMapB = new Map<string, KpiUnit>();
    snapA.units.forEach((u) => unitMapA.set(u.code, u));
    snapB.units.forEach((u) => unitMapB.set(u.code, u));

    const allCodes = new Set([...unitMapA.keys(), ...unitMapB.keys()]);

    allCodes.forEach((code) => {
      const uA = unitMapA.get(code);
      const uB = unitMapB.get(code);
      const compA = uA?.components.find((c) => c.kpi_name === selectedSub);
      const compB = uB?.components.find((c) => c.kpi_name === selectedSub);

      // Need at least one side with data
      if (!compA && !compB) return;

      const target = compB?.target || compA?.target || 0;
      const realA = compA?.realisasi || 0;
      const realB = compB?.realisasi || 0;
      const selisih = realB - realA;
      const ach = target > 0 ? realB / target : 0;
      const gap = target - realB;
      const harian = gap > 0 ? gap / remainingDays : 0;

      result.push({
        outletCode: code,
        outletName: uB?.name || uA?.name || code,
        targetTahunan: target,
        realisasiA: realA,
        realisasiB: realB,
        selisih,
        ach,
        harian,
      });
    });

    return result;
  }, [selectedSub, snapA, snapB, remainingDays]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "outlet": cmp = a.outletName.localeCompare(b.outletName); break;
        case "target": cmp = a.targetTahunan - b.targetTahunan; break;
        case "realB": cmp = a.realisasiB - b.realisasiB; break;
        case "selisih": cmp = a.selisih - b.selisih; break;
        case "ach": cmp = a.ach - b.ach; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  // Totals
  const totals = useMemo(() => {
    if (rows.length === 0) return null;
    const t = rows.reduce(
      (acc, r) => ({
        target: acc.target + r.targetTahunan,
        realA: acc.realA + r.realisasiA,
        realB: acc.realB + r.realisasiB,
        selisih: acc.selisih + r.selisih,
      }),
      { target: 0, realA: 0, realB: 0, selisih: 0 }
    );
    return {
      ...t,
      ach: t.target > 0 ? t.realB / t.target : 0,
      harian: t.target - t.realB > 0 ? (t.target - t.realB) / remainingDays : 0,
    };
  }, [rows, remainingDays]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-2.5 w-2.5 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronDown className="h-3 w-3 text-emerald-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-emerald-600 rotate-180" />
    );
  };

  const groupName = selectedSub ? getGroupForSub(selectedSub) : "";

  if (snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
        <Table2 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Minimal 2 periode data diperlukan</p>
        <p className="text-xs mt-1 text-gray-300">
          Upload minimal 2 file KPI untuk menggunakan Monev Komponen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-800">Monev Komponen</h2>
          {groupName && (
            <p className="text-[11px] text-gray-400 mt-0.5">{groupName}</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Sub-komponen dropdown */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Sub Komponen
          </label>
          <Select value={selectedSub} onValueChange={setSelectedSub}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Pilih sub komponen..." />
            </SelectTrigger>
            <SelectContent>
              {KOMPONEN_GROUPS.map((group) => (
                <div key={group.no}>
                  <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                    {group.no}. {group.name}
                  </div>
                  {group.subKomponen
                    .filter((sub) => availableSubs.includes(sub))
                    .map((sub) => (
                      <SelectItem key={sub} value={sub} className="text-xs pl-6">
                        {sub}
                      </SelectItem>
                    ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date A */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Periode Awal
          </label>
          <Select
            value={String(effectiveDateA)}
            onValueChange={(v) => setDateIndexA(Number(v))}
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateList.map((d, i) => (
                <SelectItem key={d.sort} value={String(i)} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date B */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Periode Akhir
          </label>
          <Select
            value={String(effectiveDateB)}
            onValueChange={(v) => setDateIndexB(Number(v))}
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateList.map((d, i) => (
                <SelectItem key={d.sort} value={String(i)} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {selectedSub && rows.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                  <th className="text-left px-3 py-2.5 font-semibold w-44">
                    <button onClick={() => handleSort("outlet")} className="inline-flex items-center gap-1 hover:text-emerald-200">
                      OUTLET <SortIcon col="outlet" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold w-32">
                    <button onClick={() => handleSort("target")} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-200">
                      Target Tahunan <SortIcon col="target" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold w-28">
                    {snapA?.date || "Awal"}
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold w-28">
                    <button onClick={() => handleSort("realB")} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-200">
                      {snapB?.date || "Akhir"} <SortIcon col="realB" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold w-24">
                    <button onClick={() => handleSort("selisih")} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-200">
                      Selisih <SortIcon col="selisih" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold w-20">
                    <button onClick={() => handleSort("ach")} className="inline-flex items-center gap-1 hover:text-emerald-200">
                      ACH <SortIcon col="ach" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold w-24">
                    Harian
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, idx) => (
                  <tr
                    key={r.outletCode}
                    className={`border-b border-gray-100 transition-colors hover:bg-emerald-50/40 ${
                      idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                      {r.outletName}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                      {formatNum(r.targetTahunan)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                      {formatNum(r.realisasiA)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-700">
                      {formatNum(r.realisasiB)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={r.selisih >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {r.selisih >= 0 ? "+" : ""}
                        {formatNum(r.selisih)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] tabular-nums ${achColor(r.ach)} ${achBg(r.ach)}`}
                      >
                        {formatAch(r.ach)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                      {r.harian > 0 ? formatNum(Math.ceil(r.harian)) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total */}
              {totals && (
                <tfoot>
                  <tr className="bg-emerald-600 text-white font-bold">
                    <td className="px-3 py-2.5">Grand Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNum(totals.target)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-100">
                      {formatNum(totals.realA)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNum(totals.realB)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {totals.selisih >= 0 ? "+" : ""}
                      {formatNum(totals.selisih)}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {formatAch(totals.ach)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-100">
                      {totals.harian > 0 ? formatNum(Math.ceil(totals.harian)) : "-"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : selectedSub && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-gray-400">
          <p className="text-sm">Tidak ada data untuk sub komponen ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-gray-400">
          <Table2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Pilih sub komponen dari dropdown di atas</p>
        </div>
      )}
    </div>
  );
}