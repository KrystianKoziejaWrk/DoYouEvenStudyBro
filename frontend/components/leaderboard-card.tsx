"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchLeaderboard } from "@/lib/api"
import type { LeaderboardEntry } from "@/lib/types"
import { minutesToHhMm } from "@/lib/utils"
import { useFilterStore } from "@/lib/store"

export default function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { scope } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchLeaderboard(
          scope === "global" ? "global" : "my_friends",
          "2025-01-01",
          "2025-12-31",
          "America/Chicago",
        )
        setEntries(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [scope])

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
      <ScrollArea className="h-64">
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={entry.userId} className="flex items-center gap-3 pb-3 border-b last:border-0">
              <div className="text-sm font-bold text-muted-foreground min-w-6">#{index + 1}</div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>{entry.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.name}</p>
                <div className="flex gap-1">
                  {entry.spark.map((val, i) => (
                    <div
                      key={i}
                      className="h-2 w-1 bg-chart-1/50 rounded-sm"
                      style={{ opacity: Math.min(val / 100, 1) }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{minutesToHhMm(entry.minutes)}</p>
                <div className="flex items-center gap-1 justify-end">
                  {entry.deltaPct >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-chart-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs text-muted-foreground">{Math.abs(entry.deltaPct).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
