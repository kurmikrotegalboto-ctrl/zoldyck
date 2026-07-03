export interface KpiComponent {
  unit_code: string;
  kpi_name: string;
  bobot: number;
  satuan: string;
  target: number;
  realisasi: number;
  ach: number;
  kpi_score: number;
}

export interface KpiUnit {
  code: string;
  name: string;
  total_kpi: number;
  components: KpiComponent[];
}

export interface SnapshotData {
  date: string;       // "01 Jun 26" format
  dateSort: string;   // "2026-06-01" for sorting
  units: KpiUnit[];
}

// KOMPONEN KPI grouping (matches Excel layout)
export interface KomponenGroup {
  no: number;
  name: string;
  subKomponen: string[];
}

export const KOMPONEN_GROUPS: KomponenGroup[] = [
  { no: 1, name: "OUTSTANDING LOAN", subKomponen: ["OSL AKTIF RATA-RATA GADAI", "OSL AKTIF RATA-RATA NON GADAI", "OSL AKTIF RATA-RATA EMAS", "OSL GROSS POSISI"] },
  { no: 2, name: "LABA USAHA", subKomponen: ["LABA USAHA"] },
  { no: 3, name: "CIR", subKomponen: ["CIR"] },
  { no: 4, name: "NASABAH", subKomponen: ["NASABAH BARU", "NASABAH BARU AGEN", "NASABAH PEMBIAYAAN TAHUNAN", "NASABAH TABUNGAN EMAS"] },
  { no: 5, name: "KUALITAS KREDIT", subKomponen: ["NPL GADAI", "NPL NON GADAI", "NPL EMAS", "LAR GADAI", "LAR NON GADAI", "LAR EMAS"] },
  { no: 6, name: "REVAMP PEGADAIAN BRAND", subKomponen: ["BRAND AWARENESS"] },
  { no: 7, name: "GOLD ECOSYSTEM", subKomponen: ["DEPOSITO EMAS", "TABUNGAN EMAS", "GRAMASI PRODUK GALERI 24"] },
  { no: 8, name: "PEGADAIAN DIGITAL TRING!", subKomponen: ["NASABAH TRING!", "OSL LAYANAN TRING!", "FREKUENSI TRANSAKSI TRING!"] },
  { no: 9, name: "SINERGI HOLDING UMI", subKomponen: ["CASHLESS DISBURSEMENT", "OSL SINERGI HOLDING", "TE SINERGI HOLDING"] },
  { no: 10, name: "KPI STRETCH GOAL", subKomponen: ["KPI STRETCH GOAL"] },
];

// CAPPING map for each sub-komponen
export const CAPPING_MAP: Record<string, string> = {
  "OSL AKTIF RATA-RATA GADAI": "Unlimited",
  "OSL AKTIF RATA-RATA NON GADAI": "110",
  "OSL AKTIF RATA-RATA EMAS": "Unlimited",
  "OSL GROSS POSISI": "110",
  "LABA USAHA": "110",
  "CIR": "110",
  "NASABAH BARU": "110",
  "NASABAH BARU AGEN": "110",
  "NASABAH PEMBIAYAAN TAHUNAN": "110",
  "NASABAH TABUNGAN EMAS": "110",
  "NPL GADAI": "110",
  "NPL NON GADAI": "110",
  "NPL EMAS": "110",
  "LAR GADAI": "110",
  "LAR NON GADAI": "110",
  "LAR EMAS": "110",
  "BRAND AWARENESS": "110",
  "DEPOSITO EMAS": "Unlimited",
  "TABUNGAN EMAS": "110",
  "GRAMASI PRODUK GALERI 24": "110",
  "NASABAH TRING!": "110",
  "OSL LAYANAN TRING!": "110",
  "FREKUENSI TRANSAKSI TRING!": "110",
  "CASHLESS DISBURSEMENT": "110",
  "OSL SINERGI HOLDING": "110",
  "TE SINERGI HOLDING": "110",
  "KPI STRETCH GOAL": "-",
};

// Ordered sub-komponen list (flat, in display order)
export const ALL_SUB_KOMPONEN: string[] = KOMPONEN_GROUPS.flatMap(g => g.subKomponen);

// Helper: get component KPI score from a unit by sub-komponen name
export function getKpiForSub(unit: KpiUnit, subName: string): KpiComponent | undefined {
  return unit.components.find(c => c.kpi_name === subName);
}

// Color/badge helpers
export function getAchColor(ach: number, bobot: number): string {
  if (bobot === 0) return "bg-gray-100 text-gray-400";
  if (ach >= 1.0) return "bg-emerald-100 text-emerald-800";
  if (ach >= 0.8) return "bg-amber-100 text-amber-800";
  if (ach >= 0.5) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export function getAchBadge(ach: number, bobot: number): { bg: string; text: string; label: string } {
  if (bobot === 0) return { bg: "bg-gray-100", text: "text-gray-400", label: "N/A" };
  if (ach >= 1.0) return { bg: "bg-emerald-100", text: "text-emerald-800", label: "Capai" };
  if (ach >= 0.8) return { bg: "bg-amber-100", text: "text-amber-800", label: "Hampir" };
  if (ach >= 0.5) return { bg: "bg-orange-100", text: "text-orange-800", label: "Jauh" };
  return { bg: "bg-red-100", text: "text-red-800", label: "Kritis" };
}

export function getUnitBadge(totalKpi: number): { bg: string; text: string; label: string } {
  if (totalKpi >= 85) return { bg: "bg-emerald-100", text: "text-emerald-800", label: "Baik" };
  if (totalKpi >= 70) return { bg: "bg-amber-100", text: "text-amber-800", label: "Cukup" };
  if (totalKpi >= 55) return { bg: "bg-orange-100", text: "text-orange-800", label: "Perlu Perhatian" };
  return { bg: "bg-red-100", text: "text-red-800", label: "Kritis" };
}

export function getHeatmapColor(ach: number, bobot: number): string {
  if (bobot === 0) return "bg-gray-100";
  if (ach >= 1.1) return "bg-emerald-600 text-white";
  if (ach >= 1.0) return "bg-emerald-400 text-white";
  if (ach >= 0.9) return "bg-emerald-200 text-emerald-900";
  if (ach >= 0.8) return "bg-amber-200 text-amber-900";
  if (ach >= 0.6) return "bg-orange-300 text-orange-900";
  if (ach >= 0.3) return "bg-red-300 text-red-900";
  return "bg-red-600 text-white";
}

export function getAllKpiNames(units: KpiUnit[]): string[] {
  const nameSet = new Set<string>();
  units.forEach(unit => {
    unit.components.forEach(c => {
      if (c.bobot > 0) nameSet.add(c.kpi_name);
    });
  });
  return Array.from(nameSet);
}

// Recommendations
export interface Recommendation {
  unit: string;
  component: string;
  ach: number;
  bobot: number;
  gap: number;
  severity: "kritis" | "tinggi" | "sedang";
  suggestion: string;
}

export function generateRecommendations(units: KpiUnit[]): Recommendation[] {
  const recs: Recommendation[] = [];
  units.forEach(unit => {
    unit.components
      .filter(c => c.bobot > 0 && c.ach > 0 && c.ach < 1.0)
      .sort((a, b) => a.ach - b.ach)
      .forEach(c => {
        const gap = parseFloat(((1 - c.ach) * 100).toFixed(1));
        const severity = c.ach < 0.3 ? "kritis" : c.ach < 0.6 ? "tinggi" : "sedang";
        let suggestion = getSuggestion(c.kpi_name);
        recs.push({ unit: unit.name, component: c.kpi_name, ach: c.ach, bobot: c.bobot, gap, severity, suggestion });
      });
  });
  return recs.sort((a, b) => a.ach - b.ach);
}

function getSuggestion(name: string): string {
  if (name.includes("LABA USAHA")) return "Tinjau efisiensi operasional dan strategi pricing. Lakukan analisis biaya-biaya pokok dan identifikasi peluang peningkatan margin.";
  if (name.includes("FREKUENSI TRING")) return "Intensifkan edukasi dan promosi layanan Tring! kepada nasabah eksisting. Libatkan seluruh frontliner untuk cross-selling.";
  if (name.includes("NASABAH BARU AGEN")) return "Rekrut dan aktivasi agen baru di area sekitar unit. Berikan pelatihan dan insentif kompetitif kepada agen.";
  if (name.includes("NASABAH BARU")) return "Perkuat aktivitas pemasaran dan akuisisi nasabah baru melalui kerjasama dengan agen, program referral, dan aktivasi komunitas.";
  if (name.includes("DEPOSITO EMAS")) return "Tingkatkan kampanye literasi keuangan tentang manfaat Deposito Emas. Target nasabah tabungan emas untuk upgrade produk.";
  if (name.includes("GRAMASI GALERI")) return "Aktifkan program promosi Galeri 24, tingkatkan visibilitas produk, dan lakukan event penjualan emas bertema.";
  if (name.includes("OSL LAYANAN TRING")) return "Perluas penetrasi Tring! melalui sosialisasi ke nasabah gadai aktif dan bundling dengan produk pembiayaan.";
  if (name.includes("TE SINERGI")) return "Jalin kerjasama lebih erat dengan entitas Sinergi Holding. Tentukan target bersama dan monitoring mingguan.";
  if (name.includes("TABUNGAN EMAS")) return "Sosialisasikan fitur auto-debit dan setoran rutin tabungan emas. Target payroll dan komunitas untuk akuisisi.";
  if (name.includes("NASABAH PEMBIAYAAN")) return "Perluas jangkauan pembiayaan melalui digital channel dan agen. Percepat proses credit approval untuk meningkatkan conversion.";
  if (name.includes("NASABAH TRING")) return "Lakukan follow-up nasabah yang sudah mengunduh Tring! namun belum aktif bertransaksi. Berikan insentif transaksi pertama.";
  if (name.includes("CASHLESS")) return "Sosialisasikan manfaat pencairan cashless kepada seluruh nasabah. Sediakan panduan dan asistensi proses pencairan digital.";
  if (name.includes("LAR") || name.includes("NPL")) return "Perkuat proses collection dan early warning system. Lakukan restrukturisasi untuk nasabah potensial dan intensifkan penagihan.";
  if (name.includes("OSL SINERGI")) return "Optimalkan sinergi dengan entitas holding melalui program referral dan cross-selling.";
  if (name.includes("OSL")) return "Tingkatkan penyaluran pembiayaan dengan strategi marketing yang lebih agresif dan perluasan segmen nasabah.";
  return "Lakukan review komprehensif terhadap target dan strategi pencapaian komponen ini.";
}