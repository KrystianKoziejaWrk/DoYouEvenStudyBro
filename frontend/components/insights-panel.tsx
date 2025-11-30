"use client"

import { useEffect, useState } from "react"
import { Lightbulb } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchSummary } from "@/lib/api"
import type { SummaryStats } from "@/lib/types"

const INSIGHTS = [
  {
    title: "Early Bird",
    description: "Your best focus window is 9–11am",
  },
  {
    title: "Consistency Wins",
    description: "Keep your 7-day streak going strong",
  },
  {
    title: "Focus Boost",
    description: "You study ECE 210 most on Tue/Thu",
  },
  {
    title: "Productivity Peak",
    description: "Weekday sessions are 40% longer",
  },
]

const TIPS = [
  "Take a 5-minute break every 25 minutes for optimal focus",
  "Dedicate specific times for each subject for better retention",
  "Study complex topics when your focus is highest",
  "Review previous sessions to identify patterns",
]

export default function InsightsPanel() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const summary = await fetchSummary("2025-01-01", "2025-12-31", "America/Chicago")
        setStats(summary)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Insights</h3>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-chart-4" />
        Insights
      </h3>

      <div className="space-y-4">
        {/* Highlights */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Highlights</h4>
          {INSIGHTS.slice(0, 3).map((insight, i) => (
            <div key={i} className="p-2 bg-secondary/30 rounded-lg">
              <p className="text-xs font-medium text-primary">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Tip</h4>
          <div className="p-3 bg-chart-4/10 border border-chart-4/20 rounded-lg">
            <p className="text-xs leading-relaxed">{TIPS[Math.floor(Math.random() * TIPS.length)]}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
