"use client";

import { useState } from "react";
import type { KpiUnit } from "@/lib/kpi-types";
import { generateRecommendations, type Recommendation } from "@/lib/kpi-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Lightbulb, Target, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecommendationsProps {
  units: KpiUnit[];
}

export function Recommendations({ units }: RecommendationsProps) {
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const recs = generateRecommendations(units);

  const filtered = recs.filter(r => {
    if (filterUnit !== "all") {
      const unit = units.find(u => u.name === r.unit);
      if (!unit || unit.code !== filterUnit) return false;
    }
    if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
    return true;
  });

  // Critical components across all units (common issues)
  const criticalSummary = getCriticalSummary(units, recs);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedItems(next);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterUnit} onValueChange={setFilterUnit}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <SelectValue placeholder="Filter Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Unit</SelectItem>
            {units.map(u => (
              <SelectItem key={u.code} value={u.code}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Filter Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Level</SelectItem>
            <SelectItem value="kritis">Kritis (&lt;30%)</SelectItem>
            <SelectItem value="tinggi">Tinggi (30-60%)</SelectItem>
            <SelectItem value="sedang">Sedang (60-100%)</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px]">
          {filtered.length} rekomendasi
        </Badge>
      </div>

      {/* Critical Summary - Common Issues */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800">
            <Target className="h-4 w-4" />
            Masalah Umum Antar Unit
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {criticalSummary.map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-orange-100">
                <div className="flex items-start gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0 mt-0.5 ${
                    item.affectedUnits >= 5 ? "bg-red-500" : item.affectedUnits >= 3 ? "bg-orange-500" : "bg-amber-500"
                  }`}>
                    {item.affectedUnits}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{item.component}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Terdampak di {item.affectedUnits} dari {units.length} unit &mdash; Rata-rata ACH: {(item.avgAch * 100).toFixed(1)}%
                    </p>
                    <p className="text-[11px] mt-1.5 text-gray-700">{item.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Recommendations */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const key = `${r.unit}-${r.component}`;
          const isExpanded = expandedItems.has(key);

          return (
            <Card key={key} className={`overflow-hidden ${
              r.severity === "kritis" ? "border-red-200" :
              r.severity === "tinggi" ? "border-orange-200" : "border-amber-200"
            }`}>
              <button
                onClick={() => toggleExpand(key)}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  r.severity === "kritis" ? "bg-red-100" :
                  r.severity === "tinggi" ? "bg-orange-100" : "bg-amber-100"
                }`}>
                  {r.severity === "kritis" ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Lightbulb className={`h-4 w-4 ${r.severity === "tinggi" ? "text-orange-600" : "text-amber-600"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold">{r.unit}</span>
                    <Badge variant="outline" className={`text-[9px] border-0 ${
                      r.severity === "kritis" ? "bg-red-100 text-red-700" :
                      r.severity === "tinggi" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.component} &mdash; ACH: {(r.ach * 100).toFixed(1)}% | Gap: {r.gap}% | Bobot: {r.bobot}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pl-15 border-t bg-muted/20">
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium">{r.bobot} poin</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tercapai: </span>
                        <span className="font-medium text-red-600">{(r.ach * r.bobot).toFixed(2)} poin</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kehilangan: </span>
                        <span className="font-medium text-red-600">{(r.bobot * (1 - r.ach)).toFixed(2)} poin</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 border">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Rekomendasi:</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{r.suggestion}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getCriticalSummary(units: KpiUnit[], recs: Recommendation[]) {
  const componentIssues: Record<string, { component: string; achs: number[]; suggestions: string[] }> = {};

  units.forEach(unit => {
    unit.components.forEach(c => {
      if (c.bobot > 0 && c.ach > 0 && c.ach < 1.0) {
        if (!componentIssues[c.kpi_name]) {
          componentIssues[c.kpi_name] = { component: c.kpi_name, achs: [], suggestions: [] };
        }
        componentIssues[c.kpi_name].achs.push(c.ach);
      }
    });
  });

  const suggestionMap: Record<string, string> = {};
  recs.forEach(r => {
    if (!suggestionMap[r.component]) suggestionMap[r.component] = r.suggestion;
  });

  return Object.entries(componentIssues)
    .map(([name, data]) => ({
      component: name,
      affectedUnits: data.achs.length,
      avgAch: data.achs.reduce((s, v) => s + v, 0) / data.achs.length,
      suggestion: suggestionMap[name] || "Lakukan review komprehensif terhadap komponen ini."
    }))
    .sort((a, b) => b.affectedUnits - a.affectedUnits || a.avgAch - b.avgAch)
    .slice(0, 8);
}