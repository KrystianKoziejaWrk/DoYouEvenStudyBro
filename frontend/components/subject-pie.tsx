"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchBySubject } from "@/lib/api"
import { useFilterStore } from "@/lib/store"
import { minutesToHhMm } from "@/lib/utils"
import type { SubjectStats } from "@/lib/types"

export default function SubjectPie() {
  const [data, setData] = useState<SubjectStats[]>([])
  const [loading, setLoading] = useState(true)
  const { subjects } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      try {
        const subjects = await fetchBySubject("2025-01-01", "2025-12-31", "America/Chicago")
        setData(subjects)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const colorMap = subjects.reduce(
    (acc, subject) => {
      acc[subject.name] = subject.color
      return acc
    },
    {} as Record<string, string>,
  )

  const total = data.reduce((sum, s) => sum + s.minutes, 0)

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Time by Subject</h3>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Time by Subject</h3>
      </div>

      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="subject"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colorMap[entry.subject] || "#3b82f6"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => minutesToHhMm(value as number)}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: `2px solid ${data.length > 0 ? colorMap[data[0].subject] || "#3b82f6" : "#3b82f6"}`,
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-3xl font-bold text-primary">{minutesToHhMm(total)}</p>
      </div>
    </Card>
  )
}
