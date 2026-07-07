"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import type { SnapshotData } from "@/lib/kpi-types";
import { getUnitBadge } from "@/lib/kpi-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const LINE_COLORS = [
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#ea580c", // orange-600
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#4f46e5", // indigo-600
];

interface TrendChartsProps {
  snapshots: SnapshotData[];
  compareMode?: boolean;
  compareDateSort?: string | null;
  selectedIndex?: number;
}

export function TrendCharts({ snapshots, compareMode, compareDateSort, selectedIndex }: TrendChartsProps) {
  // Collect all unique unit codes across all snapshots
  const unitCodes = useMemo(() => {
    const codeSet = new Set<string>();
    snapshots.forEach((s) => s.units.forEach((u) => codeSet.add(u.code)));
    return Array.from(codeSet);
  }, [snapshots]);

  // Get unit name from any snapshot
  const unitNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    snapshots.forEach((s) => {
      s.units.forEach((u) => {
        if (!map[u.code]) map[u.code] = u.name;
      });
    });
    return map;
  }, [snapshots]);

  // Build chart data: each row = a date, with each unit's total KPI
  const chartData = useMemo(() => {
    return snapshots.map((s) => {
      const row: Record<string, string | number> = { date: s.date };
      s.units.forEach((u) => {
        row[u.code] = u.total_kpi;
      });
      return row;
    });
  }, [snapshots]);

  // Build trend table data
  const tableData = useMemo(() => {
    return snapshots.map((s) => {
      const row: Record<string, string | number> = { date: s.date };
      s.units.forEach((u) => {
        row[u.code] = u.total_kpi;
      });
      return row;
    });
  }, [snapshots]);

  if (snapshots.length < 1) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Belum ada data untuk ditampilkan. Upload file KPI untuk memulai.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tren Total KPI per Unit
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pergerakan Total KPI dari waktu ke waktu untuk setiap unit
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {snapshots.length < 2 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Minimal 2 periode data diperlukan untuk menampilkan tren. Upload file periode tambahan.
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value: number) => [value.toFixed(2), ""]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value: string) => unitNameMap[value] || value}
                  />
                  {unitCodes.map((code, idx) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">
            Tabel Tren Total KPI
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Nilai Total KPI setiap unit per periode
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[100px] z-10">
                      Periode
                    </th>
                    {unitCodes.map((code) => (
                      <th key={code} className="text-center p-3 font-semibold min-w-[130px]">
                        <div className="truncate text-[11px]">{unitNameMap[code]}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{code}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr
                      key={row.date as string}
                      className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    >
                      <td className="p-3 font-medium sticky left-0 bg-inherit z-10">
                        {row.date as string}
                      </td>
                      {unitCodes.map((code) => {
                        const val = row[code] as number | undefined;
                        if (val === undefined) {
                          return (
                            <td key={code} className="text-center p-3 text-gray-300">
                              -
                            </td>
                          );
                        }
                        const badge = getUnitBadge(val);
                        return (
                          <td key={code} className="text-center p-3">
                            <span
                              className={`font-bold text-sm ${
                                val >= 85
                                  ? "text-emerald-700"
                                  : val >= 70
                                  ? "text-amber-700"
                                  : val >= 55
                                  ? "text-orange-700"
                                  : "text-red-700"
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Change Summary (if 2+ snapshots) */}
      {snapshots.length >= 2 && <ChangeSummary snapshots={snapshots} unitCodes={unitCodes} unitNameMap={unitNameMap} />}
    </div>
  );
}

function ChangeSummary({
  snapshots,
  unitCodes,
  unitNameMap,
}: {
  snapshots: SnapshotData[];
  unitCodes: string[];
  unitNameMap: Record<string, string>;
}) {
  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];

  const changes = unitCodes
    .map((code) => {
      const latestUnit = latest.units.find((u) => u.code === code);
      const prevUnit = previous.units.find((u) => u.code === code);
      if (!latestUnit || !prevUnit) return null;
      const diff = latestUnit.total_kpi - prevUnit.total_kpi;
      return {
        code,
        name: unitNameMap[code] || code,
        prev: prevUnit.total_kpi,
        latest: latestUnit.total_kpi,
        diff,
        isUp: diff > 0,
        isDown: diff < 0,
      };
    })
    .filter(Boolean) as {
    code: string;
    name: string;
    prev: number;
    latest: number;
    diff: number;
    isUp: boolean;
    isDown: boolean;
  }[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">
          Perubahan dari Periode Sebelumnya
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {previous.date} → {latest.date}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {changes
            .sort((a, b) => b.diff - a.diff)
            .map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between p-2.5 rounded-md bg-muted/30"
              >
                <div>
                  <span className="text-xs font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    ({c.prev} → {c.latest})
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`border-0 text-[10px] px-2 py-0 ${
                    c.isUp
                      ? "bg-emerald-100 text-emerald-700"
                      : c.isDown
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.isUp ? "+" : ""}
                  {c.diff.toFixed(2)}
                </Badge>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}