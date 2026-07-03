"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Activity, CalendarDays, LogOut, Trash2,
  Settings, Key, TrendingUp, BarChart3, Menu, XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitDetailTable } from "@/components/dashboard/unit-detail-table";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { defaultSnapshot } from "@/lib/default-data";
import { parseMultipleFiles } from "@/lib/kpi-parser";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const UNIT_SIDEBAR = [
  { code: "14200_UPC", label: "UPC TEGALBOTO", short: "UPC Tegalboto" },
  { code: "14200_CP", label: "CP TEGALBOTO", short: "CP Tegalboto" },
  { code: "14201", label: "BASUKI RAHMAD", short: "Basuki Rahmad" },
  { code: "14202", label: "S PARMAN", short: "S. Parman" },
  { code: "14204", label: "KALISAT", short: "Kalisat" },
  { code: "14205", label: "MAYANG", short: "Mayang" },
  { code: "17506", label: "COLO SUMBERJATI", short: "Colo Sumberjati" },
];

export default function Home() {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([defaultSnapshot]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"kpi" | "trend">("kpi");
  const [showUpload, setShowUpload] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<{ file: File; status: "pending" | "parsing" | "success" | "error"; errorMsg?: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isServerMode, setIsServerMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteDate, setDeleteDate] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => { fetchSnapshots(); }, []);

  const fetchSnapshots = async () => {
    try {
      const res = await fetch("/api/snapshots");
      if (res.ok) {
        const data = await res.json();
        if (data.snapshots && data.snapshots.length > 0) {
          setSnapshots(data.snapshots);
          setSelectedSnapshotIndex(data.snapshots.length - 1);
          setIsServerMode(true);
        }
      }
    } catch (e) { console.error("Failed to fetch snapshots:", e); }
  };

  const currentSnapshot = snapshots[selectedSnapshotIndex];
  const prevSnapshot = selectedSnapshotIndex > 0 ? snapshots[selectedSnapshotIndex - 1] : undefined;
  const latestUnits: KpiUnit[] = currentSnapshot?.units ?? [];

  useEffect(() => {
    if (!selectedUnitCode && latestUnits.length > 0) setSelectedUnitCode(latestUnits[0].code);
  }, [latestUnits, selectedUnitCode]);

  const selectedUnit = latestUnits.find((u) => u.code === selectedUnitCode);
  const prevUnit = prevSnapshot?.units.find((u) => u.code === selectedUnitCode);

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
          return parsedFilenames.has(s.file.name) ? { ...s, status: "success" as const } : { ...s, status: "error" as const, errorMsg: "Format tidak dikenali" };
        })
      );
      if (parsed.length === 0) return;
      const dateGroups: Record<string, { date: string; dateSort: string; units: KpiUnit[] }> = {};
      parsed.forEach((pf) => {
        if (!dateGroups[pf.date]) dateGroups[pf.date] = { date: pf.date, dateSort: pf.dateSort, units: [] };
        dateGroups[pf.date].units.push(pf.unit);
      });
      for (const group of Object.values(dateGroups)) {
        const snapshot: SnapshotData = { date: group.date, dateSort: group.dateSort, units: group.units };
        const res = await fetch("/api/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }) });
        if (res.ok) { const data = await res.json(); if (data.snapshots) { setSnapshots(data.snapshots); setSelectedSnapshotIndex(data.snapshots.length - 1); setIsServerMode(true); } }
      }
    } catch { setFileStatuses((prev) => prev.map((s) => s.status === "parsing" ? { ...s, status: "error" as const, errorMsg: "Gagal memproses" } : s)); }
  }, []);

  const handleDeleteSnapshot = async () => {
    if (!deleteDate) return;
    try {
      const res = await fetch(`/api/snapshots?date=${encodeURIComponent(deleteDate)}`, { method: "DELETE" });
      if (res.ok) { const data = await res.json(); setSnapshots(data.snapshots); if (selectedSnapshotIndex >= data.snapshots.length) setSelectedSnapshotIndex(Math.max(0, data.snapshots.length - 1)); setShowDeleteConfirm(false); }
    } catch (e) { console.error("Delete failed:", e); }
  };

  const handleLogout = async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/login"; };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) return;
    const res = await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }) });
    const data = await res.json();
    if (res.ok) { setPwdMsg("Password berhasil diubah!"); setCurrentPwd(""); setNewPwd(""); setTimeout(() => { setPwdMsg(""); setShowSettings(false); }, 2000); }
    else { setPwdMsg(data.error || "Gagal mengubah password"); }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* TOP BAR */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="lg:hidden p-1 rounded hover:bg-gray-100" onClick={() => setMobileSidebar(!mobileSidebar)}>
            {mobileSidebar ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button className="hidden lg:block p-1 rounded hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-4 w-4 text-gray-500" />
          </button>
          <Activity className="h-4 w-4 text-emerald-600" />
          <h1 className="text-sm font-black tracking-tight text-gray-800">MONEV KPI TEGALBOTO 2026</h1>
          {isServerMode && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={String(selectedSnapshotIndex)} onValueChange={(v) => setSelectedSnapshotIndex(Number(v))}>
              <SelectTrigger className="w-[150px] h-7 text-[11px]"><SelectValue placeholder="Pilih Periode" /></SelectTrigger>
              <SelectContent>
                {snapshots.map((s, idx) => (
                  <SelectItem key={s.dateSort} value={String(idx)} className="text-[11px]">
                    {s.date} {idx === snapshots.length - 1 && "(Terbaru)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isServerMode && currentSnapshot && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
              onClick={() => { setDeleteDate(currentSnapshot.dateSort); setShowDeleteConfirm(true); }} title="Hapus periode ini">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5" onClick={() => setShowUpload(!showUpload)}>
            <Upload className="h-3 w-3" /><span className="hidden sm:inline">Upload KPI</span>
            {showUpload ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => { setShowSettings(true); setPwdMsg(""); setCurrentPwd(""); setNewPwd(""); }} title="Pengaturan">
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleLogout} title="Logout">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* UPLOAD PANEL */}
      {showUpload && (
        <div className="bg-white border-b px-4 py-3 shrink-0 z-20">
          <div className="max-w-2xl mx-auto">
            <div className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${isDragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }} onClick={() => document.getElementById("file-input")?.click()}>
              <input id="file-input" type="file" accept=".xlsx" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
              <Upload className={`mx-auto h-6 w-6 mb-1 ${isDragging ? "text-emerald-500" : "text-muted-foreground"}`} />
              <p className="text-xs font-medium">{isDragging ? "Lepaskan file di sini..." : "Drag & drop file KPI (.xlsx) atau klik untuk memilih"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Mendukung upload 7 file sekaligus · Data tersimpan di server</p>
            </div>
            {fileStatuses.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{fileStatuses.length} file</p>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setFileStatuses([])}><X className="h-2.5 w-2.5 mr-0.5" /> Hapus</Button>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {fileStatuses.map((fs, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-gray-50 text-[11px]">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="flex-1 truncate">{fs.file.name}</span>
                      {fs.status === "parsing" && <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />}
                      {fs.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      {fs.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" title={fs.errorMsg} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BODY: SIDEBAR + CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {mobileSidebar && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setMobileSidebar(false)} />}

        <aside className={`shrink-0 bg-white border-r flex flex-col z-20 transition-all duration-200 ${sidebarOpen ? "w-[220px]" : "w-0 lg:w-[52px]"} ${mobileSidebar ? "fixed inset-y-0 left-0 top-[45px] w-[220px]" : "hidden lg:flex"} ${!mobileSidebar && !sidebarOpen ? "lg:flex" : ""} overflow-hidden`}>
          <div className="px-3 py-3 border-b bg-gray-50/80">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600 shrink-0" />
              {sidebarOpen && <h2 className="text-xs font-black tracking-wider text-gray-700">KPI</h2>}
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            <button onClick={() => { setActiveView("trend"); setMobileSidebar(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors ${activeView === "trend" ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600" : "text-gray-600 hover:bg-gray-50 border-r-2 border-transparent"}`}>
              <TrendingUp className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Tren</span>}
            </button>
            <div className="my-1 mx-3 border-t" />
            {UNIT_SIDEBAR.map((u) => {
              const unit = latestUnits.find((lu) => lu.code === u.code);
              const isActive = activeView === "kpi" && selectedUnitCode === u.code;
              const hasData = !!unit;
              return (
                <button key={u.code} onClick={() => { setSelectedUnitCode(u.code); setActiveView("kpi"); setMobileSidebar(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors ${isActive ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600" : hasData ? "text-gray-600 hover:bg-gray-50 border-r-2 border-transparent" : "text-gray-300 border-r-2 border-transparent cursor-default"}`}
                  disabled={!hasData}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hasData ? (unit!.total_kpi >= 85 ? "#059669" : unit!.total_kpi >= 70 ? "#d97706" : unit!.total_kpi >= 55 ? "#ea580c" : "#dc2626") : "#d1d5db" }} />
                  {sidebarOpen && <div className="flex-1 text-left"><div className="truncate">{u.short}</div></div>}
                  {sidebarOpen && hasData && (
                    <span className={`text-[10px] font-bold tabular-nums ${unit!.total_kpi >= 85 ? "text-emerald-600" : unit!.total_kpi >= 70 ? "text-amber-600" : unit!.total_kpi >= 55 ? "text-orange-600" : "text-red-600"}`}>
                      {unit!.total_kpi.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          {sidebarOpen && <div className="px-3 py-2 border-t bg-gray-50/50"><p className="text-[9px] text-gray-400">{latestUnits.length} unit · {snapshots.length} periode</p></div>}
        </aside>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {activeView === "trend" ? (
            <TrendCharts snapshots={snapshots} />
          ) : selectedUnit ? (
            <UnitDetailTable unit={selectedUnit} unitLabel={UNIT_SIDEBAR.find(u => u.code === selectedUnit.code)?.label || selectedUnit.name} prevUnit={prevUnit} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Pilih unit di sidebar untuk melihat KPI</p>
            </div>
          )}
        </main>
      </div>

      {/* SETTINGS DIALOG */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> Pengaturan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Ganti Password</h3>
              <input type="password" placeholder="Password lama" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-2" />
              <input type="password" placeholder="Password baru (min. 6 karakter)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            {pwdMsg && <p className={`text-sm ${pwdMsg.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>{pwdMsg}</p>}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-medium mb-1">Info Server</p>
              <p>Mode: {isServerMode ? "Server (data tersimpan)" : "Lokal (data sementara)"}</p>
              <p>Total Periode: {snapshots.length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Tutup</Button>
            <Button onClick={handleChangePassword} disabled={!currentPwd || !newPwd}>Simpan Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Periode</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Yakin ingin menghapus data periode <strong>{deleteDate}</strong>? Tindakan ini tidak bisa dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteSnapshot}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}