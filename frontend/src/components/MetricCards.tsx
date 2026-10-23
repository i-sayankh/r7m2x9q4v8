import { Activity, Gauge, MoveUpRight, Scale } from "lucide-react"
import type { AccuracyMetrics } from "@/types"
import { Card, CardContent } from "@/components/ui/card"

const format = (value: number | null, suffix = "") => value == null ? "—" : `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${suffix}`

export function MetricCards({ metrics }: { metrics: AccuracyMetrics }) {
  const cards = [
    { label: "Mean absolute error", value: format(metrics.mae_mw, " MW"), note: "Average miss per matched hour", icon: Activity },
    { label: "Root mean square error", value: format(metrics.rmse_mw, " MW"), note: "Weights larger misses more", icon: Gauge },
    { label: "Mean bias", value: format(metrics.bias_mw, " MW"), note: "Positive means over-forecast", icon: MoveUpRight },
    { label: "Weighted absolute error", value: format(metrics.wape_percent, "%"), note: `${metrics.matched_periods} matched hourly periods`, icon: Scale },
  ]
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ label, value, note, icon: Icon }) => <Card key={label} className="border-border/80 shadow-none">
      <CardContent className="flex items-start justify-between p-5">
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>
        <span className="rounded-lg bg-secondary p-2 text-primary"><Icon size={17} /></span>
      </CardContent>
    </Card>)}
  </div>
}
