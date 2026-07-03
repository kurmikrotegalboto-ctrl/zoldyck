"use client";

import { useState } from "react";
import type { KpiUnit } from "@/lib/kpi-types";
import { getAllKpiNames, getHeatmapColor } from "@/lib/kpi-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3x3 } from "lucide-react";

interface HeatmapViewProps {
  units: KpiUnit[];
}

export function HeatmapView({ units }: HeatmapViewProps) {
  const kpiNames = getAllKpiNames(units);
  const [sortBy, setSortBy] = useState<string>("default");

  const sortedNames = [...kpiNames];
  if (sortBy === "avg-ach") {
    sortedNames.sort((a, b) => {
      const avgA = getAvgAch(a, units);
      const avgB = getAvgAch(b, units);
      return avgA - avgB;
    });
  } else if (sortBy === "max-variance") {
    sortedNames.sort((a, b) => {
      const varA = getMaxVariance(a, units);
      const varB = getMaxVariance(b, units);
      return varB - varA;
    });
  } else if (sortBy === "all-critical") {
    sortedNames.sort((a, b) => {
      const critA = countCritical(a, units);
      const critB = countCritical(b, units);
      return critB - critA;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[220px] h-9 text-xs">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Urutan Default</SelectItem>
            <SelectItem value="avg-ach">ACH Terendah</SelectItem>
            <SelectItem value="max-variance">Variance Tertinggi</SelectItem>
            <SelectItem value="all-critical">Terbanyak Kritis</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Warna menunjukkan tingkat pencapaian. Semakin gelap hijau = semakin baik, semakin gelap merah = semakin kritis.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-emerald-600" /> &gt;110%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-emerald-400" /> 100-110%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-emerald-200" /> 90-100%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-amber-200" /> 80-90%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-300" /> 60-80%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-300" /> 30-60%</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-600" /> &lt;30%</div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Heatmap Pencapaian KPI (ACH %)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-semibold sticky left-0 bg-muted/50 min-w-[200px] z-10">Komponen KPI</th>
                    {units.map(u => (
                      <th key={u.code} className="text-center p-2 font-semibold min-w-[110px]">
                        <div className="truncate text-[10px]">{u.name}</div>
                      </th>
                    ))}
                    <th className="text-center p-2 font-semibold min-w-[80px] bg-muted/50 sticky right-0 z-10">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNames.map((name, idx) => {
                    const achValues = units.map(u => {
                      const c = u.components.find(comp => comp.kpi_name === name);
                      return c && c.bobot > 0 ? c.ach : null;
                    });
                    const validAchs = achValues.filter((v): v is number => v !== null);
                    const avg = validAchs.length > 0 ? validAchs.reduce((s, v) => s + v, 0) / validAchs.length : 0;

                    return (
                      <tr key={name} className={`border-b ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                        <td className="p-2 font-medium sticky left-0 bg-inherit z-10 text-[11px]">
                          <div className="max-w-[200px] truncate">{name}</div>
                        </td>
                        {units.map(u => {
                          const c = u.components.find(comp => comp.kpi_name === name);
                          if (!c || c.bobot === 0) {
                            return <td key={u.code} className="p-2"><div className="h-8 bg-gray-100 rounded flex items-center justify-center text-gray-300">-</div></td>;
                          }
                          return (
                            <td key={u.code} className="p-2">
                              <div className={`h-8 rounded flex items-center justify-center font-semibold text-[11px] ${getHeatmapColor(c.ach, c.bobot)}`}>
                                {(c.ach * 100).toFixed(0)}%
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 sticky right-0 bg-inherit z-10">
                          <div className={`h-8 rounded flex items-center justify-center font-bold text-[11px] ${getHeatmapColor(avg, 1)}`}>
                            {(avg * 100).toFixed(0)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function getAvgAch(name: string, units: KpiUnit[]): number {
  const achs = units.map(u => {
    const c = u.components.find(comp => comp.kpi_name === name);
    return c && c.bobot > 0 ? c.ach : null;
  }).filter((v): v is number => v !== null);
  return achs.length > 0 ? achs.reduce((s, v) => s + v, 0) / achs.length : 0;
}

function getMaxVariance(name: string, units: KpiUnit[]): number {
  const achs = units.map(u => {
    const c = u.components.find(comp => comp.kpi_name === name);
    return c && c.bobot > 0 ? c.ach : null;
  }).filter((v): v is number => v !== null);
  if (achs.length < 2) return 0;
  const max = Math.max(...achs);
  const min = Math.min(...achs);
  return max - min;
}

function countCritical(name: string, units: KpiUnit[]): number {
  return units.filter(u => {
    const c = u.components.find(comp => comp.kpi_name === name);
    return c && c.bobot > 0 && c.ach > 0 && c.ach < 0.5;
  }).length;
}