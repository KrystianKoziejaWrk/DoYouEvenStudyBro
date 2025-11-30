"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchSummary } from "@/lib/api"
import { minutesToHhMm } from "@/lib/utils"
import type { SummaryStats } from "@/lib/types"

export default function KpiRow() {
  const [data, setData] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const summary = await fetchSummary("2025-01-01", "2025-12-31", "America/Chicago")
        setData(summary)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpis = [
    { label: "Total Hours", value: data ? minutesToHhMm(data.totalMinutes) : "-", loading },
    { label: "Sessions", value: data?.sessionsCount ?? "-", loading },
    { label: "Avg Session", value: data ? minutesToHhMm(data.avgSessionMinutes) : "-", loading },
    { label: "Streak", value: data ? `${data.streakDays}d` : "-", loading },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-4">
          <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
          {kpi.loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-primary">{kpi.value}</p>
          )}
        </Card>
      ))}
    </div>
  )
}
