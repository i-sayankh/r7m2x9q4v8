import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { SeriesPoint } from "@/types"

const localTime = (value: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(value))
const chartRows = (points: SeriesPoint[]) => points.map((point) => ({
  ...point,
  time: localTime(point.delivery_time),
}))

export function ForecastChart({ points }: { points: SeriesPoint[] }) {
  const data = chartRows(points)
  return <div className="h-[310px] w-full" role="img" aria-label="Hourly wind forecast compared with reported actual generation in megawatts">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 14, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="#e8edf1" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#778494", fontSize: 11 }} interval="preserveStartEnd" minTickGap={26} />
        <YAxis tickLine={false} axisLine={false} width={54} tick={{ fill: "#778494", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} unit=" MW" />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null
          const row = payload[0].payload as SeriesPoint & { time: string }
          return <div className="rounded-lg border bg-white p-3 text-xs shadow-lg"><p className="font-semibold">{row.time} UK</p><p className="mt-2 text-[#167b67]">Forecast: {row.forecast_mw == null ? "—" : `${row.forecast_mw.toLocaleString()} MW`}</p><p className="mt-1 text-[#4d77a2]">Actual: {row.actual_mw == null ? "—" : `${row.actual_mw.toLocaleString()} MW`}</p><p className="mt-1 text-muted-foreground">{row.quality}</p></div>
        }} />
        <Legend verticalAlign="top" align="right" height={34} iconType="circle" wrapperStyle={{ fontSize: 12, color: "#657383" }} />
        <Line name="Day-ahead forecast" type="monotone" dataKey="forecast_mw" stroke="#147c68" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
        <Line name="Reported actual" type="monotone" dataKey="actual_mw" stroke="#587da5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
}
