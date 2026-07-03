---
Task ID: 1
Agent: Main
Task: Redesign KPI dashboard to match Excel file "MONEV KPI TEGALBOTO 2026.xlsx" layout

Work Log:
- Analyzed reference Excel file structure: 9 sheets (INPUT, KONSOL, TEGALBOTO, BASUKI RAHMAD, S PARMAN, KALISAT, MAYANG, COLO SUMBERJATI, REKAP)
- Identified key design elements: green (#00863D) headers, grouped rows by KOMPONEN, sub-columns (RKAP/EXCEED, KEMARIN/HARI INI), TOTAL row
- Added KOMPONEN_GROUPS, CAPPING_MAP, ALL_SUB_KOMPONEN to kpi-types.ts
- Created recap-table.tsx: REKAP view with all 7 units side-by-side (KEMARIN/HARI INI/DELTA per unit)
- Created unit-detail-table.tsx: Individual unit detail table matching TEGALBOTO sheet (TARGET RKAP/EXCEED, REALISASI, ACH%, KPI TAHUNAN KEMARIN/HARI INI, DELTA HARIAN, SELISIH TARGET RKAP/EXCEED)
- Redesigned page.tsx: Replaced 6-tab card layout with Excel-style sheet tabs (REKAP, KONSOL, TEGALBOTO, CP TEGALBOTO, BASUKI RAHMAD, S PARMAN, KALISAT, MAYANG, COLO SUMBERJATI, TREN)
- Made file upload collapsible in header bar
- Used Calibri font, green (#00863D) headers matching Excel
- Verified all views via VLM screenshot analysis
- Fixed next.config.ts standalone output causing hydration issues

Stage Summary:
- Dashboard now visually matches the Excel reference file layout
- REKAP tab: All 7 units side-by-side with KEMARIN/HARI INI/DELTA
- Unit detail tabs: Full table with TARGET, REALISASI, ACH, KPI TAHUNAN, DELTA, SELISIH TARGET
- TREN tab: Line chart + trend table preserved from original
- File upload integrated in header, supports 7 files simultaneously
- Production build compiles successfully