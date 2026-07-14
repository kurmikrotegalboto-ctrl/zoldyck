"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  CalendarDays,
  Trash2,
  Settings,
  Key,
  Building2,
  ChevronRight,
  ArrowLeftRight,
  CalendarIcon,
  Download,
  Menu,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { UnitDetailTable } from "@/components/dashboard/unit-detail-table";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { CompareCalendar } from "@/components/dashboard/compare-calendar";
import { KpiAnalysis } from "@/components/dashboard/kpi-analysis";
import { TargetAnalysis } from "@/components/dashboard/target-analysis";
import { MonevTable } from "@/components/dashboard/monev-table";
import { defaultSnapshot } from "@/lib/default-data";
import { parseMultipleFiles } from "@/lib/kpi-parser";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_LIST = [
  { code: "14200_UPC", label: "UPC TEGALBOTO", short: "UPC Tegalboto" },
  { code: "14200_CP", label: "CP TEGALBOTO", short: "CP Tegalboto" },
  { code: "14201", label: "BASUKI RAHMAD", short: "Basuki Rahmad" },
  { code: "14202", label: "S PARMAN", short: "S. Parman" },
  { code: "14204", label: "KALISAT", short: "Kalisat" },
  { code: "14205", label: "MAYANG", short: "Mayang" },
  { code: "17506", label: "COLO SUMBERJATI", short: "Colo Sumberjati" },
];

const STORAGE_KEY = "kpi_snapshots";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getKpiColor(totalKpi: number): string {
  if (totalKpi >= 85) return "#059669";
  if (totalKpi >= 70) return "#d97706";
  if (totalKpi >= 55) return "#ea580c";
  return "#dc2626";
}

function getKpiTextClass(totalKpi: number): string {
  if (totalKpi >= 85) return "text-emerald-600";
  if (totalKpi >= 70) return "text-amber-600";
  if (totalKpi >= 55) return "text-orange-600";
  return "text-red-600";
}

function getKpiBgClass(totalKpi: number): string {
  if (totalKpi >= 85) return "bg-emerald-100 text-emerald-800";
  if (totalKpi >= 70) return "bg-amber-100 text-amber-800";
  if (totalKpi >= 55) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function mergeSnapshots(
  existing: SnapshotData[],
  newSnapshot: SnapshotData
): SnapshotData[] {
  const arr = [...existing];
  const idx = arr.findIndex((s) => s.dateSort === newSnapshot.dateSort);
  if (idx >= 0) {
    const updatedUnits = [...arr[idx].units];
    for (const unit of newSnapshot.units) {
      const uIdx = updatedUnits.findIndex((u) => u.code === unit.code);
      if (uIdx >= 0) updatedUnits[uIdx] = unit;
      else updatedUnits.push(unit);
    }
    arr[idx] = { ...arr[idx], units: updatedUnits };
  } else {
    arr.push(newSnapshot);
  }
  arr.sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  return arr;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── Core state ──
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([defaultSnapshot]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"kpi" | "trend" | "analisis" | "target" | "monev">("kpi");
  const [isServerMode, setIsServerMode] = useState(false);

  // ── Upload state ──
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<
    {
      file: File;
      status: "pending" | "parsing" | "success" | "error" | "update";
      errorMsg?: string;
    }[]
  >([]);

  // ── Compare state ──
  const [compareMode, setCompareMode] = useState(false);
  const [compareDateSort, setCompareDateSort] = useState<string | null>(null);
  const [showCompareCalendar, setShowCompareCalendar] = useState(false);

  // ── UI state ──
  const [showUnitPopover, setShowUnitPopover] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteDate, setDeleteDate] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ── Sidebar state ──
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ── Derived data ──
  const currentSnapshot = snapshots[selectedSnapshotIndex] ?? snapshots[0];
  const prevSnapshot =
    selectedSnapshotIndex > 0 ? snapshots[selectedSnapshotIndex - 1] : undefined;
  const compareSnapshot = compareDateSort
    ? snapshots.find((s) => s.dateSort === compareDateSort)
    : undefined;
  const effectivePrevSnapshot = compareMode
    ? compareSnapshot
    : prevSnapshot;

  const latestUnits: KpiUnit[] = currentSnapshot?.units ?? [];

  useEffect(() => {
    if (!selectedUnitCode && latestUnits.length > 0) {
      setSelectedUnitCode(latestUnits[0].code);
    }
  }, [latestUnits, selectedUnitCode]);

  const selectedUnit = latestUnits.find((u) => u.code === selectedUnitCode);
  const effectivePrevUnit = effectivePrevSnapshot?.units.find(
    (u) => u.code === selectedUnitCode
  );

  const availableDates = useMemo(
    () => snapshots.map((s) => s.dateSort),
    [snapshots]
  );

  const existingDateSorts = useMemo(
    () => new Set(snapshots.map((s) => s.dateSort)),
    [snapshots]
  );

  // ── Data init: Server first, localStorage as offline fallback ──
  useEffect(() => {
    const init = async () => {
      // 1) Always try server first (fresh data from Supabase)
      try {
        const res = await fetch("/api/snapshots");
        if (res.ok) {
          const data = await res.json();
          if (data.snapshots && data.snapshots.length > 0) {
            setSnapshots(data.snapshots);
            setSelectedSnapshotIndex(data.snapshots.length - 1);
            setIsServerMode(true);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.snapshots));
            } catch {
              // localStorage unavailable or full
            }
            return;
          }
        }
      } catch {
        // server unreachable — fall through to localStorage
      }

      // 2) Fallback: localStorage (offline or server down)
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSnapshots(parsed);
            setSelectedSnapshotIndex(parsed.length - 1);
            setIsServerMode(false);
          }
        }
      } catch {
        // silently ignore
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isServerMode && snapshots.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
      } catch (e) {
        console.error("localStorage save error:", e);
      }
    }
  }, [snapshots, isServerMode]);

  // ── File handling ──
  const addFiles = useCallback((files: FileList | File[]) => {
    const xlsxFiles = Array.from(files).filter((f) =>
      f.name.endsWith(".xlsx")
    );
    if (xlsxFiles.length === 0) return;
    setPendingFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = xlsxFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (pendingFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    const newStatuses = pendingFiles.map((f) => ({
      file: f,
      status: "parsing" as const,
    }));
    setFileStatuses((prev) => [...prev, ...newStatuses]);

    try {
      const parsed = await parseMultipleFiles(pendingFiles);
      const parsedFilenames = new Set(parsed.map((p) => p.filename));

      setFileStatuses((prev) =>
        prev.map((s) => {
          if (s.status !== "parsing") return s;
          if (parsedFilenames.has(s.file.name)) {
            const parsedFile = parsed.find((p) => p.filename === s.file.name);
            const isUpdate = parsedFile
              ? existingDateSorts.has(parsedFile.dateSort)
              : false;
            return {
              ...s,
              status: isUpdate ? ("update" as const) : ("success" as const),
            };
          }
          return {
            ...s,
            status: "error" as const,
            errorMsg: "Format tidak dikenali",
          };
        })
      );

      if (parsed.length === 0) {
        setPendingFiles([]);
        setIsUploading(false);
        return;
      }

      const dateGroups: Record<
        string,
        { date: string; dateSort: string; units: KpiUnit[] }
      > = {};
      parsed.forEach((pf) => {
        if (!dateGroups[pf.dateSort]) {
          dateGroups[pf.dateSort] = {
            date: pf.date,
            dateSort: pf.dateSort,
            units: [],
          };
        }
        dateGroups[pf.dateSort].units.push(pf.unit);
      });

      let updatedSnapshots = [...snapshots];
      for (const group of Object.values(dateGroups)) {
        const snapshot: SnapshotData = {
          date: group.date,
          dateSort: group.dateSort,
          units: group.units,
        };
        updatedSnapshots = mergeSnapshots(updatedSnapshots, snapshot);
      }

      setSnapshots(updatedSnapshots);
      setSelectedSnapshotIndex(updatedSnapshots.length - 1);
      setIsServerMode(true);
      setPendingFiles([]);

      // Upload each snapshot to server and verify success
      let serverSuccess = true;
      let serverSnapshots: SnapshotData[] | null = null;

      try {
        for (const group of Object.values(dateGroups)) {
          const snapshot: SnapshotData = {
            date: group.date,
            dateSort: group.dateSort,
            units: group.units,
          };
          const res = await fetch("/api/snapshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.snapshots) serverSnapshots = data.snapshots;
          } else {
            serverSuccess = false;
            const errData = await res.json().catch(() => ({}));
            console.error("Upload failed:", res.status, errData);
          }
        }
      } catch (e) {
        serverSuccess = false;
        console.error("Server upload error:", e);
      }

      if (serverSuccess) {
        // Use server-confirmed data if available
        if (serverSnapshots && serverSnapshots.length > 0) {
          setSnapshots(serverSnapshots);
          setSelectedSnapshotIndex(serverSnapshots.length - 1);
        }
      } else {
        // Fallback to local mode so data isn't lost
        setIsServerMode(false);
        // Still save to localStorage as fallback
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSnapshots));
        } catch { /* ignore */ }
      }
    } catch {
      setFileStatuses((prev) =>
        prev.map((s) =>
          s.status === "parsing"
            ? { ...s, status: "error" as const, errorMsg: "Gagal memproses" }
            : s
        )
      );
    }

    setIsUploading(false);
  }, [pendingFiles, isUploading, snapshots, existingDateSorts]);

  // ── Delete handler ──
  const handleDeleteSnapshot = async () => {
    if (!deleteDate) return;
    const updated = snapshots.filter((s) => s.dateSort !== deleteDate);
    setSnapshots(updated.length > 0 ? updated : [defaultSnapshot]);
    setSelectedSnapshotIndex(
      Math.min(selectedSnapshotIndex, Math.max(0, updated.length - 1))
    );
    if (updated.length === 0) {
      setIsServerMode(false);
      setSelectedSnapshotIndex(0);
    }

    try {
      if (updated.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }

    try {
      await fetch(`/api/snapshots?date=${encodeURIComponent(deleteDate)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Server delete failed (data removed locally):", e);
    }

    setShowDeleteConfirm(false);
    if (compareDateSort === deleteDate) {
      setCompareDateSort(null);
    }
  };

  // ── Auth handlers ──
  const handleLogout = async () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) return;
    const res = await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg("Password berhasil diubah!");
      setCurrentPwd("");
      setNewPwd("");
      setTimeout(() => {
        setPwdMsg("");
        setShowSettings(false);
      }, 2000);
    } else {
      setPwdMsg(data.error || "Gagal mengubah password");
    }
  };

  const compareLabel = compareMode
    ? compareSnapshot?.date
    : undefined;

  // ── PDF Download Handler ──
  const handleDownloadPdf = useCallback(async () => {
    if (!selectedUnit || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit: selectedUnit,
          unitLabel: getUnitLabel(selectedUnit.code),
          date: currentSnapshot?.date || "",
          prevUnit: effectivePrevUnit || undefined,
          compareLabel: compareLabel ?? undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `PDF generation failed (${res.status})`);
      }

      const blob = await res.blob();

      if (blob.type && blob.type !== "application/pdf" && !blob.type.startsWith("application/pdf")) {
        throw new Error("Response is not a PDF file");
      }

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : "KPI_Report.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Gagal membuat PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [isGeneratingPdf, selectedUnit, currentSnapshot, effectivePrevUnit, compareLabel]);

  // ── KPI delta for summary bar ──
  const kpiDelta = useMemo(() => {
    if (!selectedUnit || !effectivePrevUnit) return 0;
    return parseFloat(
      (selectedUnit.total_kpi - effectivePrevUnit.total_kpi).toFixed(2)
    );
  }, [selectedUnit, effectivePrevUnit]);

  // ── Period change handler ──
  const handlePeriodChange = useCallback(
    (val: string) => {
      setSelectedSnapshotIndex(Number(val));
    },
    []
  );

  // ── Render helpers ──
  const getUnitLabel = (code: string) =>
    UNIT_LIST.find((u) => u.code === code)?.label || code;

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      {/* ═══ SIDEBAR ═══ */}
      <AppSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        showUpload={showUpload}
        setShowUpload={setShowUpload}
        onOpenSettings={() => {
          setShowSettings(true);
          setPwdMsg("");
          setCurrentPwd("");
          setNewPwd("");
        }}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* ═══ MAIN WRAPPER ═══ */}
      <div
        className={`
          main-content-area flex flex-col min-h-screen
          md:ml-16 lg:ml-60
          ${isSidebarCollapsed ? "!md:ml-16 !lg:ml-16" : ""}
        `}
      >
        {/* ═══ SLIM TOP BAR ═══ */}
        <header className="top-bar sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm">
          <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2">
            {/* Left: Hamburger (mobile) + Online badge + Unit Selector */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {isServerMode && (
                <Badge
                  variant="outline"
                  className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex px-1.5 py-0"
                >
                  Online
                </Badge>
              )}

              {/* KPI Unit Dropdown */}
              <Popover open={showUnitPopover} onOpenChange={setShowUnitPopover}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700 border border-gray-200/70 bg-white">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="max-w-[100px] sm:max-w-[140px] md:max-w-[180px] truncate">
                      {selectedUnit
                        ? UNIT_LIST.find((u) => u.code === selectedUnit.code)
                            ?.short || selectedUnit.name
                        : "Pilih Unit"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[260px] p-2"
                  align="start"
                  sideOffset={6}
                >
                  <div className="space-y-0.5">
                    {UNIT_LIST.map((u) => {
                      const unit = latestUnits.find((lu) => lu.code === u.code);
                      const hasData = !!unit;
                      const isActive = selectedUnitCode === u.code;
                      return (
                        <button
                          key={u.code}
                          onClick={() => {
                            if (hasData) {
                              setSelectedUnitCode(u.code);
                              setActiveView("kpi");
                              setShowUnitPopover(false);
                            }
                          }}
                          disabled={!hasData}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : hasData
                              ? "text-gray-700 hover:bg-gray-50"
                              : "text-gray-300 cursor-default"
                          }`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1"
                            style={{
                              backgroundColor: hasData
                                ? getKpiColor(unit!.total_kpi)
                                : "#d1d5db",
                              ringColor: hasData
                                ? getKpiColor(unit!.total_kpi)
                                : "#e5e7eb",
                            }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <div className="truncate">{u.short}</div>
                          </div>
                          {hasData && (
                            <span
                              className={`text-[10px] font-bold tabular-nums ${getKpiTextClass(unit!.total_kpi)}`}
                            >
                              {unit!.total_kpi.toFixed(1)}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className="h-3 w-3 text-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Period, Compare, PDF */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Period Selector */}
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                <Select
                  value={String(selectedSnapshotIndex)}
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger className="w-[100px] sm:w-[130px] md:w-[160px] h-7 text-[11px] bg-white border-gray-200/70">
                    <SelectValue placeholder="Pilih Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s, idx) => (
                      <SelectItem
                        key={s.dateSort}
                        value={String(idx)}
                        className="text-[11px]"
                      >
                        {s.date}
                        {idx === snapshots.length - 1 && " (Terbaru)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compare Button */}
              {isServerMode && snapshots.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCompareMode(!compareMode);
                      if (compareMode) {
                        setCompareDateSort(null);
                        setShowCompareCalendar(false);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      compareMode
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="hidden sm:inline">Banding</span>
                  </button>

                  {compareMode && (
                    <Popover
                      open={showCompareCalendar}
                      onOpenChange={setShowCompareCalendar}
                    >
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-50 border border-gray-200/70 bg-white transition-colors">
                          <CalendarIcon className="h-3 w-3 text-emerald-600" />
                          <span className="hidden sm:inline max-w-[80px] truncate">
                            {compareSnapshot?.date || "Pilih tanggal"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="end"
                        sideOffset={6}
                      >
                        <CompareCalendar
                          availableDates={availableDates.filter(
                            (d) => d !== currentSnapshot?.dateSort
                          )}
                          selectedDate={compareDateSort ?? undefined}
                          onSelect={(dateSort) => {
                            setCompareDateSort(dateSort);
                          }}
                          onClose={() => setShowCompareCalendar(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}

              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ═══ UPLOAD PANEL ═══ */}
        {showUpload && (
          <div className="bg-white border-b px-3 md:px-5 py-3 animate-fade-up z-30">
            <div className="max-w-2xl mx-auto">
              <div
                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-300 hover:border-emerald-400"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Upload
                  className={`mx-auto h-6 w-6 mb-1 ${
                    isDragging ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                />
                <p className="text-xs font-medium">
                  {isDragging
                    ? "Lepaskan file di sini..."
                    : "Drag & drop file KPI (.xlsx) atau klik untuk memilih"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Mendukung upload 7 file sekaligus
                </p>
              </div>

              {pendingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {pendingFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 text-[11px]"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-[9px] text-gray-400">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() =>
                            setPendingFiles((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground">
                      {pendingFiles.length} file dipilih
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => setPendingFiles([])}
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                            Mengupload...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 mr-1" /> Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {fileStatuses.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-gray-600">
                      Riwayat Upload
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px]"
                      onClick={() => setFileStatuses([])}
                    >
                      <X className="h-2.5 w-2.5 mr-0.5" /> Hapus
                    </Button>
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {fileStatuses.map((fs, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 text-[11px]"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="flex-1 truncate">{fs.file.name}</span>
                        {fs.status === "parsing" && (
                          <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />
                        )}
                        {fs.status === "success" && (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0">
                              Baru
                            </Badge>
                          </>
                        )}
                        {fs.status === "update" && (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0 px-1.5 py-0">
                              Update
                            </Badge>
                          </>
                        )}
                        {fs.status === "error" && (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="text-red-500 text-[10px]">
                              Gagal
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STICKY KPI SUMMARY BAR ═══ */}
        {selectedUnit && activeView === "kpi" && (
          <div className="sticky top-[49px] z-20 bg-white/80 backdrop-blur-md border-b px-3 md:px-5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: getKpiColor(selectedUnit.total_kpi),
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {getUnitLabel(selectedUnit.code)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedUnit.components.length} komponen KPI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p
                    className={`text-xl font-black tabular-nums ${getKpiTextClass(selectedUnit.total_kpi)}`}
                  >
                    {selectedUnit.total_kpi.toFixed(2)}
                  </p>
                </div>
                {effectivePrevUnit && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      vs {compareLabel || prevSnapshot?.date || "kemarin"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-1.5 py-0 border-0 ${
                        kpiDelta > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : kpiDelta < 0
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {kpiDelta > 0 ? "+" : ""}
                      {kpiDelta.toFixed(2)}
                    </Badge>
                  </div>
                )}
                {isServerMode && currentSnapshot && (
                  <button
                    onClick={() => {
                      setDeleteDate(currentSnapshot.dateSort);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Hapus periode ini"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 p-3 md:p-5">
          <div className="animate-fade-up">
            {activeView === "trend" ? (
              <TrendCharts
                snapshots={snapshots}
                compareMode={compareMode}
                compareDateSort={compareDateSort}
                selectedIndex={selectedSnapshotIndex}
              />
            ) : activeView === "analisis" ? (
              <KpiAnalysis
                units={latestUnits}
                date={currentSnapshot?.date || ""}
              />
            ) : activeView === "target" ? (
              <TargetAnalysis
                units={latestUnits}
                selectedUnitCode={selectedUnitCode}
                onUnitSelect={(code) => setSelectedUnitCode(code)}
              />
            ) : activeView === "monev" ? (
              <MonevTable snapshots={snapshots} />
            ) : selectedUnit ? (
              <UnitDetailTable
                unit={selectedUnit}
                unitLabel={getUnitLabel(selectedUnit.code)}
                prevUnit={effectivePrevUnit}
                compareLabel={compareLabel}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                <Building2 className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Pilih outlet dari dropdown unit</p>
                <p className="text-xs mt-1 text-gray-300">
                  Gunakan dropdown di atas untuk memilih unit KPI
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ SETTINGS DIALOG ═══ */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" /> Pengaturan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Ganti Password</h3>
              <input
                type="password"
                placeholder="Password lama"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
              />
              <input
                type="password"
                placeholder="Password baru (min. 6 karakter)"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            {pwdMsg && (
              <p
                className={`text-sm ${
                  pwdMsg.includes("berhasil")
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {pwdMsg}
              </p>
            )}
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p className="font-medium mb-1">Info Server</p>
              <p>
                Mode:{" "}
                {isServerMode
                  ? "Cloud (Supabase)"
                  : "Lokal (data sementara)"}
              </p>
              <p>Penyimpanan: {isServerMode ? "Persisten" : "Sementara"}</p>
              <p>Total Periode: {snapshots.length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              Tutup
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!currentPwd || !newPwd}
            >
              Simpan Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION DIALOG ═══ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Periode</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Yakin ingin menghapus data periode{" "}
            <strong>
              {snapshots.find((s) => s.dateSort === deleteDate)?.date ||
                deleteDate}
            </strong>
            ? Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSnapshot}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PDF GENERATING OVERLAY ═══ */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-5 flex flex-col items-center gap-3 shadow-2xl">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Membuat PDF...</p>
            <p className="text-xs text-gray-400">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}
    </div>
  );
}