"use client";

import { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, GitCompareArrows, TrendingDown, Grid3x3, Lightbulb, Activity, TrendingUp, CalendarDays } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ComparisonTable } from "@/components/dashboard/comparison-table";
import { GapAnalysis } from "@/components/dashboard/gap-analysis";
import { HeatmapView } from "@/components/dashboard/heatmap";
import { Recommendations } from "@/components/dashboard/recommendations";
import { FileUpload } from "@/components/dashboard/file-upload";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { defaultSnapshot } from "@/lib/default-data";
import type { ParsedFile } from "@/lib/kpi-parser";
import type { SnapshotData, KpiUnit } from "@/lib/kpi-types";

export default function Home() {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([defaultSnapshot]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("ringkasan");

  // Derive latest units from selected snapshot
  const latestUnits: KpiUnit[] = useMemo(() => {
    return snapshots[selectedSnapshotIndex]?.units ?? [];
  }, [snapshots, selectedSnapshotIndex]);

  // Handle file uploads - parse and group by date, add as new snapshot
  const handleFilesParsed = useCallback((parsedFiles: ParsedFile[]) => {
    if (parsedFiles.length === 0) return;

    // Group by date
    const dateGroups: Record<string, { dateSort: string; files: ParsedFile[] }> = {};
    parsedFiles.forEach((pf) => {
      if (!dateGroups[pf.date]) {
        dateGroups[pf.date] = { dateSort: pf.dateSort, files: [] };
      }
      dateGroups[pf.date].files.push(pf);
    });

    // For each date group, create or merge a snapshot
    const newSnapshots = [...snapshots];

    Object.entries(dateGroups).forEach(([date, group]) => {
      // Check if snapshot with this date already exists
      const existingIdx = newSnapshots.findIndex(
        (s) => s.date === date
      );

      if (existingIdx >= 0) {
        // Merge: update units from parsed files, keep existing units not in parsed files
        const existing = newSnapshots[existingIdx];
        const updatedUnits = [...existing.units];
        group.files.forEach((pf) => {
          const unitIdx = updatedUnits.findIndex(
            (u) => u.code === pf.unitKey
          );
          if (unitIdx >= 0) {
            updatedUnits[unitIdx] = pf.unit;
          } else {
            updatedUnits.push(pf.unit);
          }
        });
        newSnapshots[existingIdx] = {
          ...existing,
          units: updatedUnits,
        };
      } else {
        // Create new snapshot
        const newSnapshot: SnapshotData = {
          date,
          dateSort: group.dateSort,
          units: group.files.map((pf) => pf.unit),
        };
        newSnapshots.push(newSnapshot);
      }
    });

    // Sort snapshots by dateSort
    newSnapshots.sort((a, b) => a.dateSort.localeCompare(b.dateSort));

    setSnapshots(newSnapshots);
    // Auto-select the latest snapshot
    setSelectedSnapshotIndex(newSnapshots.length - 1);
  }, [snapshots]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <h1 className="text-base font-black tracking-tight">
                  MONEV KPI - CP Tegalboto &amp; Wilayah Bawahan
                </h1>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monitoring &amp; Evaluasi KPI &mdash; Kanwil Surabaya
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-muted-foreground">Terakhir diperbarui</p>
              <p className="text-xs font-semibold">
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Upload Section */}
        <div className="mb-6">
          <FileUpload onFilesParsed={handleFilesParsed} />
        </div>

        {/* Snapshot Selector & Info */}
        {snapshots.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Periode Data:</span>
            </div>
            {activeTab !== "tren" ? (
              <Select
                value={String(selectedSnapshotIndex)}
                onValueChange={(v) => setSelectedSnapshotIndex(Number(v))}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s, idx) => (
                    <SelectItem key={s.dateSort} value={String(idx)}>
                      {s.date}
                      {idx === snapshots.length - 1 && " (Terbaru)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Badge variant="outline" className="text-[10px]">
              {snapshots.length} periode data
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {latestUnits.length} unit
            </Badge>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="ringkasan" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ringkasan</span>
            </TabsTrigger>
            <TabsTrigger value="perbandingan" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <GitCompareArrows className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Perbandingan</span>
            </TabsTrigger>
            <TabsTrigger value="gap" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analisis Gap</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <Grid3x3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="tren" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tren Waktu</span>
            </TabsTrigger>
            <TabsTrigger value="rekomendasi" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rekomendasi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan">
            <SummaryCards units={latestUnits} />
          </TabsContent>

          <TabsContent value="perbandingan">
            <ComparisonTable units={latestUnits} />
          </TabsContent>

          <TabsContent value="gap">
            <GapAnalysis units={latestUnits} />
          </TabsContent>

          <TabsContent value="heatmap">
            <HeatmapView units={latestUnits} />
          </TabsContent>

          <TabsContent value="tren">
            <TrendCharts snapshots={snapshots} />
          </TabsContent>

          <TabsContent value="rekomendasi">
            <Recommendations units={latestUnits} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-[10px] text-muted-foreground text-center">
            Dashboard Monev KPI Kanwil Surabaya &mdash; Data bersumber dari Komparasi Komponen KPI CP Tegalboto v2
          </p>
        </div>
      </footer>
    </div>
  );
}