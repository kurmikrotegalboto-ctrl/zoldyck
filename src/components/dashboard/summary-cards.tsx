"use client";

import type { KpiUnit } from "@/lib/kpi-types";
import { getUnitBadge } from "@/lib/kpi-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, BarChart3, Trophy, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  units: KpiUnit[];
}

export function SummaryCards({ units }: SummaryCardsProps) {
  const sorted = [...units].sort((a, b) => b.total_kpi - a.total_kpi);
  const avgKpi = units.reduce((s, u) => s + u.total_kpi, 0) / units.length;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rata-rata KPI</p>
            <p className="text-2xl font-bold mt-1">
              {avgKpi.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">dari {units.length} unit</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Unit Terbaik</p>
            <p className="text-lg font-bold mt-1">{sorted[0]?.name}</p>
            <p className="text-xs text-emerald-600 mt-1">{sorted[0]?.total_kpi} poin</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Unit Terendah</p>
            <p className="text-lg font-bold mt-1">{sorted[sorted.length - 1]?.name}</p>
            <p className="text-xs text-red-600 mt-1">{sorted[sorted.length - 1]?.total_kpi} poin</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Gap Tertinggi</p>
            <p className="text-lg font-bold mt-1">{(((sorted[0]?.total_kpi ?? 0) - (sorted[sorted.length - 1]?.total_kpi ?? 0))).toFixed(1)}</p>
            <p className="text-xs text-orange-600 mt-1">selisih poin</p>
          </CardContent>
        </Card>
      </div>

      {/* Unit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((unit, idx) => {
          const badge = getUnitBadge(unit.total_kpi);
          const trend = idx === 0 ? "up" : idx < 3 ? "stable" : "down";
          const totalBobot = unit.components.reduce((s, c) => s + c.bobot, 0);
          const komponenAktif = unit.components.filter(c => c.bobot > 0).length;
          const komponenCapai = unit.components.filter(c => c.bobot > 0 && c.ach >= 1.0).length;
          const komponenKritis = unit.components.filter(c => c.bobot > 0 && c.ach > 0 && c.ach < 0.5).length;

          return (
            <Card key={unit.code} className={`relative overflow-hidden ${idx === 0 ? "ring-2 ring-emerald-400" : idx >= sorted.length - 1 ? "ring-2 ring-red-300" : ""}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{unit.code}</p>
                    <CardTitle className="text-sm font-bold truncate">{unit.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {trend === "stable" && <Minus className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">{unit.total_kpi}</span>
                  <span className="text-sm text-muted-foreground mb-1">/ {totalBobot} poin</span>
                </div>
                <Progress
                  value={(unit.total_kpi / totalBobot) * 100}
                  className="h-2.5"
                />
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline" className={`${badge.bg} ${badge.text} border-0 text-[10px] px-2 py-0`}>
                    {badge.label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {komponenCapai}/{komponenAktif} capai
                  </span>
                  {komponenKritis > 0 && (
                    <span className="text-red-500 font-medium flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      {komponenKritis} kritis
                    </span>
                  )}
                </div>
              </CardContent>
              {idx === 0 && (
                <div className="absolute top-2 right-2">
                  <Trophy className="h-5 w-5 text-emerald-500" />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bar Chart Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Perbandingan Total KPI Antar Unit
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {sorted.map(unit => {
              const totalBobotU = unit.components.reduce((s, c) => s + c.bobot, 0);
              const pct = (unit.total_kpi / totalBobotU) * 100;
              return (
                <div key={unit.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[60%]">{unit.name}</span>
                    <span className="font-bold">{unit.total_kpi} <span className="text-muted-foreground font-normal">/ {totalBobotU}</span></span>
                  </div>
                  <div className="relative h-7 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${
                        unit.total_kpi >= 85 ? "bg-emerald-500" :
                        unit.total_kpi >= 70 ? "bg-amber-500" :
                        unit.total_kpi >= 55 ? "bg-orange-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}