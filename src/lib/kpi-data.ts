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

export const kpiData: KpiUnit[] = [
  {
    code: "14200",
    name: "CP TEGALBOTO",
    total_kpi: 91.49,
    components: [
      { unit_code: "14200", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 65834609329, realisasi: 76118721850, ach: 1.1562, kpi_score: 5.5 },
      { unit_code: "14200", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 10, satuan: "Rp", target: 42622811780, realisasi: 49788092573, ach: 1.1681, kpi_score: 11.68 },
      { unit_code: "14200", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 5, satuan: "Rp", target: 11839554017, realisasi: 11091169199, ach: 0.9368, kpi_score: 4.68 },
      { unit_code: "14200", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 7.5, satuan: "Rp", target: 8633448014, realisasi: 11278046318, ach: 1.3063, kpi_score: 9.8 },
      { unit_code: "14200", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 8547261445, realisasi: 10100296890, ach: 1.1817, kpi_score: 0 },
      { unit_code: "14200", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 8257115195, realisasi: 3600706536, ach: 0.4361, kpi_score: 4.36 },
      { unit_code: "14200", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 2104011861, realisasi: 2893628565, ach: 1.3753, kpi_score: 5.5 },
      { unit_code: "14200", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 272540847, ach: 3.0413, kpi_score: 1.65 },
      { unit_code: "14200", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 38112, realisasi: 17159, ach: 0.4502, kpi_score: 2.25 },
      { unit_code: "14200", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 18322, realisasi: 18342, ach: 1.0011, kpi_score: 2.5 },
      { unit_code: "14200", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 8494, realisasi: 6165, ach: 0.7258, kpi_score: 3.63 },
      { unit_code: "14200", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 4406, realisasi: 3671, ach: 0.8333, kpi_score: 4.17 },
      { unit_code: "14200", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 4328, realisasi: 273, ach: 0.6308, kpi_score: 1.58 },
      { unit_code: "14200", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 4232, realisasi: 344, ach: 0.8129, kpi_score: 4.06 },
      { unit_code: "14200", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 2497, realisasi: 1383, ach: 0.554, kpi_score: 0.83 },
      { unit_code: "14200", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 2255, realisasi: 217, ach: 0.9621, kpi_score: 4.81 },
      { unit_code: "14200", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 1861, realisasi: 1746, ach: 0.9381, kpi_score: 4.69 },
      { unit_code: "14200", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 72.27, ach: 0.9176, kpi_score: 1.84 },
      { unit_code: "14200", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 62, realisasi: 69, ach: 1.1134, kpi_score: 2.75 },
      { unit_code: "14200", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 12.21, realisasi: 12.45, ach: 0.9804, kpi_score: 1.96 },
      { unit_code: "14200", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 3.94, ach: 2.8032, kpi_score: 2.75 },
      { unit_code: "14200", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 3.32, ach: 0.8296, kpi_score: 2.49 },
      { unit_code: "14200", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 1.95, realisasi: 1.99, ach: 0.9807, kpi_score: 1.96 },
      { unit_code: "14200", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0, ach: 1.1, kpi_score: 2.75 },
      { unit_code: "14200", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0.24, ach: 1.2751, kpi_score: 3.3 }
    ]
  },
  {
    code: "14201",
    name: "UPC BASUKI RAHMAT",
    total_kpi: 79.08,
    components: [
      { unit_code: "14201", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 18190765285, realisasi: 19805143169, ach: 1.0887, kpi_score: 5.44 },
      { unit_code: "14201", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 12.5, satuan: "Rp", target: 15466510610, realisasi: 16671954314, ach: 1.0779, kpi_score: 13.47 },
      { unit_code: "14201", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 3091999153, realisasi: 1311657665, ach: 0.4242, kpi_score: 4.24 },
      { unit_code: "14201", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 10, satuan: "Rp", target: 1821557621, realisasi: 2216507657, ach: 1.2168, kpi_score: 12.17 },
      { unit_code: "14201", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 1686407864, realisasi: 1334513085, ach: 0.7913, kpi_score: 0 },
      { unit_code: "14201", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 789003568, realisasi: 623104158, ach: 0.7897, kpi_score: 3.95 },
      { unit_code: "14201", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 0, satuan: "Rp", target: 302765834, realisasi: 464438832, ach: 1.534, kpi_score: 0 },
      { unit_code: "14201", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 10884178, ach: 0.1215, kpi_score: 0.18 },
      { unit_code: "14201", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 14981, realisasi: 4318, ach: 0.2882, kpi_score: 1.44 },
      { unit_code: "14201", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 4586, realisasi: 2555, ach: 0.5572, kpi_score: 2.79 },
      { unit_code: "14201", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 2207, realisasi: 1837, ach: 0.8322, kpi_score: 2.08 },
      { unit_code: "14201", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 1493, realisasi: 316, ach: 0.2116, kpi_score: 1.06 },
      { unit_code: "14201", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 1379, realisasi: 712, ach: 0.5159, kpi_score: 2.58 },
      { unit_code: "14201", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 1038, realisasi: 828, ach: 0.798, kpi_score: 3.99 },
      { unit_code: "14201", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 519, realisasi: 237, ach: 0.4568, kpi_score: 1.14 },
      { unit_code: "14201", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 296, realisasi: 274, ach: 0.9254, kpi_score: 4.63 },
      { unit_code: "14201", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 261, realisasi: 73, ach: 0.2788, kpi_score: 0.42 },
      { unit_code: "14201", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 85, realisasi: 58, ach: 0.6831, kpi_score: 1.71 },
      { unit_code: "14201", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 76.82, ach: 0.9754, kpi_score: 1.95 },
      { unit_code: "14201", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 30.9, realisasi: 8.17, ach: 3.7825, kpi_score: 2.2 },
      { unit_code: "14201", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 11.23, realisasi: 3.17, ach: 3.5441, kpi_score: 2.2 },
      { unit_code: "14201", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 5.8, ach: 1.9042, kpi_score: 2.75 },
      { unit_code: "14201", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 3.13, ach: 0.8799, kpi_score: 2.64 },
      { unit_code: "14201", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0.37, ach: 2.3644, kpi_score: 2.75 },
      { unit_code: "14201", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0.05, ach: 6.1206, kpi_score: 3.3 }
    ]
  },
  {
    code: "14202",
    name: "UPC S PARMAN",
    total_kpi: 76.22,
    components: [
      { unit_code: "14202", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 14629108298, realisasi: 17265445763, ach: 1.1802, kpi_score: 5.5 },
      { unit_code: "14202", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 12.5, satuan: "Rp", target: 12177450584, realisasi: 13573289470, ach: 1.1146, kpi_score: 13.93 },
      { unit_code: "14202", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 2440995247, realisasi: 997877899, ach: 0.4088, kpi_score: 4.09 },
      { unit_code: "14202", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 10, satuan: "Rp", target: 1692515292, realisasi: 1649822835, ach: 0.9748, kpi_score: 9.75 },
      { unit_code: "14202", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 1683564317, realisasi: 1246617494, ach: 0.7405, kpi_score: 0 },
      { unit_code: "14202", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 773770278, realisasi: 412057403, ach: 0.5325, kpi_score: 2.66 },
      { unit_code: "14202", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 0, satuan: "Rp", target: 413851412, realisasi: 648904108, ach: 1.568, kpi_score: 0 },
      { unit_code: "14202", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 126392023, ach: 1.4104, kpi_score: 1.65 },
      { unit_code: "14202", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 15493, realisasi: 3816, ach: 0.2463, kpi_score: 1.23 },
      { unit_code: "14202", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 4133, realisasi: 2577, ach: 0.6234, kpi_score: 3.12 },
      { unit_code: "14202", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 2033, realisasi: 1494, ach: 0.735, kpi_score: 1.84 },
      { unit_code: "14202", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 1416, realisasi: 403, ach: 0.2846, kpi_score: 1.42 },
      { unit_code: "14202", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 1356, realisasi: 319, ach: 0.2353, kpi_score: 1.18 },
      { unit_code: "14202", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 988, realisasi: 715, ach: 0.7235, kpi_score: 3.62 },
      { unit_code: "14202", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 451, realisasi: 248, ach: 0.5502, kpi_score: 1.38 },
      { unit_code: "14202", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 267, realisasi: 55, ach: 0.2066, kpi_score: 0.31 },
      { unit_code: "14202", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 252, realisasi: 251, ach: 0.9969, kpi_score: 4.98 },
      { unit_code: "14202", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 74.51, ach: 0.946, kpi_score: 1.89 },
      { unit_code: "14202", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 75, realisasi: 51, ach: 0.6842, kpi_score: 1.71 },
      { unit_code: "14202", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 61.93, realisasi: 40.05, ach: 1.5463, kpi_score: 2.2 },
      { unit_code: "14202", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 11.7, ach: 0.944, kpi_score: 2.36 },
      { unit_code: "14202", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 10.61, realisasi: 3.15, ach: 3.3692, kpi_score: 2.2 },
      { unit_code: "14202", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 2.62, ach: 1.0512, kpi_score: 3.15 },
      { unit_code: "14202", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0.22, ach: 3.9766, kpi_score: 2.75 },
      { unit_code: "14202", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0.06, ach: 5.1005, kpi_score: 3.3 }
    ]
  },
  {
    code: "14204",
    name: "UPC KALISAT",
    total_kpi: 76.73,
    components: [
      { unit_code: "14204", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 35200641591, realisasi: 38590757817, ach: 1.0963, kpi_score: 5.48 },
      { unit_code: "14204", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 10, satuan: "Rp", target: 25020277303, realisasi: 28593654647, ach: 1.1428, kpi_score: 11.43 },
      { unit_code: "14204", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 5, satuan: "Rp", target: 6338790652, realisasi: 5359204547, ach: 0.8455, kpi_score: 4.23 },
      { unit_code: "14204", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 5122308848, realisasi: 2415132035, ach: 0.4715, kpi_score: 4.71 },
      { unit_code: "14204", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 7.5, satuan: "Rp", target: 2269886397, realisasi: 2152294870, ach: 0.9482, kpi_score: 7.11 },
      { unit_code: "14204", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 2154951957, realisasi: 1590709760, ach: 0.7382, kpi_score: 0 },
      { unit_code: "14204", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 773770278, realisasi: 516093841, ach: 0.667, kpi_score: 3.33 },
      { unit_code: "14204", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 232396800, ach: 2.5934, kpi_score: 1.65 },
      { unit_code: "14204", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 10259, realisasi: 3532, ach: 0.3443, kpi_score: 1.72 },
      { unit_code: "14204", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 6428, realisasi: 4337, ach: 0.6747, kpi_score: 3.37 },
      { unit_code: "14204", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 2685, realisasi: 1863, ach: 0.6938, kpi_score: 1.73 },
      { unit_code: "14204", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 1889, realisasi: 522, ach: 0.2764, kpi_score: 1.38 },
      { unit_code: "14204", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 1521, realisasi: 587, ach: 0.3859, kpi_score: 1.93 },
      { unit_code: "14204", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 1067, realisasi: 906, ach: 0.8492, kpi_score: 4.25 },
      { unit_code: "14204", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 563, realisasi: 102, ach: 0.1812, kpi_score: 0.45 },
      { unit_code: "14204", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 321, realisasi: 276, ach: 0.8597, kpi_score: 1.29 },
      { unit_code: "14204", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 284, realisasi: 272, ach: 0.9584, kpi_score: 4.79 },
      { unit_code: "14204", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 84.36, ach: 1.0711, kpi_score: 2.14 },
      { unit_code: "14204", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 41, realisasi: 51, ach: 1.25, kpi_score: 2.75 },
      { unit_code: "14204", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 14.83, realisasi: 25.77, ach: 0.5757, kpi_score: 1.15 },
      { unit_code: "14204", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 14.75, ach: 0.7488, kpi_score: 1.87 },
      { unit_code: "14204", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 3.63, realisasi: 6.33, ach: 0.573, kpi_score: 1.15 },
      { unit_code: "14204", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 2.98, ach: 0.9242, kpi_score: 2.77 },
      { unit_code: "14204", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0.2, ach: 4.3742, kpi_score: 2.75 },
      { unit_code: "14204", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0, ach: 1.1, kpi_score: 3.3 }
    ]
  },
  {
    code: "14205",
    name: "UPC MAYANG",
    total_kpi: 69.85,
    components: [
      { unit_code: "14205", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 10848655273, realisasi: 13057511768, ach: 1.2036, kpi_score: 5.5 },
      { unit_code: "14205", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 12.5, satuan: "Rp", target: 8226946715, realisasi: 10632331483, ach: 1.2924, kpi_score: 16.15 },
      { unit_code: "14205", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 2245564130, realisasi: 1192126229, ach: 0.5309, kpi_score: 0 },
      { unit_code: "14205", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 10, satuan: "Rp", target: 2123756680, realisasi: 1270577492, ach: 0.5983, kpi_score: 5.98 },
      { unit_code: "14205", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 1660074089, realisasi: 721635316, ach: 0.4347, kpi_score: 4.35 },
      { unit_code: "14205", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 773770278, realisasi: 242560223, ach: 0.3135, kpi_score: 1.57 },
      { unit_code: "14205", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 0, satuan: "Rp", target: 348962534, realisasi: 505231303, ach: 1.4478, kpi_score: 0 },
      { unit_code: "14205", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 89612005, realisasi: 232844750, ach: 2.5984, kpi_score: 1.65 },
      { unit_code: "14205", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 8126, realisasi: 147, ach: 0.1809, kpi_score: 0.9 },
      { unit_code: "14205", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 3048, realisasi: 1808, ach: 0.5932, kpi_score: 2.97 },
      { unit_code: "14205", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 1505, realisasi: 871, ach: 0.5791, kpi_score: 1.45 },
      { unit_code: "14205", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 129, realisasi: 382, ach: 0.2957, kpi_score: 1.48 },
      { unit_code: "14205", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 1197, realisasi: 213, ach: 0.1779, kpi_score: 0.89 },
      { unit_code: "14205", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 902, realisasi: 363, ach: 0.4026, kpi_score: 2.01 },
      { unit_code: "14205", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 321, realisasi: 144, ach: 0.4479, kpi_score: 1.12 },
      { unit_code: "14205", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 216, realisasi: 129, ach: 0.5993, kpi_score: 0.9 },
      { unit_code: "14205", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 136, realisasi: 125, ach: 0.9177, kpi_score: 4.59 },
      { unit_code: "14205", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 108, realisasi: 55, ach: 0.5079, kpi_score: 1.27 },
      { unit_code: "14205", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 88.79, ach: 1.1273, kpi_score: 2.2 },
      { unit_code: "14205", kpi_name: "LAR NON GADAI", bobot: 2, satuan: "%", target: 23.86, realisasi: 59.35, ach: 0.4021, kpi_score: 0.8 },
      { unit_code: "14205", kpi_name: "NPL NON GADAI", bobot: 2, satuan: "%", target: 14.97, realisasi: 4.98, ach: 3.0056, kpi_score: 2.2 },
      { unit_code: "14205", kpi_name: "LAR EMAS", bobot: 2.5, satuan: "%", target: 11.04, realisasi: 10.96, ach: 1.0077, kpi_score: 2.52 },
      { unit_code: "14205", kpi_name: "LAR GADAI", bobot: 3, satuan: "%", target: 2.75, realisasi: 2.2, ach: 1.2519, kpi_score: 3.3 },
      { unit_code: "14205", kpi_name: "NPL EMAS", bobot: 2.5, satuan: "%", target: 0.87, realisasi: 0, ach: 1.1, kpi_score: 2.75 },
      { unit_code: "14205", kpi_name: "NPL GADAI", bobot: 3, satuan: "%", target: 0.31, realisasi: 0.02, ach: 15.3015, kpi_score: 3.3 }
    ]
  },
  {
    code: "17506",
    name: "BRI UNIT SUMBERJATI",
    total_kpi: 39.86,
    components: [
      { unit_code: "17506", kpi_name: "OSL GROSS POSISI", bobot: 5, satuan: "Rp", target: 2475837838, realisasi: 717398500, ach: 0.2898, kpi_score: 1.45 },
      { unit_code: "17506", kpi_name: "OSL AKTIF RATA-RATA GADAI", bobot: 12.5, satuan: "Rp", target: 2051101918, realisasi: 1022202839, ach: 0.4984, kpi_score: 6.23 },
      { unit_code: "17506", kpi_name: "KPI STRETCH GOAL", bobot: 0, satuan: "Rp", target: 1352998713, realisasi: 387544257, ach: 0.2864, kpi_score: 0 },
      { unit_code: "17506", kpi_name: "OSL AKTIF RATA-RATA EMAS", bobot: 10, satuan: "Rp", target: 1211584145, realisasi: 733872470, ach: 0.6057, kpi_score: 6.06 },
      { unit_code: "17506", kpi_name: "OSL LAYANAN TRING!", bobot: 5, satuan: "Rp", target: 773770278, realisasi: 76479550, ach: 0.0988, kpi_score: 0.49 },
      { unit_code: "17506", kpi_name: "LABA USAHA", bobot: 10, satuan: "Rp", target: 456197076, realisasi: 76825973, ach: 0.1684, kpi_score: 1.68 },
      { unit_code: "17506", kpi_name: "OSL SINERGI HOLDING", bobot: 1.5, satuan: "Rp", target: 382829717, realisasi: 379364707, ach: 0.9909, kpi_score: 1.49 },
      { unit_code: "17506", kpi_name: "FREKUENSI TRANSAKSI TRING!", bobot: 5, satuan: "Jumlah", target: 7731, realisasi: 315, ach: 0.0407, kpi_score: 0.2 },
      { unit_code: "17506", kpi_name: "GRAMASI PRODUK GALERI 24", bobot: 5, satuan: "Gramasi", target: 1166, realisasi: 23, ach: 0.0197, kpi_score: 0.1 },
      { unit_code: "17506", kpi_name: "NASABAH PEMBIAYAAN TAHUNAN", bobot: 5, satuan: "Jumlah", target: 801, realisasi: 159, ach: 0.1986, kpi_score: 0.99 },
      { unit_code: "17506", kpi_name: "NASABAH BARU", bobot: 5, satuan: "Jumlah", target: 740, realisasi: 41, ach: 0.0554, kpi_score: 0.28 },
      { unit_code: "17506", kpi_name: "NASABAH TRING!", bobot: 5, satuan: "Jumlah", target: 578, realisasi: 63, ach: 0.1091, kpi_score: 0.55 },
      { unit_code: "17506", kpi_name: "TABUNGAN EMAS", bobot: 2.5, satuan: "Gramasi", target: 400, realisasi: 94, ach: 0.2357, kpi_score: 0.59 },
      { unit_code: "17506", kpi_name: "TE SINERGI HOLDING", bobot: 1.5, satuan: "Gramasi", target: 150, realisasi: 94, ach: 0.6306, kpi_score: 0.95 },
      { unit_code: "17506", kpi_name: "DEPOSITO EMAS", bobot: 2.5, satuan: "Gramasi", target: 130, realisasi: 0, ach: 0, kpi_score: 0 },
      { unit_code: "17506", kpi_name: "CASHLESS DISBURSEMENT", bobot: 2, satuan: "%", target: 78.76, realisasi: 89.53, ach: 1.1367, kpi_score: 2.2 },
      { unit_code: "17506", kpi_name: "NASABAH TABUNGAN EMAS", bobot: 5, satuan: "Jumlah", target: 48, realisasi: 22, ach: 0.4564, kpi_score: 2.28 },
      { unit_code: "17506", kpi_name: "NASABAH BARU AGEN", bobot: 2.5, satuan: "Jumlah", target: 30, realisasi: 3, ach: 0.1015, kpi_score: 0.25 },
      { unit_code: "17506", kpi_name: "LAR EMAS", bobot: 3.5, satuan: "%", target: 11.04, realisasi: 27.21, ach: 0.4059, kpi_score: 1.42 },
      { unit_code: "17506", kpi_name: "LAR GADAI", bobot: 4, satuan: "%", target: 2.75, realisasi: 1, ach: 2.7542, kpi_score: 4.4 },
      { unit_code: "17506", kpi_name: "NPL EMAS", bobot: 3.5, satuan: "%", target: 0.87, realisasi: 0, ach: 1.1, kpi_score: 3.85 },
      { unit_code: "17506", kpi_name: "NPL GADAI", bobot: 4, satuan: "%", target: 0.31, realisasi: 0, ach: 1.1, kpi_score: 4.4 },
      { unit_code: "17506", kpi_name: "LAR NON GADAI", bobot: 0, satuan: "%", target: 0, realisasi: 0, ach: 1.1, kpi_score: 0 },
      { unit_code: "17506", kpi_name: "NPL NON GADAI", bobot: 0, satuan: "%", target: 0, realisasi: 0, ach: 1.1, kpi_score: 0 },
      { unit_code: "17506", kpi_name: "OSL AKTIF RATA-RATA NON GADAI", bobot: 0, satuan: "Rp", target: 0, realisasi: 0, ach: 0, kpi_score: 0 }
    ]
  }
];

// Get all unique KPI component names across all units (excluding bobot=0)
export function getAllKpiNames(): string[] {
  const nameSet = new Set<string>();
  kpiData.forEach(unit => {
    unit.components.forEach(c => {
      if (c.bobot > 0) nameSet.add(c.kpi_name);
    });
  });
  return Array.from(nameSet);
}

// Get ACH for a specific unit and KPI component
export function getAch(unitCode: string, kpiName: string): number {
  const unit = kpiData.find(u => u.code === unitCode);
  if (!unit) return 0;
  const comp = unit.components.find(c => c.kpi_name === kpiName);
  return comp ? comp.ach : 0;
}

// Get KPI score for a specific unit and KPI component
export function getKpiScore(unitCode: string, kpiName: string): number {
  const unit = kpiData.find(u => u.code === unitCode);
  if (!unit) return 0;
  const comp = unit.components.find(c => c.kpi_name === kpiName);
  return comp ? comp.kpi_score : 0;
}

// Get color based on ACH value
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

// Recommendations data
export interface Recommendation {
  unit: string;
  component: string;
  ach: number;
  bobot: number;
  gap: number;
  severity: "kritis" | "tinggi" | "sedang";
  suggestion: string;
}

export function generateRecommendations(): Recommendation[] {
  const recs: Recommendation[] = [];
  
  kpiData.forEach(unit => {
    unit.components
      .filter(c => c.bobot > 0 && c.ach > 0 && c.ach < 1.0)
      .sort((a, b) => a.ach - b.ach)
      .forEach(c => {
        const gap = ((1 - c.ach) * 100).toFixed(1);
        const severity = c.ach < 0.3 ? "kritis" : c.ach < 0.6 ? "tinggi" : "sedang";
        
        let suggestion = "";
        const name = c.kpi_name;
        if (name.includes("LABA USAHA")) {
          suggestion = "Tinjau efisiensi operasional dan strategi pricing. Lakukan analisis biaya-biaya pokok dan identifikasi peluang peningkatan margin.";
        } else if (name.includes("FREKUENSI TRING")) {
          suggestion = "Intensifkan edukasi dan promosi layanan Tring! kepada nasabah eksisting. Libatkan seluruh frontliner untuk cross-selling.";
        } else if (name.includes("NASABAH BARU")) {
          suggestion = "Perkuat aktivitas pemasaran dan akuisisi nasabah baru melalui kerjasama dengan agen, program referral, dan aktivasi komunitas.";
        } else if (name.includes("DEPOSITO EMAS")) {
          suggestion = "Tingkatkan kampanye literasi keuangan tentang manfaat Deposito Emas. Target nasabah tabungan emas untuk upgrade produk.";
        } else if (name.includes("GRAMASI GALERI")) {
          suggestion = "Aktifkan program promosi Galeri 24, tingkatkan visibilitas produk, dan lakukan event penjualan emas bertema.";
        } else if (name.includes("OSL LAYANAN TRING")) {
          suggestion = "Perluas penetrasi Tring! melalui sosialisasi ke nasabah gadai aktif dan bundling dengan produk pembiayaan.";
        } else if (name.includes("TE SINERGI")) {
          suggestion = "Jalin kerjasama lebih erat dengan entitas Sinergi Holding. Tentukan target bersama dan monitoring mingguan.";
        } else if (name.includes("TABUNGAN EMAS")) {
          suggestion = "Sosialisasikan fitur auto-debit dan setoran rutin tabungan emas. Target payroll dan komunitas untuk akuisisi.";
        } else if (name.includes("NASABAH PEMBIAYAAN")) {
          suggestion = "Perluas jangkauan pembiayaan melalui digital channel dan agen. Percepat proses credit approval untuk meningkatkan conversion.";
        } else if (name.includes("NASABAH TRING")) {
          suggestion = "Lakukan follow-up nasabah yang sudah mengunduh Tring! namun belum aktif bertransaksi. Berikan insentif transaksi pertama.";
        } else if (name.includes("NASABAH BARU AGEN")) {
          suggestion = "Rekrut dan aktivasi agen baru di area sekitar unit. Berikan pelatihan dan insentif kompetitif kepada agen.";
        } else if (name.includes("CASHLESS")) {
          suggestion = "Sosialisasikan manfaat pencairan cashless kepada seluruh nasabah. Sediakan panduan dan asistensi proses pencairan digital.";
        } else if (name.includes("LAR") || name.includes("NPL")) {
          suggestion = "Perkuat proses collection dan early warning system. Lakukan restrukturisasi untuk nasabah potensial dan intensifkan penagihan.";
        } else if (name.includes("OSL") && !name.includes("TRING") && !name.includes("SINERGI")) {
          suggestion = "Tingkatkan penyaluran pembiayaan dengan strategi marketing yang lebih agresif dan perluasan segmen nasabah.";
        } else {
          suggestion = "Lakukan review komprehensif terhadap target dan strategi pencapaian komponen ini.";
        }
        
        recs.push({
          unit: unit.name,
          component: c.kpi_name,
          ach: c.ach,
          bobot: c.bobot,
          gap: parseFloat(gap),
          severity,
          suggestion
        });
      });
  });
  
  return recs.sort((a, b) => a.ach - b.ach);
}