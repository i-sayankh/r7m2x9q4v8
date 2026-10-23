import { Clock3 } from "lucide-react"
import type { SeriesPoint } from "@/types"

const timeFormat = (value: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(value))
const number = (value: number | null) => value == null ? "—" : value.toLocaleString("en-GB", { maximumFractionDigits: 0 })
const issueTime = (value: string | null) => value == null ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(value))

function Status({ value }: { value: string }) {
  const matched = value === "matched"
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${matched ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{matched ? "Matched" : value}</span>
}

export function PeriodTable({ points }: { points: SeriesPoint[] }) {
  return <div className="max-h-[390px] overflow-auto rounded-lg border border-border/70">
    <table className="w-full min-w-[650px] border-collapse text-left text-xs">
      <thead className="sticky top-0 bg-[#f6f8fa] text-[10px] uppercase tracking-wider text-muted-foreground">
        <tr><th className="px-4 py-3 font-medium">UK time</th><th className="px-4 py-3 text-right font-medium">Forecast MW</th><th className="px-4 py-3 text-right font-medium">Actual MW</th><th className="px-4 py-3 text-right font-medium">Error MW</th><th className="px-4 py-3 font-medium">Forecast issued</th><th className="px-4 py-3 font-medium">Status</th></tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {points.map((point) => <tr key={point.delivery_time} className="hover:bg-muted/40">
          <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">{timeFormat(point.delivery_time)}</td>
          <td className="px-4 py-3 text-right tabular-nums">{number(point.forecast_mw)}</td>
          <td className="px-4 py-3 text-right tabular-nums">{number(point.actual_mw)}</td>
          <td className={`px-4 py-3 text-right tabular-nums ${point.error_mw == null ? "text-muted-foreground" : point.error_mw > 0 ? "text-amber-700" : "text-blue-700"}`}>{point.error_mw == null ? "—" : `${point.error_mw > 0 ? "+" : ""}${number(point.error_mw)}`}</td>
          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 size={12} />{issueTime(point.forecast_publish_time)}</span></td>
          <td className="px-4 py-3"><Status value={point.quality} /></td>
        </tr>)}
        {!points.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No forecast periods were available for this delivery day.</td></tr>}
      </tbody>
    </table>
  </div>
}
