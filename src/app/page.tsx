"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Activity, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecapTable } from "@/components/dashboard/recap-table";
import { UnitDetailTable } from "@/components/dashboard/unit-detail-table";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { defaultSnapshot } from "@/lib/default-data";
import { parseMultipleFiles, type ParsedFile } from "@/lib/kpi-parser";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";

// Sheet tab definitions matching Excel layout
const SHEET_TABS = [
  { key: "rekap", label: "REKAP" },
  { key: "konsol", label: "KONSOL" },
  { key: "tegalboto", label: "TEGALBOTO", unitCode: "14200_UPC", unitLabel: "14200 - UPC TEGALBOTO (outlet)" },
  { key: "cp_tegalboto", label: "CP TEGALBOTO", unitCode: "14200_CP", unitLabel: "14200 - CP TEGALBOTO" },
  { key: "basuki", label: "BASUKI RAHMAD", unitCode: "14201", unitLabel: "14201 - UPC BASUKI RAHMAT" },
  { key: "sparman", label: "S PARMAN", unitCode: "14202", unitLabel: "14202 - UPC S PARMAN" },
  { key: "kalisat", label: "KALISAT", unitCode: "14204", unitLabel: "14204 - UPC KALISAT" },
  { key: "mayang", label: "MAYANG", unitCode: "14205", unitLabel: "14205 - UPC MAYANG" },
  { key: "sumberjati", label: "COLO SUMBERJATI", unitCode: "17506", unitLabel: "17506 - BRI UNIT SUMBERJATI" },
  { key: "tren", label: "TREN" },
];

export default function Home() {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([defaultSnapshot]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [activeSheet, setActiveSheet] = useState("rekap");
  const [showUpload, setShowUpload] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<{ file: File; status: "pending" | "parsing" | "success" | "error" }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Current and previous snapshot
  const currentSnapshot = snapshots[selectedSnapshotIndex];
  const prevSnapshot = selectedSnapshotIndex > 0 ? snapshots[selectedSnapshotIndex - 1] : undefined;

  // Current units
  const latestUnits: KpiUnit[] = currentSnapshot?.units ?? [];

  // Handle file uploads
  const handleFilesParsed = useCallback((parsedFiles: ParsedFile[]) => {
    if (parsedFiles.length === 0) return;
    const dateGroups: Record<string, { dateSort: string; files: ParsedFile[] }> = {};
    parsedFiles.forEach((pf) => {
      if (!dateGroups[pf.date]) dateGroups[pf.date] = { dateSort: pf.dateSort, files: [] };
      dateGroups[pf.date].files.push(pf);
    });
    const newSnapshots = [...snapshots];
    Object.entries(dateGroups).forEach(([date, group]) => {
      const existingIdx = newSnapshots.findIndex((s) => s.date === date);
      if (existingIdx >= 0) {
        const existing = newSnapshots[existingIdx];
        const updatedUnits = [...existing.units];
        group.files.forEach((pf) => {
          const unitIdx = updatedUnits.findIndex((u) => u.code === pf.unitKey);
          if (unitIdx >= 0) updatedUnits[unitIdx] = pf.unit;
          else updatedUnits.push(pf.unit);
        });
        newSnapshots[existingIdx] = { ...existing, units: updatedUnits };
      } else {
        newSnapshots.push({
          date,
          dateSort: group.dateSort,
          units: group.files.map((pf) => pf.unit),
        });
      }
    });
    newSnapshots.sort((a, b) => a.dateSort.localeCompare(b.dateSort));
    setSnapshots(newSnapshots);
    setSelectedSnapshotIndex(newSnapshots.length - 1);
  }, [snapshots]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const xlsxFiles = Array.from(files).filter((f) => f.name.endsWith(".xlsx"));
    if (xlsxFiles.length === 0) return;
    const newStatuses = xlsxFiles.map((f) => ({ file: f, status: "parsing" as const }));
    setFileStatuses((prev) => [...prev, ...newStatuses]);
    try {
      const parsed = await parseMultipleFiles(xlsxFiles);
      const parsedFilenames = new Set(parsed.map((p) => p.filename));
      setFileStatuses((prev) =>
        prev.map((s) => {
          if (s.status !== "parsing") return s;
          return parsedFilenames.has(s.file.name)
            ? { ...s, status: "success" as const }
            : { ...s, status: "error" as const };
        })
      );
      if (parsed.length > 0) handleFilesParsed(parsed);
    } catch {
      setFileStatuses((prev) => prev.map((s) => s.status === "parsing" ? { ...s, status: "error" as const } : s));
    }
  }, [handleFilesParsed]);

  // Determine which tab content to show
  const renderContent = () => {
    if (activeSheet === "rekap") {
      return <RecapTable units={latestUnits} prevSnapshot={prevSnapshot} currentSnapshot={currentSnapshot} />;
    }
    if (activeSheet === "konsol") {
      // KONSOL = consolidated view (same as REKAP but titled differently)
      return <RecapTable units={latestUnits} prevSnapshot={prevSnapshot} currentSnapshot={currentSnapshot} />;
    }
    if (activeSheet === "tren") {
      return <TrendCharts snapshots={snapshots} />;
    }
    // Unit detail tab
    const tab = SHEET_TABS.find((t) => t.key === activeSheet);
    if (tab?.unitCode) {
      const unit = latestUnits.find((u) => u.code === tab.unitCode);
      if (!unit) {
        return (
          <div className="text-center py-16 text-gray-400 text-sm">
            Data unit {tab.label} belum tersedia. Upload file KPI untuk unit ini.
          </div>
        );
      }
      const prevUnit = prevSnapshot?.units.find((u) => u.code === tab.unitCode);
      return <UnitDetailTable unit={unit} unitLabel={tab.unitLabel || unit.name} prevUnit={prevUnit} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar - minimal like Excel title bar */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-full mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h1 className="text-sm font-black tracking-tight">
                MONEV KPI TEGALBOTO 2026
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={String(selectedSnapshotIndex)} onValueChange={(v) => setSelectedSnapshotIndex(Number(v))}>
                  <SelectTrigger className="w-[160px] h-7 text-[11px]">
                    <SelectValue placeholder="Pilih Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s, idx) => (
                      <SelectItem key={s.dateSort} value={String(idx)} className="text-[11px]">
                        {s.date} {idx === snapshots.length - 1 && "(Terbaru)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5"
                onClick={() => setShowUpload(!showUpload)}
              >
                <Upload className="h-3 w-3" />
                Upload KPI
                {showUpload ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Badge variant="outline" className="text-[10px]">
                {latestUnits.length} unit
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Upload panel (collapsible) */}
      {showUpload && (
        <div className="bg-white border-b px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                isDragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Upload className={`mx-auto h-6 w-6 mb-1 ${isDragging ? "text-emerald-500" : "text-muted-foreground"}`} />
              <p className="text-xs font-medium">
                {isDragging ? "Lepaskan file di sini..." : "Drag & drop file KPI (.xlsx) atau klik untuk memilih"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Mendukung upload 7 file sekaligus
              </p>
            </div>
            {fileStatuses.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{fileStatuses.length} file</p>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setFileStatuses([])}>
                    <X className="h-2.5 w-2.5 mr-0.5" /> Hapus
                  </Button>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {fileStatuses.map((fs, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-gray-50 text-[11px]">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="flex-1 truncate">{fs.file.name}</span>
                      {fs.status === "parsing" && <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />}
                      {fs.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      {fs.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheet tabs - Excel style */}
      <div className="bg-white border-b">
        <div className="max-w-full mx-auto px-2">
          <div className="flex overflow-x-auto gap-0.5 no-scrollbar">
            {SHEET_TABS.map((tab) => {
              const isActive = activeSheet === tab.key;
              // Check if unit tab has data
              let hasData = true;
              if (tab.unitCode && !latestUnits.find((u) => u.code === tab.unitCode)) {
                hasData = false;
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSheet(tab.key)}
                  className={`
                    px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 shrink-0
                    ${isActive
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                      : hasData
                        ? "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        : "border-transparent text-gray-300 hover:text-gray-400"
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <main className="flex-1 p-4">
        <div className="max-w-full mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Footer - minimal */}
      <footer className="bg-white border-t">
        <div className="max-w-full mx-auto px-4 py-1.5">
          <p className="text-[9px] text-gray-400 text-center">
            Dashboard Monev KPI Kanwil Surabaya &mdash; Data bersumber dari Komparasi Komponen KPI CP Tegalboto v2
          </p>
        </div>
      </footer>
    </div>
  );
}