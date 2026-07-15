"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Table2, ArrowUpDown, ChevronDown, Check, Search, X, Download, Loader2, CalendarDays } from "lucide-react";
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
  pencapaianHarian: number;
  targetHarian: number;
}

type SortKey = "outlet" | "target" | "realB" | "selisih" | "ach";
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

function achBg(ach: number): string {
  if (ach >= 1.0) return "bg-emerald-50";
  if (ach >= 0.8) return "bg-amber-50";
  if (ach >= 0.5) return "bg-orange-50";
  return "bg-red-50";
}

function calcPeriodWorkDays(dateAStr: string, dateBStr: string): number {
  const start = new Date(dateAStr);
  const end = new Date(dateBStr);
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0) count++; // Senin-Sabtu, kecuali Minggu
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

function calcRemainingWorkDays(dateBStr: string): number {
  const start = new Date(dateBStr);
  const endOfYear = new Date(start.getFullYear(), 11, 31);
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= endOfYear) {
    const day = d.getDay();
    if (day !== 0) count++; // Senin-Sabtu, kecuali Minggu
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
    // Exclude CP tegalboto from MONEV (UPC tegalboto tetap ditampilkan)
    if (/^cp\s+tegalboto/i.test(name)) return;
    const compA = uA?.components.find((c) => c.kpi_name === subName);
    const compB = uB?.components.find((c) => c.kpi_name === subName);
    if (!compA && !compB) return;

    const target = compB?.target || compA?.target || 0;
    const realA = compA?.realisasi || 0;
    const realB = compB?.realisasi || 0;
    const selisih = realB - realA;
    const ach = target > 0 ? realB / target : 0;
    const gap = target - realB;
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
    pencapaianHarian: t.selisih / periodWorkDays,
    targetHarian: t.target - t.realB > 0 ? (t.target - t.realB) / remainingWorkDays : 0,
  };
}

// ─── Sort Icon ───────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-2.5 w-2.5 text-gray-300" />;
  return dir === "asc" ? (
    <ChevronDown className="h-3 w-3 text-emerald-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-emerald-600 rotate-180" />
  );
}

// ─── Sub-Komponen Table Card ────────────────────────────────

function SubTable({
  subName,
  rows,
  sort,
  onSort,
  snapA,
  snapB,
  periodWorkDays,
  remainingWorkDays,
}: {
  subName: string;
  rows: MonevRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  snapA: SnapshotData;
  snapB: SnapshotData;
  periodWorkDays: number;
  remainingWorkDays: number;
}) {
  const sorted = sortRows(rows, sort);
  const totals = calcTotals(rows, periodWorkDays, remainingWorkDays);
  const group = getGroupForSub(subName);
  const info = getSubInfo(subName, [snapA, snapB]);

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {group && (
            <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
              {group.no}
            </span>
          )}
          <h3 className="text-xs font-bold text-white">{subName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {info.bobot > 0 && (
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">
              Bobot {info.bobot}%
            </span>
          )}
          {info.satuan && (
            <span className="text-[10px] bg-white/15 text-emerald-100 px-2 py-0.5 rounded-full">
              {info.satuan}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-44">
                <button
                  onClick={() => onSort("outlet")}
                  className="inline-flex items-center gap-1 hover:text-emerald-700"
                >
                  OUTLET <SortIcon active={sort.key === "outlet"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-32">
                <button
                  onClick={() => onSort("target")}
                  className="inline-flex items-center gap-1 ml-auto hover:text-emerald-700"
                >
                  Target Tahunan <SortIcon active={sort.key === "target"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">
                {snapA.date}
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">
                <button
                  onClick={() => onSort("realB")}
                  className="inline-flex items-center gap-1 ml-auto hover:text-emerald-700"
                >
                  {snapB.date} <SortIcon active={sort.key === "realB"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-24">
                <button
                  onClick={() => onSort("selisih")}
                  className="inline-flex items-center gap-1 ml-auto hover:text-emerald-700"
                >
                  Selisih <SortIcon active={sort.key === "selisih"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-center px-3 py-2 font-semibold text-gray-600 w-20">
                <button
                  onClick={() => onSort("ach")}
                  className="inline-flex items-center gap-1 hover:text-emerald-700"
                >
                  ACH <SortIcon active={sort.key === "ach"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">
                Pencapaian Harian
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">
                Target Harian
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr
                key={r.outletCode}
                className={`border-b border-gray-50 transition-colors hover:bg-emerald-50/40 ${
                  idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                }`}
              >
                <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                  {r.outletName}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                  {formatNum(r.targetTahunan)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {formatNum(r.realisasiA)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-700">
                  {formatNum(r.realisasiB)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={r.selisih >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {r.selisih >= 0 ? "+" : ""}
                    {formatNum(r.selisih)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] tabular-nums ${achColor(r.ach)} ${achBg(r.ach)}`}
                  >
                    {formatAch(r.ach)}
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
              <tr className="bg-emerald-600 text-white font-bold">
                <td className="px-3 py-2">Grand Total</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNum(totals.target)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-100">
                  {formatNum(totals.realA)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNum(totals.realB)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totals.selisih >= 0 ? "+" : ""}
                  {formatNum(totals.selisih)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {formatAch(totals.ach)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-100">
                  {totals.pencapaianHarian !== 0 ? formatNum(totals.pencapaianHarian) : "-"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-100">
                  {totals.targetHarian > 0 ? formatNum(totals.targetHarian) : "-"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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

  // Close on outside click
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

  // Get grouped subs
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
      {/* Trigger button */}
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

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-80 sm:w-96 max-h-[420px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search + actions */}
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
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Pilih Semua
              </button>
              <span className="text-[10px] text-gray-400">
                {selected.length} / {availableSubs.length}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-red-500 hover:text-red-600 font-medium"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div className="overflow-y-auto max-h-[320px]">
            {groupedFiltered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Tidak ditemukan
              </div>
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
                        className={`w-full text-left px-3 py-2 pl-6 text-xs flex items-center gap-2 hover:bg-emerald-50/60 transition-colors ${
                          isSelected ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className={isSelected ? "text-emerald-800 font-medium" : "text-gray-700"}>
                          {sub}
                        </span>
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
          className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-100 text-emerald-800 pl-2 pr-1 py-0.5 rounded-full"
        >
          {sub}
          <button
            type="button"
            onClick={() => onRemove(sub)}
            className="w-4 h-4 rounded-full bg-emerald-200 hover:bg-emerald-300 flex items-center justify-center transition-colors"
          >
            <X className="h-2.5 w-2.5 text-emerald-700" />
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
          onSelect={(day) => {
            if (day) handleDayClick(day);
          }}
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

// ─── Main Component ──────────────────────────────────────────

export function MonevTable({ snapshots }: MonevTableProps) {
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [dateIndexA, setDateIndexA] = useState<number>(0);
  const [dateIndexB, setDateIndexB] = useState<number>(0);
  const [sortStates, setSortStates] = useState<Record<string, SortState>>({});
  const defaultSort: SortState = { key: "ach", dir: "desc" };

  // Set default dateIndexB to last
  useEffect(() => {
    if (snapshots.length > 1) {
      setDateIndexB(snapshots.length - 1);
    }
  }, [snapshots.length]);

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
    // Maintain display order from ALL_SUB_KOMPONEN
    return ALL_SUB_KOMPONEN.filter((name) => nameSet.has(name));
  }, [snapshots]);

  // Date list
  const dateList = useMemo(
    () => snapshots.map((s) => ({ label: s.date, sort: s.dateSort })),
    [snapshots]
  );

  const snapA = snapshots[dateIndexA];
  const snapB = snapshots[dateIndexB];

  // Calculate period working days (inclusive, Senin-Sabtu kecuali Minggu)
  const periodWorkDays = useMemo(() => {
    if (!snapA || !snapB) return 1;
    return calcPeriodWorkDays(snapA.dateSort, snapB.dateSort);
  }, [snapA, snapB]);

  // Calculate remaining working days to end of year
  const remainingWorkDays = useMemo(() => {
    if (!snapB) return 1;
    return calcRemainingWorkDays(snapB.dateSort);
  }, [snapB]);

  // Build rows for each selected sub-komponen
  const tableData = useMemo(() => {
    if (!snapA || !snapB || selectedSubs.length === 0) return [];
    return selectedSubs.map((sub) => ({
      subName: sub,
      rows: buildRows(sub, snapA, snapB, periodWorkDays, remainingWorkDays),
    }));
  }, [selectedSubs, snapA, snapB, periodWorkDays, remainingWorkDays]);

  // Sort handler per sub
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

  // PDF download
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
      // Get filename from content-disposition
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

  // Remove one from selection
  const removeSub = (sub: string) => {
    setSelectedSubs((prev) => prev.filter((s) => s !== sub));
  };

  // Filter out selected subs that are no longer available
  const effectiveSelected = useMemo(
    () => selectedSubs.filter((s) => availableSubs.includes(s)),
    [selectedSubs, availableSubs]
  );

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
          <p className="text-[11px] text-gray-400 mt-0.5">
            Perbandingan realisasi per sub komponen antar periode
          </p>
        </div>
        {effectiveSelected.length > 0 && snapA && snapB && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Sub-komponen multi-select */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Sub Komponen
          </label>
          <MultiSelectSubKomponen
            availableSubs={availableSubs}
            selected={effectiveSelected}
            onChange={setSelectedSubs}
          />
        </div>

        {/* Date A - Calendar Picker */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Periode Awal
          </label>
          <MonevDatePicker
            snapshots={snapshots}
            selectedIndex={dateIndexA}
            onSelect={(idx) => setDateIndexA(idx)}
          />
        </div>

        {/* Date B - Calendar Picker */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Periode Akhir
          </label>
          <MonevDatePicker
            snapshots={snapshots}
            selectedIndex={dateIndexB}
            onSelect={(idx) => setDateIndexB(idx)}
          />
        </div>
      </div>

      {/* Selected chips */}
      <SelectedChips
        selected={effectiveSelected}
        onRemove={removeSub}
        onClearAll={() => setSelectedSubs([])}
      />

      {/* Tables */}
      {effectiveSelected.length > 0 && tableData.length > 0 ? (
        <div className="space-y-4">
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
            />
          ))}
        </div>
      ) : effectiveSelected.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-gray-400">
          <p className="text-sm">Tidak ada data untuk sub komponen yang dipilih</p>
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