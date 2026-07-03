"use client";

import React, { useMemo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { KpiUnit, SnapshotData } from "@/lib/kpi-types";
import { KOMPONEN_GROUPS, CAPPING_MAP, getKpiForSub } from "@/lib/kpi-types";

interface RecapTableProps {
  units: KpiUnit[];
  prevSnapshot?: SnapshotData;
  currentSnapshot?: SnapshotData;
}

const UNIT_LABELS: Record<string, string> = {
  "14200_UPC": "UPC TEGALBOTO",
  "14200_CP": "CP TEGALBOTO",
  "14201": "BASUKI RAHMAD",
  "14202": "S PARMAN",
  "14204": "KALISAT",
  "14205": "MAYANG",
  "17506": "COLO SUMBERJATI",
};

export function RecapTable({ units, prevSnapshot }: RecapTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse" style={{ fontFamily: "Calibri, sans-serif", minWidth: "1200px" }}>
          <RecapHeader units={units} />
          <RecapBody units={units} prevSnapshot={prevSnapshot} />
        </table>
      </div>
    </div>
  );
}

function RecapHeader({ units }: { units: KpiUnit[] }) {
  return (
    <thead>
      {/* Row 1: Title + Unit name headers */}
      <tr>
        <th colSpan={5} className="text-left text-xs font-bold p-2 bg-white border-b border-gray-200">
          REKAP KPI CP TEGALBOTO
        </th>
        {units.map((u) => (
          <th
            key={u.code + "-h1"}
            colSpan={3}
            className="text-center text-[11px] font-bold p-2 border-b border-gray-200"
            style={{ backgroundColor: "#00863D", color: "white" }}
          >
            {UNIT_LABELS[u.code] || u.name}
          </th>
        ))}
      </tr>
      {/* Row 2: Sub-column headers */}
      <tr>
        {["NO", "KOMPONEN KPI", "SUB KOMPONEN KPI", "CAPPING", "BOBOT KPI"].map((h) => (
          <th
            key={h}
            className="text-center text-[11px] font-bold p-1.5 border-b border-gray-300"
            style={{ backgroundColor: "#00863D", color: "white" }}
          >
            {h}
          </th>
        ))}
        {units.map((u) => (
          <th
            key={u.code + "-k"}
            className="text-center text-[10px] font-bold p-1.5 border-b border-gray-300"
            style={{ backgroundColor: "#00863D", color: "white" }}
          >
            KEMARIN
          </th>
        ))}
        {units.map((u) => (
          <th
            key={u.code + "-hi"}
            className="text-center text-[10px] font-bold p-1.5 border-b border-gray-300"
            style={{ backgroundColor: "#00863D", color: "white" }}
          >
            HARI INI
          </th>
        ))}
        {units.map((u) => (
          <th
            key={u.code + "-d"}
            className="text-center text-[10px] font-bold p-1.5 border-b border-gray-300"
            style={{ backgroundColor: "#00863D", color: "white" }}
          >
            DELTA
          </th>
        ))}
      </tr>
    </thead>
  );
}

function RecapBody({
  units,
  prevSnapshot,
}: {
  units: KpiUnit[];
  prevSnapshot?: SnapshotData;
}) {
  const rows = useMemo(() => {
    const result: {
      no: number | null;
      komponen: string;
      subKomponen: string;
      capping: string;
      bobot: number;
    }[] = [];

    KOMPONEN_GROUPS.forEach((group) => {
      group.subKomponen.forEach((sub, subIdx) => {
        let bobot = 0;
        for (const u of units) {
          const comp = getKpiForSub(u, sub);
          if (comp && comp.bobot > 0) {
            bobot = comp.bobot;
            break;
          }
        }
        result.push({
          no: subIdx === 0 ? group.no : null,
          komponen: subIdx === 0 ? group.name : "",
          subKomponen: sub,
          capping: CAPPING_MAP[sub] || "-",
          bobot,
        });
      });
    });
    return result;
  }, [units]);

  const totals = useMemo(() => {
    return units.map((u) => {
      const prevUnit = prevSnapshot?.units.find((pu) => pu.code === u.code);
      return {
        kemarin: prevUnit?.total_kpi ?? u.total_kpi,
        hariIni: u.total_kpi,
        delta: prevUnit ? parseFloat((u.total_kpi - prevUnit.total_kpi).toFixed(2)) : 0,
      };
    });
  }, [units, prevSnapshot]);

  return (
    <tbody>
      {rows.map((row, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <tr key={row.subKomponen} className={isEven ? "bg-white" : "bg-gray-50/60"}>
            <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
              {row.no !== null ? row.no : ""}
            </td>
            <td className="text-left p-1.5 border-b border-gray-100 text-[11px] font-semibold whitespace-nowrap">
              {row.komponen}
            </td>
            <td className="text-left p-1.5 border-b border-gray-100 text-[11px] whitespace-nowrap">
              {row.subKomponen}
            </td>
            <td className="text-center p-1.5 border-b border-gray-100 text-[11px] text-gray-500">
              {row.capping}
            </td>
            <td className="text-center p-1.5 border-b border-gray-100 text-[11px] font-semibold">
              {row.bobot > 0 ? row.bobot : "-"}
            </td>
            {units.map((u) => {
              const prevUnit = prevSnapshot?.units.find((pu) => pu.code === u.code);
              const comp = getKpiForSub(u, row.subKomponen);
              const prevComp = prevUnit ? getKpiForSub(prevUnit, row.subKomponen) : undefined;

              if (!comp || comp.bobot === 0) {
                return (
                  <React.Fragment key={u.code}>
                    <td className="text-center p-1.5 border-b border-gray-100 text-gray-300">-</td>
                    <td className="text-center p-1.5 border-b border-gray-100 text-gray-300">-</td>
                    <td className="text-center p-1.5 border-b border-gray-100 text-gray-300">-</td>
                  </React.Fragment>
                );
              }

              const kemarin = prevComp?.kpi_score ?? comp.kpi_score;
              const hariIni = comp.kpi_score;
              const delta = prevComp ? parseFloat((hariIni - kemarin).toFixed(2)) : 0;

              return (
                <React.Fragment key={u.code}>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
                    {kemarin.toFixed(2)}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px] font-semibold">
                    {hariIni.toFixed(2)}
                  </td>
                  <td className="text-center p-1.5 border-b border-gray-100 text-[11px]">
                    <DeltaValue value={delta} />
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
        );
      })}
      {/* TOTAL ROW */}
      <tr style={{ backgroundColor: "#00863D" }}>
        <td colSpan={4} className="text-left p-2 text-[11px] font-bold" style={{ color: "white" }}>
          TOTAL
        </td>
        <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
          100
        </td>
        {totals.map((t, i) => (
          <React.Fragment key={"total-" + i}>
            <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
              {t.kemarin.toFixed(2)}
            </td>
            <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
              {t.hariIni.toFixed(2)}
            </td>
            <td className="text-center p-2 text-[11px] font-bold" style={{ color: "white" }}>
              {t.delta > 0 ? "+" : ""}{t.delta.toFixed(2)}
            </td>
          </React.Fragment>
        ))}
      </tr>
    </tbody>
  );
}

function DeltaValue({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400">0.00</span>;
  if (value > 0) return <span className="text-emerald-600 font-medium">+{value.toFixed(2)}</span>;
  return <span className="text-red-600 font-medium">{value.toFixed(2)}</span>;
}