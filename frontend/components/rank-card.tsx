"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchSummary, fetchBadges } from "@/lib/api"
import { calculateXP, calculateLevel, calculateXPToNextLevel } from "@/lib/utils"
import type { SummaryStats, Badge as BadgeType } from "@/lib/types"

export default function RankCard() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [summary, badgeList] = await Promise.all([
          fetchSummary("2025-01-01", "2025-12-31", "America/Chicago"),
          fetchBadges(),
        ])
        setStats(summary)
        setBadges(badgeList)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Rank & XP</h3>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  if (!stats) return null

  const xp = calculateXP(stats.totalMinutes)
  const level = calculateLevel(xp)
  const xpToNext = calculateXPToNextLevel(xp)
  const currentLevelXP = level * 100
  const progressPercent = ((xp - currentLevelXP) / 100) * 100
  const avgDailyXP = xp / 365

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Rank & XP</h3>
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-chart-4" />
            <div>
              <p className="text-xs text-muted-foreground">Level</p>
              <p className="text-3xl font-bold text-primary">{level}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total XP</p>
          <p className="text-2xl font-bold text-primary">{xp}</p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progress to Level {level + 1}</span>
          <span className="text-xs font-mono text-primary">{xp % 100}/100</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
        <div className="bg-background/50 p-2 rounded">
          <p className="text-xs text-muted-foreground">Daily Avg XP</p>
          <p className="font-semibold">{avgDailyXP.toFixed(1)}</p>
        </div>
        <div className="bg-background/50 p-2 rounded">
          <p className="text-xs text-muted-foreground">ETA Next Level</p>
          <p className="font-semibold">{Math.ceil(xpToNext / Math.max(avgDailyXP, 1))}d</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Badges</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge
              key={badge.id}
              variant={badge.earned ? "default" : "outline"}
              className="text-xs"
              title={badge.description}
            >
              {badge.earned ? "✓" : "○"} {badge.name}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}
