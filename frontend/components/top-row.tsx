"use client"

import { useEffect, useState } from "react"
import { Flame, TrendingUp, TrendingDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { getStatsSummary, getStatsBySubject, getCurrentUser } from "@/lib/api"
import { useFilterStore } from "@/lib/store"
import { calculateXP, minutesToHhMm } from "@/lib/utils"
import type { SummaryStats, SubjectStats } from "@/lib/types"
import Image from "next/image"

const RANKS = [
  {
    name: "Baus",
    minXP: 0,
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-29-20am.png",
  },
  {
    name: "Sherm",
    minXP: 100,
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-35-20-20pm.png",
  },
  {
    name: "Squid",
    minXP: 300,
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-06-20am.png",
  },
  {
    name: "French Mouse",
    minXP: 600,
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-33-28-20pm.png",
  },
  {
    name: "Taus",
    minXP: 1000,
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-32-49-20pm.png",
  },
]

function getRankByHours(weeklyHours: number) {
  // Rank thresholds based on hours per week (matching backend)
  const rankThresholds = [
    { name: "Baus", minHours: 0 },
    { name: "Sherm", minHours: 5 },
    { name: "Squid", minHours: 10 },
    { name: "French Mouse", minHours: 20 },
    { name: "Taus", minHours: 30 },
  ]
  
  // Find current rank
  let currentRank = rankThresholds[0]
  let nextRank = rankThresholds[1]
  
  for (let i = rankThresholds.length - 1; i >= 0; i--) {
    if (weeklyHours >= rankThresholds[i].minHours) {
      currentRank = rankThresholds[i]
      nextRank = rankThresholds[i + 1] || null
      break
    }
  }
  
  // Find matching rank image from RANKS array
  const rankData = RANKS.find(r => r.name === currentRank.name) || RANKS[0]
  const nextRankData = nextRank ? RANKS.find(r => r.name === nextRank.name) : null
  
  // Calculate progress to next rank
  const progressToNext = nextRank 
    ? Math.min(100, Math.max(0, ((weeklyHours - currentRank.minHours) / (nextRank.minHours - currentRank.minHours)) * 100))
    : 100
  
  const hoursToNext = nextRank ? Math.max(0, nextRank.minHours - weeklyHours) : 0
  const minutesToNext = hoursToNext * 60  // Convert to minutes for formatting
  
  return { 
    current: { ...rankData, minHours: currentRank.minHours }, 
    next: nextRankData ? { ...nextRankData, minHours: nextRank.minHours } : null, 
    progressToNext,
    hoursToNext,
    minutesToNext,
    weeklyHours
  }
}

export default function TopRow() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string>("")
  const { timezone, subjects } = useFilterStore()

  useEffect(() => {
    const load = async () => {
      try {
        // Get current week dates (Sunday-Saturday, matching weekly calendar)
        const today = new Date()
        const daysSinceSunday = today.getDay() // 0 = Sunday, 1 = Monday, etc.
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - daysSinceSunday)
        const weekEnd = new Date(today)

        const startDate = weekStart.toISOString().split("T")[0]
        const endDate = weekEnd.toISOString().split("T")[0]

        const [summary, subjectData, user] = await Promise.all([
          getStatsSummary({ start_date: startDate, end_date: endDate }),
          getStatsBySubject({ start_date: startDate, end_date: endDate }),
          getCurrentUser().catch(() => null),
        ])
        
        setStats({
          totalMinutes: Math.round(summary.totalMinutes || 0),
          sessionsCount: summary.sessionsCount || 0,
          avgSessionMinutes: Math.round((summary.totalMinutes || 0) / (summary.sessionsCount || 1)),
          streakDays: summary.streakDays || 0,
        })
        
        console.log("📊 Subject stats from API:", subjectData)
        setSubjectStats(subjectData.map((s: any) => ({
          subject: s.subject,
          minutes: Math.round(s.minutes || 0),
        })))
        console.log("📊 Processed subject stats:", subjectData.map((s: any) => ({
          subject: s.subject,
          minutes: Math.round(s.minutes || 0),
        })))

        if (user) {
          setDisplayName(user.display_name || user.username || "")
          }
      } catch (err) {
        console.error("Failed to load stats:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [timezone])

  if (loading) {
    return (
      <Card className="p-4 bg-black border-white/10">
        <Skeleton className="h-24 w-full bg-gray-800" />
      </Card>
    )
  }

  // Calculate weekly hours for ranking
  const weeklyHours = stats ? stats.totalMinutes / 60 : 0
  const rankInfo = getRankByHours(weeklyHours)

  const subjectMap = new Map(subjects.map((s) => [s.name, s]))
  // Filter out subjects with 0 minutes and sort by minutes descending
  const pieData = subjectStats
    .filter((s) => s.minutes > 0) // Only show subjects with time
    .map((s) => ({
      name: s.subject,
      value: s.minutes,
      color: subjectMap.get(s.subject)?.color || "#3b82f6",
    }))
    .sort((a, b) => b.value - a.value) // Sort by minutes descending

  console.log("📊 Pie data for breakdown:", pieData)
  const totalMinutes = pieData.reduce((sum, d) => sum + d.value, 0)

  // TODO: Calculate week change from previous week
  const weekChange = 0

  return (
    <Card className="p-4 bg-black border-white/10">
      {displayName && (
        <div className="mb-4 pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Welcome back, {displayName}</h2>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
        {/* Rank Section - Compact */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative w-16 h-16">
            <Image
              src={rankInfo.current.image || "/placeholder.svg"}
              alt={rankInfo.current.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{rankInfo.current.name}</p>
            <p className="text-xs text-gray-400">{minutesToHhMm(stats?.totalMinutes || 0)}/week</p>
            {rankInfo.next && (
              <div className="flex items-center gap-2 mt-1">
                <Progress value={rankInfo.progressToNext} className="h-1.5 w-20 bg-gray-800" />
                <span className="text-xs text-gray-500">
                  {minutesToHhMm(rankInfo.minutesToNext)} to {rankInfo.next.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-16 bg-white/10" />

        {/* Streak Section - Compact */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
          <div>
            <p className="text-2xl font-bold text-orange-500">{stats?.streakDays ?? 0}</p>
            <p className="text-xs text-gray-400">day streak</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-16 bg-white/10" />

        {/* Weekly Total + Change - Compact */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{minutesToHhMm(totalMinutes)}</p>
            <p className="text-xs text-gray-400">this week</p>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded ${weekChange >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
          >
            {weekChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {weekChange >= 0 ? "+" : ""}
              {weekChange}%
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-16 bg-white/10" />

        {/* Subject Breakdown - Compact horizontal bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">Subject breakdown</p>
          </div>
          {/* Stacked horizontal bar */}
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-800">
            {pieData.length > 0 ? pieData.map((entry, i) => {
              const percentage = totalMinutes > 0 ? (entry.value / totalMinutes) * 100 : 0
              return (
              <div
                key={i}
                style={{
                    width: `${percentage}%`,
                    backgroundColor: entry.color || "#3b82f6",
                    minWidth: percentage > 0 ? "2px" : "0",
                }}
                className="h-full relative group"
                title={`${entry.name}: ${minutesToHhMm(entry.value)}`}
              />
              )
            }) : (
              <div className="h-full w-full bg-gray-700" title="No data" />
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {pieData.slice(0, 4).map((entry, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || "#3b82f6" }} />
                <span className="text-xs text-gray-400">
                  {entry.name} ({totalMinutes > 0 ? ((entry.value / totalMinutes) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
            {pieData.length > 4 && <span className="text-xs text-gray-500">+{pieData.length - 4} more</span>}
          </div>
        </div>
      </div>
    </Card>
  )
}
