import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { AccuracyMetrics, DailyMetricRow } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Props { rows: DailyMetricRow[]; selectedDate: string; monthly: AccuracyMetrics }

export function MonthlySummary({ rows, selectedDate, monthly }: Props) {
  const data = rows.map((row) => ({ day: Number(row.delivery_date.slice(-2)), mae: row.metrics.mae_mw, matched: row.metrics.matched_periods }))
  return <Card className="border-border/80 shadow-none">
    <CardHeader className="flex-row items-start justify-between space-y-0 px-5 pb-1 pt-5">
      <div><CardTitle className="text-base">January accuracy trend</CardTitle><CardDescription className="mt-1">Daily MAE · MW · 09:20 UK forecast cutoff</CardDescription></div>
      <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Month MAE</p><p className="mt-1 text-xl font-semibold tabular-nums">{monthly.mae_mw == null ? "—" : `${monthly.mae_mw.toLocaleString("en-GB", { maximumFractionDigits: 1 })} MW`}</p></div>
    </CardHeader>
    <CardContent className="px-2 pb-3 pt-3">
      <div className="h-[210px]" role="img" aria-label="Daily mean absolute error through January 2026">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#e8edf1" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#778494", fontSize: 10 }} tickFormatter={(value) => `${value}`} interval={4} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#778494", fontSize: 10 }} width={42} />
            <Tooltip formatter={(value, name) => [name === "mae" ? `${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 1 })} MW` : value, name === "mae" ? "MAE" : "Matched hours"]} labelFormatter={(day) => `January ${day}`} />
            <Line type="monotone" dataKey="mae" stroke="#147c68" strokeWidth={2.2} dot={(props) => {
              const selected = props.payload?.day === Number(selectedDate.slice(-2))
              return <circle cx={props.cx} cy={props.cy} r={selected ? 5 : 2.5} fill={selected ? "#fff" : "#147c68"} stroke="#147c68" strokeWidth={selected ? 2 : 0} />
            }} activeDot={{ r: 5 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
}
