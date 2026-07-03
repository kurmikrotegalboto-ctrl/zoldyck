"use client";

import { kpiData, getAchBadge, type KpiUnit } from "@/lib/kpi-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BarChart3 } from "lucide-react";

function totalBobotFor(unit: KpiUnit) {
  return unit.components.reduce((s, c) => s + c.bobot, 0);
}

export function ComparisonTable() {
  const kpiNames = getAllActiveKpiNames();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tabel Perbandingan KPI Antar Unit
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Warna menunjukkan status pencapaian: Hijau = Capai target, Kuning = Hampir, Oranye = Jauh, Merah = Kritis
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[200px]">Komponen KPI</th>
                    <th className="text-center p-3 font-semibold min-w-[50px]">Bobot</th>
                    {kpiData.map(u => (
                      <th key={u.code} className="text-center p-3 font-semibold min-w-[120px]">
                        <div className="truncate">{u.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpiNames.map((name, idx) => {
                    // Get bobot from first unit that has this component
                    const bobot = kpiData
                      .map(u => u.components.find(c => c.kpi_name === name))
                      .find(c => c && c.bobot > 0)?.bobot ?? 0;
                    
                    return (
                      <tr key={name} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="p-3 font-medium sticky left-0 bg-inherit">
                          <div className="max-w-[200px] truncate">{name}</div>
                        </td>
                        <td className="text-center p-3 text-muted-foreground">{bobot}</td>
                        {kpiData.map(u => {
                          const comp = u.components.find(c => c.kpi_name === name);
                          if (!comp || comp.bobot === 0) {
                            return (
                              <td key={u.code} className="text-center p-3 text-gray-300">-</td>
                            );
                          }
                          const badge = getAchBadge(comp.ach, comp.bobot);
                          return (
                            <td key={u.code} className="text-center p-3">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className={`${badge.bg} ${badge.text} border-0 text-[10px] px-1.5 py-0`}>
                                  {(comp.ach * 100).toFixed(0)}%
                                </Badge>
                                <span className="font-semibold">{comp.kpi_score}/{comp.bobot}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                    <td className="p-3 sticky left-0 bg-gray-100">TOTAL KPI</td>
                    <td className="text-center p-3">-</td>
                    {kpiData.map(u => (
                      <td key={u.code} className="text-center p-3">
                        <span className={`text-sm font-black ${
                          u.total_kpi >= 85 ? "text-emerald-700" :
                          u.total_kpi >= 70 ? "text-amber-700" :
                          u.total_kpi >= 55 ? "text-orange-700" : "text-red-700"
                        }`}>
                          {u.total_kpi}
                        </span>
                      </td>
                    ))}
                  </tr>
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

function getAllActiveKpiNames(): string[] {
  const nameSet = new Set<string>();
  kpiData.forEach(unit => {
    unit.components.forEach(c => {
      if (c.bobot > 0) nameSet.add(c.kpi_name);
    });
  });
  return Array.from(nameSet);
}