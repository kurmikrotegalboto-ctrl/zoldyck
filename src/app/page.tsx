"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, GitCompareArrows, TrendingDown, Grid3x3, Lightbulb, Activity } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ComparisonTable } from "@/components/dashboard/comparison-table";
import { GapAnalysis } from "@/components/dashboard/gap-analysis";
import { HeatmapView } from "@/components/dashboard/heatmap";
import { Recommendations } from "@/components/dashboard/recommendations";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <h1 className="text-base font-black tracking-tight">
                  MONEV KPI
                </h1>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monitoring & Evaluasi KPI &mdash; CP Tegalboto & Wilayah Bawahan Kanwil Surabaya
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
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="ringkasan" className="space-y-6">
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
            <TabsTrigger value="rekomendasi" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white px-3 py-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rekomendasi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan">
            <SummaryCards />
          </TabsContent>

          <TabsContent value="perbandingan">
            <ComparisonTable />
          </TabsContent>

          <TabsContent value="gap">
            <GapAnalysis />
          </TabsContent>

          <TabsContent value="heatmap">
            <HeatmapView />
          </TabsContent>

          <TabsContent value="rekomendasi">
            <Recommendations />
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