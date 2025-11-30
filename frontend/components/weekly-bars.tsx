"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchWeekly } from "@/lib/api"
import { getMonday, minutesToHhMm } from "@/lib/utils"
import { useFilterStore } from "@/lib/store"
import type { DailyStats } from "@/lib/types"

export default function WeeklyBars() {
  const [data, setData] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    return getMonday(today)
  })
  const { selectedSubject, showAllSubjects, subjects } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const weekData = await fetchWeekly(weekStart.toISOString().split("T")[0], "America/Chicago")
        setData(weekData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekStart])

  const previousWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const subjectMap = new Map(subjects.slice(1).map((s) => [s.name, s]))
  const subjectNames = Array.from(subjectMap.keys())

  const chartData = data.map((d, i) => {
    const dayData: any = {
      day: days[i],
      total: d.minutes,
    }
    subjectNames.forEach((subject) => {
      dayData[subject] = d.bySubject?.[subject] || 0
    })
    return dayData
  })

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Weekly Overview</h3>
        </div>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  const selectedColor = selectedSubject
    ? subjectMap.get(Array.from(subjectMap.keys()).find((k) => subjectMap.get(k)?.id === selectedSubject) || "")
    : undefined

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Weekly Overview</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-24 text-center">
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <Button variant="ghost" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => minutesToHhMm(value as number)} labelFormatter={() => "Daily total"} />
            {showAllSubjects ? (
              subjectNames.map((subject) => (
                <Bar key={subject} dataKey={subject} stackId="a" fill={subjectMap.get(subject)?.color || "#3b82f6"} />
              ))
            ) : (
              <Bar
                dataKey={
                  selectedSubject
                    ? Array.from(subjectMap.values()).find((s) => s.id === selectedSubject)?.name || "minutes"
                    : "total"
                }
                fill={selectedColor?.color || "#3b82f6"}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
