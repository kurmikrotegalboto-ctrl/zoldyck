"use client";

import { useState } from "react";
import type { KpiUnit } from "@/lib/kpi-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown } from "lucide-react";

interface GapAnalysisProps {
  units: KpiUnit[];
}

export function GapAnalysis({ units }: GapAnalysisProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>("all");

  const filteredUnits = selectedUnit === "all"
    ? units
    : units.filter(u => u.code === selectedUnit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
          <SelectTrigger className="w-[250px] h-9 text-xs">
            <SelectValue placeholder="Pilih Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Unit</SelectItem>
            {units.map(u => (
              <SelectItem key={u.code} value={u.code}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Komponen di bawah target (ACH &lt; 100%), diurutkan dari terburuk
        </p>
      </div>

      {filteredUnits.map(unit => {
        const belowTarget = unit.components
          .filter(c => c.bobot > 0 && c.ach > 0 && c.ach < 1.0)
          .sort((a, b) => a.ach - b.ach);

        const totalBobot = unit.components.reduce((s, c) => s + c.bobot, 0);
        const lostPoints = belowTarget.reduce((s, c) => s + (c.bobot - c.kpi_score), 0);

        return (
          <Card key={unit.code}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">{unit.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px]">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Potensi kehilangan: {lostPoints.toFixed(1)} poin
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {belowTarget.length} komponen di bawah target
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {belowTarget.map(comp => {
                const pct = (comp.ach * 100).toFixed(1);
                const gapPct = ((1 - comp.ach) * 100).toFixed(1);
                const severity = comp.ach < 0.3 ? "kritis" : comp.ach < 0.6 ? "tinggi" : "sedang";
                const barColor = severity === "kritis" ? "bg-red-500" : severity === "tinggi" ? "bg-orange-500" : "bg-amber-500";

                return (
                  <div key={comp.kpi_name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {severity === "kritis" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium truncate">{comp.kpi_name}</span>
                        <span className="text-muted-foreground shrink-0">(Bobot: {comp.bobot})</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-muted-foreground">
                          {comp.kpi_score}/{comp.bobot} poin
                        </span>
                        <span className={`font-bold ${severity === "kritis" ? "text-red-600" : severity === "tinggi" ? "text-orange-600" : "text-amber-600"}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                        <div
                          className={`h-full ${barColor} rounded transition-all duration-300`}
                          style={{ width: `${Math.min(comp.ach * 100, 100)}%` }}
                        />
                        <div className="absolute top-0 left-1/2 h-full w-px bg-gray-400 z-10" style={{ left: "100%" }} />
                      </div>
                      <span className="text-[10px] text-red-500 font-medium shrink-0 w-12 text-right">
                        -{gapPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {belowTarget.length === 0 && (
                <p className="text-xs text-emerald-600 text-center py-4 font-medium">
                  Semua komponen sudah mencapai target!
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}