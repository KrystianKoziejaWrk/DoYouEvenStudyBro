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
  const { selectedSubject, showAllSubjects, subjects, timezone } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const weekData = await fetchWeekly(weekStart.toISOString().split("T")[0], timezone)
        setData(weekData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekStart, timezone])

  const previousWeek = () => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() + 7)
    setWeekStart(d)
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Include all subjects, including "All Subjects"
  const subjectMap = new Map(subjects.map((s) => [s.name, s]))
  const subjectNames = Array.from(subjectMap.keys())

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

  // Get the selected subject object (including "All Subjects")
  const selectedSubjectObj = selectedSubject
    ? Array.from(subjectMap.values()).find((s) => s.id === selectedSubject)
    : subjectMap.get("All Subjects") // Default to "All Subjects" if nothing selected
  
  // Get color - use selected subject color, or "All Subjects" color, or default blue
  const barColor = selectedSubjectObj?.color || subjectMap.get("All Subjects")?.color || "#3b82f6"

  // Calculate week dates in user's timezone for display
  const weekDatesInTimezone: string[] = []
  for (let j = 0; j < 7; j++) {
    const weekDate = new Date(weekStart)
    weekDate.setUTCDate(weekStart.getUTCDate() + j)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric"
    })
    weekDatesInTimezone.push(formatter.format(weekDate))
  }

  // Map chart data with correct dates
  const chartDataWithDates = data.map((d, i) => {
    const dayData: any = {
      day: days[i],
      date: weekDatesInTimezone[i] || days[i], // Use timezone date for display
      total: d.minutes,
    }
    subjectNames.forEach((subject) => {
      dayData[subject] = d.bySubject?.[subject] || 0
    })
    return dayData
  })

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Weekly Overview</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-32 text-center">
            {weekDatesInTimezone[0]} - {weekDatesInTimezone[6]}
          </span>
          <Button variant="ghost" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDataWithDates}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip 
              formatter={(value) => minutesToHhMm(value as number)} 
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.date || label
                }
                return label
              }}
            />
            {showAllSubjects ? (
              subjectNames.map((subject) => {
                const subjectObj = subjectMap.get(subject)
                return (
                  <Bar 
                    key={subject} 
                    dataKey={subject} 
                    stackId="a" 
                    fill={subjectObj?.color || "#3b82f6"} 
                  />
                )
              })
            ) : (
              <Bar
                dataKey={
                  selectedSubject
                    ? selectedSubjectObj?.name || "total"
                    : "total"
                }
                fill={barColor}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
