import { AlertCircle, CheckCircle2, Database, LoaderCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DailyAnalysis } from "@/types"

interface Props { data: DailyAnalysis | null; refreshing: boolean; onRefresh: () => void }

export function DataStatus({ data, refreshing, onRefresh }: Props) {
  const snapshot = data?.source_mode === "snapshot"
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/70 px-4 py-3">
    <div className="flex items-center gap-3">
      <span className={`grid h-8 w-8 place-items-center rounded-full ${snapshot ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
        {snapshot ? <Database size={15} /> : <CheckCircle2 size={15} />}
      </span>
      <div><p className="text-xs font-semibold">{snapshot ? "Saved January snapshot" : "Connected to Elexon Insights"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{snapshot ? "Live source unavailable; showing the checked-in fallback." : "National WIND · FUELHH actuals + WINDFOR forecasts"}</p></div>
    </div>
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
      {refreshing ? <LoaderCircle className="animate-spin" size={14} /> : snapshot ? <AlertCircle size={14} /> : <RefreshCw size={14} />}
      {refreshing ? "Refreshing" : "Refresh data"}
    </Button>
  </div>
}
