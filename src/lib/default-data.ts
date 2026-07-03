import type { KpiUnit, SnapshotData, KpiComponent } from "./kpi-types";

// UPC TEGALBOTO data (from KPI_01-Jun-26_UPC_CP TEGALBOTO_14200.xlsx - UPC-level targets)
const upcTegalbotoComponents: KpiComponent[] = [
  { unit_code: "14200_UPC", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 65834609329, realisasi: 76118721850, ach: 1.1562, kpi_score: 5.5 },
  { unit_code: "14200_UPC", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 10, satuan: "Rp", target: 42622811780, realisasi: 49788092573, ach: 1.1681, kpi_score: 11.68 },
  { unit_code: "14200_UPC", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 5, satuan: "Rp", target: 11839554017, realisasi: 11091169199, ach: 0.9368, kpi_score: 4.68 },
  { unit_code: "14200_UPC", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 7.5, satuan: "Rp", target: 8633448014, realisasi: 11278046318, ach: 1.3063, kpi_score: 9.8 },
  { unit_code: "14200_UPC", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 8547261445, realisasi: 10100296890, ach: 1.1817, kpi_score: 0 },
  { unit_code: "14200_UPC", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 8257115195, realisasi: 3600706536, ach: 0.4361, kpi_score: 4.36 },
  { unit_code: "14200_UPC", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 2104011861, realisasi: 2893628565, ach: 1.3753, kpi_score: 5.5 },
  { unit_code: "14200_UPC", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 272540847, ach: 3.0413, kpi_score: 1.65 },
  { unit_code: "14200_UPC", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 38112, realisasi: 17159, ach: 0.4502, kpi_score: 2.25 },
  { unit_code: "14200_UPC", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 18322, realisasi: 18342, ach: 1.0011, kpi_score: 2.5 },
  { unit_code: "14200_UPC", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 8494, realisasi: 6165, ach: 0.7258, kpi_score: 3.63 },
  { unit_code: "14200_UPC", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 4406, realisasi: 3671, ach: 0.8333, kpi_score: 4.17 },
  { unit_code: "14200_UPC", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 4328, realisasi: 273, ach: 0.6308, kpi_score: 1.58 },
  { unit_code: "14200_UPC", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 4232, realisasi: 344, ach: 0.8129, kpi_score: 4.06 },
  { unit_code: "14200_UPC", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 2497, realisasi: 1383, ach: 0.554, kpi_score: 0.83 },
  { unit_code: "14200_UPC", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 2255, realisasi: 217, ach: 0.9621, kpi_score: 4.81 },
  { unit_code: "14200_UPC", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Gramasi", target: 1861, realisasi: 1746, ach: 0.9381, kpi_score: 4.69 },
  { unit_code: "14200_UPC", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 72.27, ach: 0.9176, kpi_score: 1.84 },
  { unit_code: "14200_UPC", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 62, realisasi: 69, ach: 1.1134, kpi_score: 2.75 },
  { unit_code: "14200_UPC", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 12.21, realisasi: 12.45, ach: 0.9804, kpi_score: 1.96 },
  { unit_code: "14200_UPC", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 3.94, ach: 2.8032, kpi_score: 2.75 },
  { unit_code: "14200_UPC", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 3.32, ach: 0.8296, kpi_score: 2.49 },
  { unit_code: "14200_UPC", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 1.95, realisasi: 1.99, ach: 0.9807, kpi_score: 1.96 },
  { unit_code: "14200_UPC", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0, ach: 1.1, kpi_score: 2.75 },
  { unit_code: "14200_UPC", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0.24, ach: 1.2751, kpi_score: 3.3 },
];

const upcTegalboto: KpiUnit = {
  code: "14200_UPC",
  name: "UPC TEGALBOTO",
  total_kpi: 91.49,
  components: upcTegalbotoComponents,
};

// Data for the other 6 units (from new_kpi_data.json - individual file KPI scores)
// Import raw JSON and transform
import rawData from "../../scripts/new_kpi_data.json";

const codeMapping: Record<string, string> = {
  "14200": "14200_CP",
  "14201": "14201",
  "14202": "14202",
  "14204": "14204",
  "14205": "14205",
  "17506": "17506",
};

const nameMapping: Record<string, string> = {
  "14200": "CP TEGALBOTO",
  "14201": "UPC BASUKI RAHMAT",
  "14202": "UPC S PARMAN",
  "14204": "UPC KALISAT",
  "14205": "UPC MAYANG",
  "17506": "BRI UNIT SUMBERJATI",
};

type RawComponent = {
  unit_code: string;
  kpi_name: string;
  bobot: number;
  satuan: string;
  target: number;
  realisasi: number;
  ach: number;
  kpi_score: number;
};

type RawUnit = {
  code: string;
  name: string;
  total_kpi: number;
  components: RawComponent[];
};

const otherUnits: KpiUnit[] = (rawData as RawUnit[]).map((d) => {
  const newCode = codeMapping[d.code] || d.code;
  const newName = nameMapping[d.code] || d.name;
  return {
    code: newCode,
    name: newName,
    total_kpi: d.total_kpi,
    components: d.components.map((c) => ({
      unit_code: newCode,
      kpi_name: c.kpi_name,
      bobot: c.bobot,
      satuan: c.satuan,
      target: c.target,
      realisasi: c.realisasi,
      ach: c.ach,
      kpi_score: c.kpi_score,
    })),
  };
});

// All 7 units in defined order
export const defaultUnits: KpiUnit[] = [
  upcTegalboto,
  ...otherUnits,
];

// Default snapshot
export const defaultSnapshot: SnapshotData = {
  date: "01 Jun 26",
  dateSort: "2026-06-01",
  units: defaultUnits,
};