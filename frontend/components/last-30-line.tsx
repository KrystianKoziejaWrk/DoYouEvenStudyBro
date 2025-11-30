"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getStatsDaily } from "@/lib/api"
import { useFilterStore } from "@/lib/store"
import { minutesToHhMm } from "@/lib/utils"
import type { DailyStats } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function Last30Line({ username }: { username?: string } = {}) {
  const [data, setData] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedSubject, subjects, showAllSubjects } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Convert selectedSubject (string ID) to number if it exists and showAllSubjects is false
        let subjectId: number | undefined = undefined
        if (!showAllSubjects && selectedSubject) {
          const subject = subjects.find(s => String(s.id) === String(selectedSubject))
          if (subject) {
            subjectId = Number(subject.id)
          }
        }
        const days = await getStatsDaily({ username, subject_id: subjectId })
        console.log("📊 Daily stats received:", days)
        setData(days || [])
      } catch (err) {
        console.error("❌ Failed to load daily stats:", err)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedSubject, subjects, showAllSubjects, username])

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))
  const selectedSubjectData = selectedSubject ? subjectMap.get(selectedSubject) : null

  if (loading) {
    return (
      <Card className="p-6 bg-black border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-white">Last 30 Days Trend</h3>
        <Skeleton className="h-64 w-full bg-gray-800" />
      </Card>
    )
  }

  const barColor = showAllSubjects ? "#ffffff" : (selectedSubjectData?.color || "#ffffff")

  // Format data for Recharts
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    fullDate: d.date,
    minutes: d.minutes,
    hours: (d.minutes / 60).toFixed(1),
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold">{label}</p>
          <p className="text-white">
            {minutesToHhMm(data.minutes)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6 bg-black border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Last 30 Days Trend</h3>
        {data.length > 0 && (
          <p className="text-sm text-gray-400">
            {data.filter(d => d.minutes > 0).length} days with activity
          </p>
        )}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickFormatter={(value) => minutesToHhMm(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.minutes > 0 ? barColor : "rgba(255,255,255,0.1)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
