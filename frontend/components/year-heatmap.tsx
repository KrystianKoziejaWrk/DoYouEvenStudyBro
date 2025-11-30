"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getStatsHeatmap } from "@/lib/api"
import { useFilterStore } from "@/lib/store"
import { minutesToHhMm } from "@/lib/utils"
import type { DailyStats } from "@/lib/types"

export default function YearHeatmap() {
  const [data, setData] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedSubject, subjects } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        if (!token) {
          setLoading(false)
          return
        }
        
        const today = new Date()
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearData = await getStatsHeatmap({
          start_date: yearStart.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
        })
        setData(yearData)
      } catch (err) {
        console.error("Failed to load heatmap data:", err)
        // Don't show error if just not authenticated
        if (err instanceof Error && !err.message.includes("401")) {
          console.error("Heatmap error:", err)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const subjectMap = new Map(subjects.slice(1).map((s) => [s.id, s]))
  const selectedSubjectData = selectedSubject ? subjectMap.get(selectedSubject) : null
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1)

  const baseColor = selectedSubjectData?.color || "#ffffff"

  if (loading) {
    return (
      <Card className="p-6 bg-black border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-white">Year Overview</h3>
        <Skeleton className="h-40 w-full bg-gray-800" />
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-black border-white/10">
      <h3 className="text-lg font-semibold mb-4 text-white">Year Overview</h3>
      <div className="flex flex-wrap gap-1">
        {data.map((day, i) => {
          const opacity = data.length > 0 && day.minutes > 0 ? Math.max(0.2, Math.min(1, day.minutes / maxMinutes)) : 0

          return (
            <div
              key={i}
              title={`${day.date}: ${minutesToHhMm(day.minutes)}`}
              className="h-3 w-3 rounded-sm transition-all hover:scale-150 cursor-pointer"
              style={{
                backgroundColor: baseColor,
                opacity: day.minutes === 0 ? 0.1 : opacity,
              }}
            />
          )
        })}
      </div>
    </Card>
  )
}
