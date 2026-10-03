/** Response shapes for `GET /api/analytics/*` (member 4 owns the implementation). */

export interface AnalyticsFilter {
  dateFrom: string;
  dateTo: string;
  shiftId?: string;
  machineId?: string;
  itemId?: string;
}

export interface KpiSummary {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  qualityRate: number;
  totalProduction: number;
  totalOk: number;
  totalNg: number;
  totalDowntimeSeconds: number;
  plannedSeconds: number;
  runSeconds: number;
}

export interface ProductivityPoint {
  bucket: string;
  machineCode: string;
  machineName: string;
  shiftName: string | null;
  targetQty: number;
  totalOutput: number;
  okCount: number;
  ngCount: number;
  achievementPercent: number;
}

export interface ProductionTrendPoint {
  date: string;
  shiftId: string | null;
  shiftName: string | null;
  totalOutput: number;
  okCount: number;
  ngCount: number;
  qualityRate: number;
}

export interface OkVsNgPoint {
  date: string;
  okCount: number;
  ngCount: number;
}

export interface ParetoDefectRow {
  defectId: string | null;
  defectName: string;
  defectCode: string | null;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface DowntimeSummaryRow {
  reasonType: string;
  category: string | null;
  abnormalityName: string | null;
  machineCode: string;
  occurrences: number;
  totalSeconds: number;
  averageSeconds: number;
}

export interface OeeTrendPoint {
  date: string;
  shiftName: string | null;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface AnalyticsDashboard {
  kpi: KpiSummary;
  productivity: ProductivityPoint[];
  productionTrend: ProductionTrendPoint[];
  okVsNg: OkVsNgPoint[];
  paretoDefect: ParetoDefectRow[];
  downtimeSummary: DowntimeSummaryRow[];
  oeeTrend: OeeTrendPoint[];
}