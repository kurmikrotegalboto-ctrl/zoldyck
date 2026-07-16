"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table2, ArrowUpDown, ChevronDown, ChevronRight, Check, Search, X,
  Download, Loader2, CalendarDays, TrendingUp, Target, BarChart3, ChevronUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ALL_SUB_KOMPONEN, KOMPONEN_GROUPS } from "@/lib/kpi-types";
import type { SnapshotData, KpiUnit, KpiComponent } from "@/lib/kpi-types";

// ─── Types ───────────────────────────────────────────────────

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
  selisihRkap: number;
  pencapaianHarian: number;
  targetHarian: number;
}

type SortKey = "outlet" | "target" | "realB" | "selisih" | "ach" | "selisihRkap";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

// ─── Helpers ─────────────────────────────────────────────────

function getGroupForSub(subName: string): { no: number; name: string } | null {
  for (const g of KOMPONEN_GROUPS) {
    if (g.subKomponen.includes(subName)) return { no: g.no, name: g.name };
  }
  return null;
}

function getSubInfo(subName: string, snapshots: SnapshotData[]): { bobot: number; satuan: string } {
  for (const snap of snapshots) {
    for (const unit of snap.units) {
      const comp = unit.components.find(c => c.kpi_name === subName);
      if (comp && comp.bobot > 0) return { bobot: comp.bobot, satuan: comp.satuan };
    }
  }
  return { bobot: 0, satuan: "" };
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

function achBarColor(ach: number): string {
  if (ach >= 1.0) return "bg-emerald-500";
  if (ach >= 0.8) return "bg-amber-400";
  if (ach >= 0.5) return "bg-orange-400";
  return "bg-red-500";
}

function achBarBg(ach: number): string {
  if (ach >= 1.0) return "bg-emerald-100";
  if (ach >= 0.8) return "bg-amber-100";
  if (ach >= 0.5) return "bg-orange-100";
  return "bg-red-100";
}

function achBadgeClass(ach: number): string {
  if (ach >= 1.0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (ach >= 0.8) return "bg-amber-50 text-amber-700 border-amber-200";
  if (ach >= 0.5) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function calcPeriodWorkDays(dateAStr: string, dateBStr: string): number {
  const start = new Date(dateAStr);
  const end = new Date(dateBStr);
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function calcRemainingWorkDays(dateBStr: string): number {
  const start = new Date(dateBStr);
  const endOfYear = new Date(2026, 10, 30); // 30 November 2026 (fixed)
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= endOfYear) {
    const day = d.getDay();
    if (day !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function buildRows(
  subName: string,
  snapA: SnapshotData,
  snapB: SnapshotData,
  periodWorkDays: number,
  remainingWorkDays: number
): MonevRow[] {
  const result: MonevRow[] = [];
  const unitMapA = new Map<string, KpiUnit>();
  const unitMapB = new Map<string, KpiUnit>();
  snapA.units.forEach((u) => unitMapA.set(u.code, u));
  snapB.units.forEach((u) => unitMapB.set(u.code, u));

  const allCodes = new Set([...unitMapA.keys(), ...unitMapB.keys()]);
  allCodes.forEach((code) => {
    const uA = unitMapA.get(code);
    const uB = unitMapB.get(code);
    const name = uB?.name || uA?.name || "";
    if (/^cp\s+tegalboto/i.test(name)) return;
    const compA = uA?.components.find((c) => c.kpi_name === subName);
    const compB = uB?.components.find((c) => c.kpi_name === subName);
    if (!compA && !compB) return;

    const target = compB?.target || compA?.target || 0;
    const realA = compA?.realisasi || 0;
    const realB = compB?.realisasi || 0;
    const selisih = realB - realA;
    const ach = target > 0 ? realB / target : 0;
    const selisihRkap = target - realB;
    const gap = selisihRkap;
    const pencapaianHarian = selisih / periodWorkDays;
    const targetHarian = gap > 0 ? gap / remainingWorkDays : 0;

    result.push({
      outletCode: code,
      outletName: uB?.name || uA?.name || code,
      targetTahunan: target,
      realisasiA: realA,
      realisasiB: realB,
      selisih,
      ach,
      selisihRkap,
      pencapaianHarian,
      targetHarian,
    });
  });
  return result;
}

function sortRows(rows: MonevRow[], sort: SortState): MonevRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort.key) {
      case "outlet": cmp = a.outletName.localeCompare(b.outletName); break;
      case "target": cmp = a.targetTahunan - b.targetTahunan; break;
      case "realB": cmp = a.realisasiB - b.realisasiB; break;
      case "selisih": cmp = a.selisih - b.selisih; break;
      case "ach": cmp = a.ach - b.ach; break;
      case "selisihRkap": cmp = a.selisihRkap - b.selisihRkap; break;
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function calcTotals(rows: MonevRow[], periodWorkDays: number, remainingWorkDays: number) {
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
    selisihRkap: t.target - t.realB,
    pencapaianHarian: t.selisih / periodWorkDays,
    targetHarian: t.target - t.realB > 0 ? (t.target - t.realB) / remainingWorkDays : 0,
  };
}

// ─── Sort Icon ───────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-2.5 w-2.5 text-gray-300" />;
  return dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-emerald-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-emerald-600" />
  );
}

// ─── Compact Sort Button ──────────────────────────────────────

function SortBtn({ label, sortKey, currentSort, onSort }: {
  label: string; sortKey: SortKey; currentSort: SortState; onSort: (k: SortKey) => void;
}) {
  const active = currentSort.key === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-0.5 transition-colors ${active ? "text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
    >
      <span className="hidden xl:inline text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      <span className="xl:hidden text-[10px] font-semibold">{label}</span>
      <SortIcon active={active} dir={currentSort.dir} />
    </button>
  );
}

// ─── ACH Progress Bar ────────────────────────────────────────

function AchBar({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const pct = Math.min(value * 100, 120);
  const w = size === "sm" ? "w-16" : "w-24";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`inline-flex items-center gap-1.5`}>
      <div className={`${w} ${h} ${achBarBg(value)} rounded-full overflow-hidden`}>
        <div
          className={`${h} ${achBarColor(value)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`tabular-nums font-semibold ${size === "sm" ? "text-[11px]" : "text-xs"} ${achColor(value)}`}>
        {formatAch(value)}
      </span>
    </div>
  );
}

// ─── Sub-Komponen Collapsible Card ──────────────────────────

function SubTable({
  subName,
  rows,
  sort,
  onSort,
  snapA,
  snapB,
  periodWorkDays,
  remainingWorkDays,
  defaultOpen = true,
}: {
  subName: string;
  rows: MonevRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  snapA: SnapshotData;
  snapB: SnapshotData;
  periodWorkDays: number;
  remainingWorkDays: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sorted = sortRows(rows, sort);
  const totals = calcTotals(rows, periodWorkDays, remainingWorkDays);
  const group = getGroupForSub(subName);
  const info = getSubInfo(subName, [snapA, snapB]);

  // Summary stats for card header
  const avgAch = rows.length > 0 ? rows.reduce((s, r) => s + r.ach, 0) / rows.length : 0;
  const achieved = rows.filter(r => r.ach >= 1.0).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      {/* ── Card Header (clickable) ── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:via-emerald-700 hover:to-teal-700 transition-all"
      >
        {/* Collapse icon */}
        <div className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <ChevronRight className="h-4 w-4" />
        </div>

        {/* Group badge */}
        {group && (
          <span className="text-[9px] font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
            {group.no}
          </span>
        )}

        {/* Sub name */}
        <span className="text-xs font-bold flex-1 text-left">{subName}</span>

        {/* Inline stats */}
        <div className="hidden sm:flex items-center gap-3">
          {info.bobot > 0 && (
            <span className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full">
              Bobot {info.bobot}%
            </span>
          )}
          {info.satuan && (
            <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full">
              {info.satuan}
            </span>
          )}
          <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full">
            {achieved}/{rows.length} capai
          </span>
        </div>

        {/* Average ACH mini badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          avgAch >= 1.0 ? "bg-white/25" : avgAch >= 0.8 ? "bg-amber-400/30" : "bg-red-400/30"
        }`}>
          AVG {formatAch(avgAch)}
        </span>
      </button>

      {/* ── Table (collapsible) ── */}
      {open && (
        <div>
          {/* Mini stat pills */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50/80 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <BarChart3 className="h-3 w-3" />
              <span className="font-medium">{rows.length} outlet</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Target className="h-3 w-3" />
              <span className="font-medium">{snapA.date} → {snapB.date}</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <CalendarDays className="h-3 w-3" />
              <span className="font-medium">{periodWorkDays} hr periode · {remainingWorkDays} hr sisa</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 w-44">
                    <SortBtn label="Outlet" sortKey="outlet" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-28">
                    <SortBtn label="Target" sortKey="target" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-24">
                    <span className="text-[10px] text-gray-400">{snapA.date}</span>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-24">
                    <SortBtn label={snapB.date} sortKey="realB" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-22">
                    <SortBtn label="Selisih" sortKey="selisih" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-28">
                    <SortBtn label="ACH" sortKey="ach" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-24">
                    <SortBtn label="Sisa RKAP" sortKey="selisihRkap" currentSort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-24">
                    <span className="text-[10px] text-gray-400">Harian</span>
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-28">
                    <span className="text-[10px] text-gray-400">Target/Hr ({remainingWorkDays})</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => (
                  <tr
                    key={r.outletCode}
                    className={`border-b border-gray-50/80 transition-colors hover:bg-emerald-50/30 ${
                      idx % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap text-[11px]">
                      {r.outletName}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                      {formatNum(r.targetTahunan)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                      {formatNum(r.realisasiA)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-700">
                      {formatNum(r.realisasiB)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={r.selisih >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {r.selisih >= 0 ? "+" : ""}{formatNum(r.selisih)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <AchBar value={r.ach} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={r.selisihRkap >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {r.selisihRkap >= 0 ? "+" : ""}{formatNum(r.selisihRkap)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                      {r.pencapaianHarian !== 0 ? formatNum(r.pencapaianHarian) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                      {r.targetHarian > 0 ? formatNum(r.targetHarian) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                    <td className="px-3 py-2.5 font-bold text-xs">TOTAL</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      {formatNum(totals.target)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-200">
                      {formatNum(totals.realA)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold">
                      {formatNum(totals.realB)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      {totals.selisih >= 0 ? "+" : ""}{formatNum(totals.selisih)}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-xs font-bold">{formatAch(totals.ach)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      {totals.selisihRkap >= 0 ? "+" : ""}{formatNum(totals.selisihRkap)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-200">
                      {totals.pencapaianHarian !== 0 ? formatNum(totals.pencapaianHarian) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-200">
                      {totals.targetHarian > 0 ? formatNum(totals.targetHarian) : "-"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi-Select Popover ───────────────────────────────────

function MultiSelectSubKomponen({
  availableSubs,
  selected,
  onChange,
}: {
  availableSubs: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = search.trim()
    ? availableSubs.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : availableSubs;

  const toggle = (sub: string) => {
    if (selected.includes(sub)) {
      onChange(selected.filter((s) => s !== sub));
    } else {
      onChange([...selected, sub]);
    }
  };

  const selectAll = () => onChange([...availableSubs]);
  const clearAll = () => onChange([]);

  const groupedFiltered = useMemo(() => {
    const groups: { no: number; name: string; subs: string[] }[] = [];
    for (const g of KOMPONEN_GROUPS) {
      const subs = g.subKomponen.filter((s) => filtered.includes(s));
      if (subs.length > 0) groups.push({ no: g.no, name: g.name, subs });
    }
    return groups;
  }, [filtered]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-9 text-xs text-left px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 truncate"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">Pilih sub komponen...</span>
        ) : (
          <span className="text-gray-700 truncate">
            {selected.length} sub komponen dipilih
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-80 sm:w-96 max-h-[420px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari sub komponen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <button type="button" onClick={selectAll} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">Pilih Semua</button>
              <span className="text-[10px] text-gray-400">{selected.length} / {availableSubs.length}</span>
              <button type="button" onClick={clearAll} className="text-[10px] text-red-500 hover:text-red-600 font-medium">Hapus Semua</button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[320px]">
            {groupedFiltered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">Tidak ditemukan</div>
            ) : (
              groupedFiltered.map((group) => (
                <div key={group.no}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                    {group.no}. {group.name}
                  </div>
                  {group.subs.map((sub) => {
                    const isSelected = selected.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggle(sub)}
                        className={`w-full text-left px-3 py-2 pl-6 text-xs flex items-center gap-2 hover:bg-emerald-50/60 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-emerald-600 border-emerald-600" : "border-gray-300"}`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className={isSelected ? "text-emerald-800 font-medium" : "text-gray-700"}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Selected Chips ──────────────────────────────────────────

function SelectedChips({
  selected,
  onRemove,
  onClearAll,
}: {
  selected: string[];
  onRemove: (sub: string) => void;
  onClearAll: () => void;
}) {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((sub) => (
        <span
          key={sub}
          className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 pl-2 pr-1 py-0.5 rounded-full border border-emerald-200/60"
        >
          {sub}
          <button
            type="button"
            onClick={() => onRemove(sub)}
            className="w-4 h-4 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
          >
            <X className="h-2.5 w-2.5 text-emerald-600" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[10px] text-gray-400 hover:text-red-500 ml-1 font-medium transition-colors"
      >
        Hapus semua
      </button>
    </div>
  );
}

// ─── Monev Date Picker (Calendar) ────────────────────────────

function MonevDatePicker({
  snapshots,
  selectedIndex,
  onSelect,
}: {
  snapshots: SnapshotData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const availableDates = useMemo(() => snapshots.map((s) => s.dateSort), [snapshots]);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const selectedDateObj = useMemo(() => {
    const dateSort = snapshots[selectedIndex]?.dateSort;
    if (!dateSort) return undefined;
    const parts = dateSort.split("-");
    if (parts.length !== 3) return undefined;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? undefined : d;
  }, [snapshots, selectedIndex]);

  const selectedLabel = snapshots[selectedIndex]?.date || "Pilih tanggal";

  const handleDayClick = (day: Date) => {
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    const dateSort = `${yyyy}-${mm}-${dd}`;
    const idx = snapshots.findIndex((s) => s.dateSort === dateSort);
    if (idx !== -1) {
      onSelect(idx);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-9 text-xs text-left px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <CalendarDays className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDateObj}
          onSelect={(day) => { if (day) handleDayClick(day); }}
          modifiers={{
            available: (day) => {
              const yyyy = day.getFullYear();
              const mm = String(day.getMonth() + 1).padStart(2, "0");
              const dd = String(day.getDate()).padStart(2, "0");
              return availableSet.has(`${yyyy}-${mm}-${dd}`);
            },
          }}
          modifiersClassNames={{
            available: "bg-emerald-100 text-emerald-800 font-semibold hover:bg-emerald-200",
          }}
          className="rounded-md border p-2"
        />
        <div className="px-3 pb-2">
          <p className="text-[10px] text-gray-400">Klik tanggal yang tersedia</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Summary Stats Bar ──────────────────────────────────────

function SummaryStats({ tableData }: { tableData: { subName: string; rows: MonevRow[] }[] }) {
  const totalOutlets = new Set(tableData.flatMap(t => t.rows.map(r => r.outletCode))).size;
  const allRows = tableData.flatMap(t => t.rows);
  const avgAch = allRows.length > 0 ? allRows.reduce((s, r) => s + r.ach, 0) / allRows.length : 0;
  const totalAchieved = allRows.filter(r => r.ach >= 1.0).length;
  const totalSelisihRkap = allRows.reduce((s, r) => s + r.selisihRkap, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Sub Komponen</div>
        <div className="text-lg font-bold text-gray-800 mt-0.5">{tableData.length}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total Outlet</div>
        <div className="text-lg font-bold text-gray-800 mt-0.5">{totalOutlets}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Rata-rata ACH</div>
        <div className="mt-0.5"><AchBar value={avgAch} size="md" /></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Capai Target</div>
        <div className="text-lg font-bold text-gray-800 mt-0.5">
          {totalAchieved}<span className="text-sm font-normal text-gray-400">/{allRows.length}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function MonevTable({ snapshots }: MonevTableProps) {
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [dateIndexA, setDateIndexA] = useState<number>(0);
  const [dateIndexB, setDateIndexB] = useState<number>(0);
  const [sortStates, setSortStates] = useState<Record<string, SortState>>({});
  const [collapsedAll, setCollapsedAll] = useState(false);
  const defaultSort: SortState = { key: "ach", dir: "desc" };

  useEffect(() => {
    if (snapshots.length > 1) {
      setDateIndexB(snapshots.length - 1);
    }
  }, [snapshots.length]);

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

  const snapA = snapshots[dateIndexA];
  const snapB = snapshots[dateIndexB];

  const periodWorkDays = useMemo(() => {
    if (!snapA || !snapB) return 1;
    return calcPeriodWorkDays(snapA.dateSort, snapB.dateSort);
  }, [snapA, snapB]);

  const remainingWorkDays = useMemo(() => {
    if (!snapB) return 1;
    return calcRemainingWorkDays(snapB.dateSort);
  }, [snapB]);

  const tableData = useMemo(() => {
    if (!snapA || !snapB || selectedSubs.length === 0) return [];
    return selectedSubs.map((sub) => ({
      subName: sub,
      rows: buildRows(sub, snapA, snapB, periodWorkDays, remainingWorkDays),
    }));
  }, [selectedSubs, snapA, snapB, periodWorkDays, remainingWorkDays]);

  const handleSort = (subName: string, key: SortKey) => {
    setSortStates((prev) => {
      const current = prev[subName] || { key: "outlet", dir: "asc" };
      return {
        ...prev,
        [subName]: {
          key,
          dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
        },
      };
    });
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (effectiveSelected.length === 0 || !snapA || !snapB) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/monev-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshots,
          selectedSubs: effectiveSelected,
          dateIndexA,
          dateIndexB,
          sortStates,
        }),
      });
      if (!res.ok) throw new Error("Gagal generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition");
      const match = cd?.match(/filename="(.+)"/);
      a.download = match?.[1] || "Monev_Komponen.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
    } finally {
      setDownloading(false);
    }
  };

  const removeSub = (sub: string) => {
    setSelectedSubs((prev) => prev.filter((s) => s !== sub));
  };

  const effectiveSelected = useMemo(
    () => selectedSubs.filter((s) => availableSubs.includes(s)),
    [selectedSubs, availableSubs]
  );

  if (snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
        <Table2 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Minimal 2 periode data diperlukan</p>
        <p className="text-xs mt-1 text-gray-300">Upload minimal 2 file KPI untuk menggunakan Monev Komponen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Monev Komponen</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Monitoring evaluasi realisasi per sub komponen antar periode</p>
        </div>
        <div className="flex items-center gap-2">
          {effectiveSelected.length > 0 && (
            <button
              onClick={() => setCollapsedAll(!collapsedAll)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {collapsedAll ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              {collapsedAll ? "Buka Semua" : "Tutup Semua"}
            </button>
          )}
          {effectiveSelected.length > 0 && snapA && snapB && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-[11px] font-medium rounded-lg transition-colors"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Controls (compact inline) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Sub Komponen
            </label>
            <MultiSelectSubKomponen
              availableSubs={availableSubs}
              selected={effectiveSelected}
              onChange={setSelectedSubs}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Periode Awal
            </label>
            <MonevDatePicker
              snapshots={snapshots}
              selectedIndex={dateIndexA}
              onSelect={(idx) => setDateIndexA(idx)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Periode Akhir
            </label>
            <MonevDatePicker
              snapshots={snapshots}
              selectedIndex={dateIndexB}
              onSelect={(idx) => setDateIndexB(idx)}
            />
          </div>
        </div>
        <div className="mt-3">
          <SelectedChips
            selected={effectiveSelected}
            onRemove={removeSub}
            onClearAll={() => setSelectedSubs([])}
          />
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {effectiveSelected.length > 0 && tableData.length > 0 && (
        <SummaryStats tableData={tableData} />
      )}

      {/* ── Tables ── */}
      {effectiveSelected.length > 0 && tableData.length > 0 ? (
        <div className="space-y-3">
          {tableData.map(({ subName, rows }) => (
            <SubTable
              key={subName}
              subName={subName}
              rows={rows}
              sort={sortStates[subName] || defaultSort}
              onSort={(key) => handleSort(subName, key)}
              snapA={snapA!}
              snapB={snapB!}
              periodWorkDays={periodWorkDays}
              remainingWorkDays={remainingWorkDays}
              defaultOpen={!collapsedAll}
            />
          ))}
        </div>
      ) : effectiveSelected.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="text-sm">Tidak ada data untuk sub komponen yang dipilih</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-300">
          <Table2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-gray-400">Pilih sub komponen untuk melihat monev</p>
          <p className="text-xs mt-1">Gunakan dropdown di atas untuk memilih</p>
        </div>
      )}
    </div>
  );
}