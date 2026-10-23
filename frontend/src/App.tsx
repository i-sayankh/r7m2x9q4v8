import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Leaf, LoaderCircle } from "lucide-react"
import { getDayAnalysis, getMonthlyAnalysis, refreshData } from "@/api/client"
import { DataStatus } from "@/components/DataStatus"
import { DateSelector } from "@/components/DateSelector"
import { ForecastChart } from "@/components/ForecastChart"
import { MetricCards } from "@/components/MetricCards"
import { MonthlySummary } from "@/components/MonthlySummary"
import { PeriodTable } from "@/components/PeriodTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { DailyAnalysis, DailyMetricRow } from "@/types"

const CUTOFF = "09:20"
const INITIAL_DATE = "2026-01-15"
const ukLongDate = (value: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(`${value}T12:00:00Z`))

export default function App() {
  const [date, setDate] = useState(INITIAL_DATE)
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null)
  const [dailyRows, setDailyRows] = useState<DailyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (selectedDate: string) => {
    setLoading(true)
    setError(null)
    try {
      const [day, month] = await Promise.all([getDayAnalysis(selectedDate, CUTOFF), getMonthlyAnalysis(CUTOFF)])
      setAnalysis(day)
      setDailyRows(month)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(date) }, [date, load])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await refreshData()
      await load(date)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data refresh failed.")
    } finally {
      setRefreshing(false)
    }
  }

  const bias = analysis?.metrics.bias_mw
  return <div className="min-h-screen bg-[#f4f7f8] text-foreground">
    <header className="border-b border-[#e2e9ec] bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#143e48] text-[#c4e5d7]"><Leaf size={19} /></div><div><p className="text-sm font-semibold tracking-tight">Gridbricks</p><p className="text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Energy intelligence</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-[#e4eaed] px-3 py-1.5 text-xs text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#1a9b76]" /> Research workspace <span className="text-border">/</span> Forecast review</div>
        <span className="rounded-md bg-[#f0f3f4] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#576872]">Pilot · Jan 2026</span>
      </div>
    </header>

    <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8">
      <section className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#25816e]">Wind generation · Great Britain</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[38px]">Day-ahead forecast review</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">How closely did yesterday’s published wind forecast track Elexon’s reported generation?</p></div>
        <DateSelector value={date} onChange={(nextDate) => { setAnalysis(null); setDate(nextDate) }} />
      </section>

      {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertTriangle size={16} />{error}</div>}
      <div className="mb-5"><DataStatus data={analysis} refreshing={refreshing} onRefresh={() => void handleRefresh()} /></div>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-[#143e48] p-5 text-white sm:col-span-2 xl:col-span-1"><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">Delivery day</p><p className="mt-2 text-lg font-semibold">{ukLongDate(date)}</p><p className="mt-1 text-xs text-white/65">Decision cutoff · {CUTOFF} UK time, previous day</p></div>
        <div className="rounded-lg border border-border/80 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Latest eligible issue</p><p className="mt-2 text-lg font-semibold tabular-nums">{analysis?.selected_publication_time ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(analysis.selected_publication_time)) : "—"}</p><p className="mt-1 text-xs text-muted-foreground">A publication may vary by hourly interval</p></div>
        <div className="rounded-lg border border-border/80 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Matched coverage</p><p className="mt-2 text-lg font-semibold tabular-nums">{analysis ? `${analysis.forecast_coverage_percent.toFixed(0)}%` : "—"}</p><p className="mt-1 text-xs text-muted-foreground">{analysis?.metrics.matched_periods ?? 0} of 24 hourly periods</p></div>
        <div className="rounded-lg border border-border/80 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Forecast bias</p><p className="mt-2 flex items-center gap-1 text-lg font-semibold tabular-nums">{bias == null ? "—" : <>{bias > 0 ? <ArrowUpRight className="text-amber-600" size={18} /> : <ArrowDownRight className="text-blue-600" size={18} />}{Math.abs(bias).toLocaleString("en-GB", { maximumFractionDigits: 1 })} MW</>}</p><p className="mt-1 text-xs text-muted-foreground">Forecast minus actual</p></div>
      </section>

      {loading && !analysis ? <div className="grid min-h-[360px] place-items-center rounded-xl border bg-white"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-primary" size={26} /><p className="mt-3 text-sm text-muted-foreground">Loading January analysis…</p></div></div> : analysis && <>
        <div className="mb-5"><MetricCards metrics={analysis.metrics} /></div>
        <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
          <Card className="border-border/80 shadow-none"><CardHeader className="px-5 pb-0 pt-5"><CardTitle className="text-base">Forecast and actual generation</CardTitle><CardDescription className="mt-1">Hourly wind generation · MW · {ukLongDate(date)}</CardDescription></CardHeader><CardContent className="px-3 pb-3 pt-3">{loading ? <div className="grid h-[310px] place-items-center text-sm text-muted-foreground">Updating selected day…</div> : <ForecastChart points={analysis.periods} />}<div className="mx-3 mt-1 border-t border-border/70 pt-3 text-[11px] leading-relaxed text-muted-foreground">Error = forecast − actual. Positive values indicate over-forecast generation. Half-hour FUELHH values are averaged to hourly MW for comparison.</div></CardContent></Card>
          <MonthlySummary rows={dailyRows} selectedDate={date} monthly={analysis.monthly_metrics} />
        </div>
        <Card className="mb-5 border-border/80 shadow-none"><CardHeader className="px-5 pb-4 pt-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><CardTitle className="text-base">Hourly interval detail</CardTitle><CardDescription className="mt-1">Forecast issue time and matched values for each period</CardDescription></div><span className="text-xs text-muted-foreground">{analysis.metrics.matched_periods} matched / 24</span></div></CardHeader><CardContent className="px-5 pb-5 pt-0"><PeriodTable points={analysis.periods} /></CardContent></Card>
        {analysis.quality_notes.length > 0 && <details className="rounded-lg border border-border/70 bg-white px-4 py-3"><summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground"><span className="mr-2 text-[#21816e]">●</span>Method and data notes <span className="ml-1 font-normal">({analysis.quality_notes.length})</span></summary><ul className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">{analysis.quality_notes.map((note) => <li key={note}>• {note}</li>)}</ul></details>}
      </>}
      <footer className="mt-9 flex flex-col justify-between gap-2 border-t border-[#e0e7e9] pt-4 text-[10px] text-muted-foreground sm:flex-row"><span>Data: Elexon Insights · FUELHH / WIND and WINDFOR · January 2026</span><span>Reported operationally metered generation; embedded wind is not included.</span></footer>
    </main>
  </div>
}
