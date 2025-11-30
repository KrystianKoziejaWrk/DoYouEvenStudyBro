"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getStatsWeekly } from "@/lib/api"
import { getMonday, minutesToHhMm } from "@/lib/utils"
import { useFilterStore } from "@/lib/store"

interface FocusBlock {
  startHour: number
  duration: number // in hours
  subject: string
  color: string
  startTime: string
  endTime: string
}

interface DaySchedule {
  day: string
  date: string
  totalMinutes: number
  blocks: FocusBlock[]
}

export default function WeeklyCalendar() {
  const [data, setData] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const { selectedSubject, showAllSubjects, subjects, timezone } = useFilterStore()

  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    avgSessionMinutes: 0,
    dailyAvgCurrent: 0,
    dailyAvgPrevious: 0,
    sessionsCount: 0,
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const subjectMap = new Map(subjects.map((s) => [s.name, s]))

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const weekData = await getStatsWeekly({ start_date: weekStart.toISOString().split("T")[0] })
        console.log("📅 Weekly data received:", weekData)
        
        if (!weekData || !weekData.days || !Array.isArray(weekData.days)) {
          console.error("❌ Invalid weekly data structure:", weekData)
          setData([])
          setLoading(false)
          return
        }

        const schedule: DaySchedule[] = weekData.days.map((d: any, i: number) => {
          // Filter sessions by selected subject if needed
          let sessionsToShow = d.sessions || []
          if (!showAllSubjects && selectedSubject) {
            const selectedSubjectObj = subjects.find(s => String(s.id) === String(selectedSubject))
            if (selectedSubjectObj) {
              sessionsToShow = sessionsToShow.filter((session: any) => {
                const sessionSubjectName = session.subject || "All Subjects"
                return sessionSubjectName === selectedSubjectObj.name
              })
            }
          }

          const blocks: FocusBlock[] = sessionsToShow.map((session: any) => {
            // Backend returns ISO strings in UTC (e.g., "2025-11-30T01:28:50.635+00:00" or "2025-11-30T01:28:50.635Z")
            // Parse as UTC - ensure it's treated as UTC
            let startStr = session.started_at
            let endStr = session.ended_at
            
            // If the string doesn't have timezone info, assume it's UTC and add 'Z'
            if (!startStr.includes('Z') && !startStr.includes('+') && !startStr.includes('-', 10)) {
              startStr = startStr + 'Z'
            }
            if (!endStr.includes('Z') && !endStr.includes('+') && !endStr.includes('-', 10)) {
              endStr = endStr + 'Z'
            }
            
            // Create Date objects - these will be in UTC internally
            const startDateUTC = new Date(startStr)
            const endDateUTC = new Date(endStr)
            
            // Verify UTC parsing
            if (isNaN(startDateUTC.getTime()) || isNaN(endDateUTC.getTime())) {
              console.error("❌ Invalid date:", { startStr, endStr })
              return null
            }
            
            // Convert UTC to selected timezone using Intl API
            // This is the correct way to convert UTC to a specific timezone
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            })
            
            // Get time parts in the selected timezone (including seconds)
            const formatterWithSeconds = new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            })
            
            const startParts = formatterWithSeconds.formatToParts(startDateUTC)
            const endParts = formatterWithSeconds.formatToParts(endDateUTC)
            
            // Extract hour, minute, and second
            const startHour = parseInt(startParts.find(p => p.type === "hour")?.value || "0", 10)
            const startMin = parseInt(startParts.find(p => p.type === "minute")?.value || "0", 10)
            const startSec = parseInt(startParts.find(p => p.type === "second")?.value || "0", 10)
            const endHour = parseInt(endParts.find(p => p.type === "hour")?.value || "0", 10)
            const endMin = parseInt(endParts.find(p => p.type === "minute")?.value || "0", 10)
            const endSec = parseInt(endParts.find(p => p.type === "second")?.value || "0", 10)
            
            // Debug logging
            console.log(`🕐 Session time conversion:`, {
              utc: startDateUTC.toISOString(),
              timezone,
              local: `${startHour}:${startMin.toString().padStart(2, '0')}:${startSec.toString().padStart(2, '0')}`
            })
            
            const startHourDecimal = startHour + startMin / 60 + startSec / 3600
            const endHourDecimal = endHour + endMin / 60 + endSec / 3600
            const durationHours = session.durationMinutes / 60

            // Find subject color from store
            const subjectName = session.subject || "All Subjects"
            const subjectColor = subjectMap.get(subjectName)?.color || "#f59f0a"

            // Format times for tooltip (HH:MM:SS format)
            const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:${startSec.toString().padStart(2, '0')}`
            const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:${endSec.toString().padStart(2, '0')}`

            return {
              startHour: startHourDecimal,
              duration: durationHours,
              subject: subjectName,
              color: subjectColor,
              startTime: startTimeStr,
              endTime: endTimeStr,
            }
          }).filter(block => block !== null) as FocusBlock[]

          // Calculate total minutes for filtered sessions
          const totalMinutes = blocks.reduce((sum, block) => sum + (block.duration * 60), 0)

          // Parse date - backend returns ISO date string (YYYY-MM-DD)
          const dateObj = new Date(d.date + "T00:00:00Z")

          return {
            day: days[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1],
            date: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            totalMinutes: Math.round(totalMinutes),
            blocks,
          }
        })

        console.log("📊 Processed schedule:", schedule)
        setData(schedule)

        // Calculate totals from filtered schedule
        const totalMinutes = schedule.reduce((sum, d) => sum + d.totalMinutes, 0)
        const totalHours = totalMinutes / 60
        const sessionsCount = schedule.reduce((sum, d) => sum + d.blocks.length, 0)
        const avgSessionMinutes = sessionsCount > 0 ? totalMinutes / sessionsCount : 0
        const dailyAvgCurrent = totalMinutes / 7
        
        // For previous week comparison, use all data (not filtered)
        const dailyAvgPrevious = (weekData.prevWeekTotalMinutes || 0) / 7

        setWeeklyStats({
          totalHours,
          avgSessionMinutes,
          dailyAvgCurrent,
          dailyAvgPrevious,
          sessionsCount,
        })
      } catch (err) {
        console.error("❌ Failed to load weekly data:", err)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekStart, subjects, selectedSubject, showAllSubjects, timezone])

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

  const dailyChange = weeklyStats.dailyAvgCurrent - weeklyStats.dailyAvgPrevious
  const dailyChangePercent =
    weeklyStats.dailyAvgPrevious > 0 ? ((dailyChange / weeklyStats.dailyAvgPrevious) * 100).toFixed(1) : "0"

  if (loading) {
    return (
      <Card className="p-6 bg-black border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Weekly Overview</h3>
        </div>
        <Skeleton className="h-96 w-full bg-gray-800" />
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-black border-white/10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Weekly Overview</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={previousWeek} className="text-white hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 w-32 text-center">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <Button variant="ghost" size="sm" onClick={nextWeek} className="text-white hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-semibold text-white">{minutesToHhMm(Math.round(weeklyStats.totalHours * 60))}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-white" />
            <div>
              <p className="text-xs text-gray-400">Avg Session</p>
              <p className="font-semibold text-white">{minutesToHhMm(Math.round(weeklyStats.avgSessionMinutes))}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dailyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <div>
              <p className="text-xs text-gray-400">Daily Avg vs Last Week</p>
              <p className={`font-semibold ${dailyChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {dailyChange >= 0 ? "+" : ""}
                {dailyChangePercent}% ({minutesToHhMm(Math.round(weeklyStats.dailyAvgCurrent))} avg/day)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="w-12" />
            {data.length > 0 ? data.map((d) => (
              <div key={d.day} className="text-center">
                <p className="text-sm font-medium text-white">{d.day}</p>
                <p className="text-xs text-gray-400">{d.date}</p>
                <p className="text-xs text-white mt-1">{minutesToHhMm(d.totalMinutes)}</p>
              </div>
            )) : (
              // Show empty week days
              Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(weekStart)
                date.setDate(date.getDate() + i)
                const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1]
                return (
                  <div key={i} className="text-center">
                    <p className="text-sm font-medium text-white">{dayName}</p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-white mt-1">0h 0m</p>
                  </div>
                )
              })
            )}
          </div>

          <div className="relative border border-white/10 rounded-lg overflow-hidden" style={{ height: "800px" }}>
            {hours
              .filter((h) => h >= 0 && h <= 23)
              .map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-white/5"
                  style={{ top: `${(hour / 24) * 100}%` }}
                >
                  <span className="absolute -left-0 -top-2 text-[10px] text-gray-500 w-10 text-right pr-2">
                    {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                  </span>
                </div>
              ))}

            <div className="grid grid-cols-8 h-full ml-10">
              <div />
              {data.length > 0 ? data.map((day, dayIndex) => (
                <div key={dayIndex} className="relative border-l border-white/10">
                  {day.blocks.map((block, blockIndex) => {
                    // Calculate position for 24-hour view (0-23)
                    const startPercent = (block.startHour / 24) * 100
                    const heightPercent = (block.duration / 24) * 100
                    
                    // Calculate minimum height based on actual duration
                    // For very short sessions (< 1 minute), use a small but visible height
                    // For longer sessions, use the calculated percentage
                    const minHeightPx = block.duration < (1/60) ? 2 : 0 // 2px for sessions < 1 minute, otherwise use calculated height
                    const calculatedHeightPx = (heightPercent / 100) * 800 // 800px is the container height
                    const finalHeightPx = Math.max(minHeightPx, calculatedHeightPx)

                    return (
                      <TooltipProvider key={blockIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute left-1 right-1 rounded-md px-1 py-0.5 text-[10px] text-white font-medium overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                top: `${startPercent}%`,
                                height: `${finalHeightPx}px`,
                                backgroundColor: block.color,
                                minHeight: minHeightPx > 0 ? `${minHeightPx}px` : undefined,
                              }}
                            >
                              {finalHeightPx >= 20 && (
                                <>
                                  <div className="truncate">{block.subject}</div>
                                  <div className="text-white/70">{block.duration.toFixed(2)}h</div>
                                </>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 border-white/10 text-white">
                            <p className="font-semibold">{block.subject}</p>
                            <p className="text-sm text-white">
                              {block.startTime} - {block.endTime}
                            </p>
                            <p className="text-xs text-gray-400">
                              Duration: {Math.floor(block.duration * 60)}m {Math.floor((block.duration * 60 % 1) * 60)}s
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              )) : (
                // Show empty week columns
                Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div key={dayIndex} className="relative border-l border-white/10" />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
