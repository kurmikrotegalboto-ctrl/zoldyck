import * as XLSX from "xlsx";
import type { KpiUnit, KpiComponent } from "./kpi-types";

const KPI_NAME_MAP: Record<string, string> = {
  "OSL AKTIF RATA-RATA GADAI": "OSL AKTIF RATA-RATA GADAI",
  "OSL AKTIF RATA-RATA NON GADAI": "OSL AKTIF RATA-RATA NON GADAI",
  "OSL AKTIF RATA-RATA EMAS": "OSL AKTIF RATA-RATA EMAS",
  "OSL GROSS POSISI": "OSL GROSS POSISI",
  "LABA USAHA": "LABA USAHA",
  "NASABAH BARU": "NASABAH BARU",
  "NASABAH BARU AGEN": "NASABAH BARU AGEN",
  "NASABAH PEMBIAYAAN TAHUNAN": "NASABAH PEMBIAYAAN TAHUNAN",
  "NASABAH TABUNGAN EMAS": "NASABAH TABUNGAN EMAS",
  "NPL GADAI": "NPL GADAI",
  "NPL NON GADAI": "NPL NON GADAI",
  "NPL EMAS": "NPL EMAS",
  "LAR GADAI": "LAR GADAI",
  "LAR NON GADAI": "LAR NON GADAI",
  "LAR EMAS": "LAR EMAS",
  "DEPOSITO EMAS": "DEPOSITO EMAS",
  "TABUNGAN EMAS": "TABUNGAN EMAS",
  "GRAMASI PRODUK GALERI 24": "GRAMASI PRODUK GALERI 24",
  "NASABAH TRING!": "NASABAH TRING!",
  "OSL LAYANAN TRING!": "OSL LAYANAN TRING!",
  "FREKUENSI TRANSAKSI TRING!": "FREKUENSI TRANSAKSI TRING!",
  "CASHLESS DISBURSEMENT": "CASHLESS DISBURSEMENT",
  "OSL SINERGI HOLDING": "OSL SINERGI HOLDING",
  "TE SINERGI HOLDING": "TE SINERGI HOLDING",
  "KPI STRETCH GOAL": "KPI STRETCH GOAL",
};

function getSatuan(subName: string, target: number): string {
  if (
    subName.includes("GRAMASI") ||
    subName.includes("TABUNGAN EMAS") ||
    subName.includes("DEPOSITO EMAS") ||
    subName.includes("TE SINERGI")
  )
    return "Gramasi";
  if (target > 1000000) return "Rp";
  if (
    ["CASHLESS DISBURSEMENT", "NPL GADAI", "NPL NON GADAI", "NPL EMAS", "LAR GADAI", "LAR NON GADAI", "LAR EMAS"].includes(subName)
  )
    return "%";
  return "Jumlah";
}

function parseDateFromFilename(filename: string): { date: string; dateSort: string; unitKey: string; unitName: string } | null {
  // Format: KPI_01-Jun-26_TYPE_UNITNAME_CODE.xlsx
  // or: KPI_01-Jun-26_TYPE_UNIT NAME_CODE.xlsx
  const base = filename.replace(/\.xlsx$/i, "");
  const match = base.match(/KPI_(\d{2})-([A-Za-z]+)-(\d{2})_(.+)/);
  if (!match) return null;

  const day = match[1];
  const monthStr = match[2];
  const year = "20" + match[3];
  const rest = match[4];

  const monthMap: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const monthNum = monthMap[monthStr] || "01";

  const dateSort = `${year}-${monthNum}-${day}`;
  const date = `${day} ${monthStr} ${match[3]}`;

  // Extract unit code (last numeric part)
  const parts = rest.split("_");
  const code = parts[parts.length - 1] || "";
  
  // Build unit name from middle parts, determine key
  // CP_ prefix means CP level, UPC_ prefix means UPC level
  let unitName = "";
  let unitKey = code;
  
  if (rest.startsWith("CP_")) {
    unitName = "CP " + parts.slice(1, -1).join(" ");
    unitKey = code + "_CP";
  } else {
    unitName = parts.slice(1, -1).join(" ").replace(/^UPC GADAI\s*/, "UPC ");
    if (rest.startsWith("COLOCATION_")) {
      unitName = parts.slice(1, -1).join(" ");
    }
    unitKey = code;
  }

  // Special handling for TEGALBOTO
  if (rest.includes("CP TEGALBOTO") && !rest.startsWith("CP_")) {
    unitName = "UPC TEGALBOTO";
    unitKey = code + "_UPC";
  } else if (rest.startsWith("CP_") && rest.includes("TEGALBOTO")) {
    unitName = "CP TEGALBOTO";
    unitKey = code + "_CP";
  }

  return { date, dateSort, unitKey, unitName };
}

export interface ParsedFile {
  filename: string;
  date: string;
  dateSort: string;
  unitKey: string;
  unitName: string;
  unit: KpiUnit;
}

export function parseKpiFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

        const dateInfo = parseDateFromFilename(file.name);
        if (!dateInfo) {
          reject(new Error(`Cannot parse date from filename: ${file.name}`));
          return;
        }

        const components: KpiComponent[] = [];
        let totalKpi = 0;

        for (const row of rows) {
          const no = row[0];
          const subKomponen = row[2];
          const bobot = row[3];
          const targetTahunan = row[5];
          const realisasi = row[6];
          const achTahunan = row[9];
          const kpiTahunan = row[10];

          if (!subKomponen || !bobot) continue;
          const subName = String(subKomponen).trim();
          const mappedName = KPI_NAME_MAP[subName];
          if (!mappedName) continue;

          const b = Number(bobot) || 0;
          const t = Number(targetTahunan) || 0;
          const r = Number(realisasi) || 0;
          const achPct = Number(achTahunan) || 0;
          const kpiScore = Number(kpiTahunan) || 0;

          const satuan = getSatuan(subName, t);
          const ach = achPct > 0 ? achPct / 100 : 0;

          components.push({
            unit_code: dateInfo.unitKey,
            kpi_name: mappedName,
            bobot: b,
            satuan,
            target: t,
            realisasi: r,
            ach: Math.round(ach * 10000) / 10000,
            kpi_score: Math.round(kpiScore * 100) / 100,
          });
          totalKpi += kpiScore;
        }

        const unit: KpiUnit = {
          code: dateInfo.unitKey,
          name: dateInfo.unitName,
          total_kpi: Math.round(totalKpi * 100) / 100,
          components,
        };

        resolve({
          filename: file.name,
          date: dateInfo.date,
          dateSort: dateInfo.dateSort,
          unitKey: dateInfo.unitKey,
          unitName: dateInfo.unitName,
          unit,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseMultipleFiles(files: File[]): Promise<ParsedFile[]> {
  return Promise.all(files.map((f) => parseKpiFile(f).catch((e) => {
    console.error(`Error parsing ${f.name}:`, e);
    return null;
  }))).then((results) => results.filter((r): r is ParsedFile => r !== null));
}