export interface AccuracyMetrics {
  mae_mw: number | null
  rmse_mw: number | null
  bias_mw: number | null
  wape_percent: number | null
  matched_periods: number
}

export interface SeriesPoint {
  delivery_time: string
  forecast_mw: number | null
  actual_mw: number | null
  error_mw: number | null
  forecast_publish_time: string | null
  quality: "matched" | "missing actual" | "missing forecast" | "partial actual" | "conflicting actual" | "conflicting forecast" | string
}

export interface DailyAnalysis {
  delivery_date: string
  cutoff_time: string
  cutoff_datetime: string
  source_mode: "live" | "snapshot"
  selected_publication_time: string | null
  metrics: AccuracyMetrics
  monthly_metrics: AccuracyMetrics
  periods: SeriesPoint[]
  quality_notes: string[]
  forecast_coverage_percent: number
}

export interface DailyMetricRow {
  delivery_date: string
  metrics: AccuracyMetrics
}

export interface RefreshResult {
  status: string
  source_mode: "live" | "snapshot"
  actual_count: number
  forecast_count: number
  detail: string | null
}
