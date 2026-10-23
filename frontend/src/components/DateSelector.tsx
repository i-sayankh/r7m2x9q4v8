import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DateSelectorProps {
  value: string
  onChange: (value: string) => void
}

const dayLabel = (date: string) => new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
}).format(new Date(`${date}T12:00:00Z`))

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const day = Number(value.slice(-2))
  const setDay = (next: number) => onChange(`2026-01-${String(Math.max(1, Math.min(31, next))).padStart(2, "0")}`)
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground"><CalendarDays size={18} /></div>
      <label className="sr-only" htmlFor="delivery-date">Delivery date</label>
      <select id="delivery-date" value={value} onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-52 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring">
        {Array.from({ length: 31 }, (_, index) => {
          const date = `2026-01-${String(index + 1).padStart(2, "0")}`
          return <option key={date} value={date}>{dayLabel(date)}</option>
        })}
      </select>
      <div className="flex gap-1">
        <Button aria-label="Previous delivery day" variant="outline" size="icon" onClick={() => setDay(day - 1)} disabled={day <= 1}><ChevronLeft size={16} /></Button>
        <Button aria-label="Next delivery day" variant="outline" size="icon" onClick={() => setDay(day + 1)} disabled={day >= 31}><ChevronRight size={16} /></Button>
      </div>
    </div>
  )
}
