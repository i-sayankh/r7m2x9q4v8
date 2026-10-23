import type { DailyAnalysis, DailyMetricRow, RefreshResult } from "@/types"

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "")

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function getDayAnalysis(date: string, cutoff: string): Promise<DailyAnalysis> {
  const query = new URLSearchParams({ date, cutoff })
  return request(`/analysis/january-2026?${query}`)
}

export function getMonthlyAnalysis(cutoff: string): Promise<DailyMetricRow[]> {
  const query = new URLSearchParams({ cutoff })
  return request(`/analysis/january-2026/daily?${query}`)
}

export function refreshData(): Promise<RefreshResult> {
  return request("/refresh", { method: "POST" })
}
