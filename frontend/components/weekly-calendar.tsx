"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getStatsWeekly, getSubjects } from "@/lib/api"
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

interface WeeklyCalendarProps {
  username?: string // Optional username for viewing other users' profiles
}

export default function WeeklyCalendar({ username }: WeeklyCalendarProps = {}) {
  const [data, setData] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedSubject, showAllSubjects, subjects, timezone } = useFilterStore()
  const [profileSubjects, setProfileSubjects] = useState<any[]>([]) // Subjects for the profile being viewed
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = normal, 2 = 2x zoom, etc.
  const [scrollPosition, setScrollPosition] = useState(0) // Scroll position in pixels
  const [currentTime, setCurrentTime] = useState<{ dayIndex: number; hour: number; minute: number } | null>(null)
  const [resetTime, setResetTime] = useState<{ hour: number; minute: number } | null>(null)
  
  // When viewing someone else's profile, use their subjects; otherwise use viewer's subjects
  const effectiveSubjects = username ? profileSubjects : subjects
  // When viewing someone else's profile, don't apply viewer's filters
  const shouldFilterBySubject = !username && !showAllSubjects && selectedSubject !== undefined
  
  // Use UTC-based Monday as the anchor for the week (0 = Monday ... 6 = Sunday)
  const getMondayUTC = (d: Date) => {
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const day = utc.getUTCDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diff = (day + 6) % 7 // days since Monday
    utc.setUTCDate(utc.getUTCDate() - diff)
    utc.setUTCHours(0, 0, 0, 0)
    return utc
  }
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayUTC(new Date()))
  
  // Week dates (Monday -> Sunday) in user's timezone for rendering labels when data is empty
  const weekDatesRender = useMemo(() => {
    const dates: string[] = []
    for (let j = 0; j < 7; j++) {
      const weekDateUTC = new Date(weekStart)
      weekDateUTC.setUTCDate(weekStart.getUTCDate() + j)
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
      const parts = formatter.formatToParts(weekDateUTC)
      const y = parts.find(p => p.type === "year")?.value
      const m = parts.find(p => p.type === "month")?.value
      const d = parts.find(p => p.type === "day")?.value
      dates.push(`${y}-${m}-${d}`)
    }
    return dates
  }, [weekStart, timezone])

  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    avgSessionMinutes: 0,
    dailyAvgCurrent: 0,
    dailyAvgPrevious: 0,
    sessionsCount: 0,
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  // Underlying indices: 0=Mon, 1=Tue, ..., 6=Sun (Monday-first calendar)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // If viewing someone else's profile, fetch their subjects first
        let fetchedProfileSubjects: any[] = []
        if (username) {
          try {
            fetchedProfileSubjects = await getSubjects(username)
            setProfileSubjects(fetchedProfileSubjects || [])
            console.log("📚 Loaded profile subjects:", fetchedProfileSubjects)
          } catch (err) {
            console.error("Failed to load profile subjects:", err)
            setProfileSubjects([])
          }
        } else {
          setProfileSubjects([]) // Clear when viewing own profile
        }
        
        const weekData = await getStatsWeekly({ 
          start_date: weekStart.toISOString().split("T")[0],
          username: username // Pass username if viewing someone else's profile
        })
        console.log("📅 Weekly data received:", weekData, "for username:", username || "current user")
        
        if (!weekData || !weekData.days || !Array.isArray(weekData.days)) {
          console.error("❌ Invalid weekly data structure:", weekData)
          setData([])
          setLoading(false)
          return
        }

        // Collect all sessions from all days
        const allSessions: any[] = []
        weekData.days.forEach((d: any) => {
          if (d.sessions && Array.isArray(d.sessions)) {
            allSessions.push(...d.sessions)
          }
        })

        // Filter by subject if needed (only when viewing own profile)
        let sessionsToShow = allSessions
        if (shouldFilterBySubject && selectedSubject) {
          const selectedSubjectObj = subjects.find(s => String(s.id) === String(selectedSubject))
          if (selectedSubjectObj) {
            sessionsToShow = allSessions.filter((session: any) => {
              const sessionSubjectName = session.subject || "All Subjects"
              return sessionSubjectName === selectedSubjectObj.name
            })
          }
        }

        // Helper to get day of week in user's timezone (0=Monday, 1=Tuesday, ..., 6=Sunday)
        const getDayOfWeekInTimezone = (utcDate: Date): number => {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            weekday: "long"
          })
          const weekday = formatter.format(utcDate)
          const dayMap: { [key: string]: number } = {
            "Monday": 0,
            "Tuesday": 1,
            "Wednesday": 2,
            "Thursday": 3,
            "Friday": 4,
            "Saturday": 5,
            "Sunday": 6
          }
          return dayMap[weekday] ?? 0
        }

        // Helper to get date string in user's timezone (YYYY-MM-DD)
        const getDateInTimezone = (utcDate: Date): string => {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          })
          const parts = formatter.formatToParts(utcDate)
          const year = parts.find(p => p.type === "year")?.value
          const month = parts.find(p => p.type === "month")?.value
          const day = parts.find(p => p.type === "day")?.value
          return `${year}-${month}-${day}`
        }

        // Group sessions by day index (0=Mon, 1=Tue, ..., 6=Sun)
        const sessionsByDayIndex: { [dayIndex: number]: any[] } = {}
        for (let i = 0; i < 7; i++) {
          sessionsByDayIndex[i] = []
        }

        // Pre-calculate all dates in the week in user's timezone
        // Each index represents a day column (0=Mon, 1=Tue, ..., 6=Sun)
        const weekDatesInTimezone: string[] = []
        for (let j = 0; j < 7; j++) {
          const weekDateUTC = new Date(weekStart)
          weekDateUTC.setUTCDate(weekStart.getUTCDate() + j)
          // Format in user's timezone to YYYY-MM-DD
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          })
          const parts = formatter.formatToParts(weekDateUTC)
          const year = parts.find(p => p.type === "year")?.value
          const month = parts.find(p => p.type === "month")?.value
          const day = parts.find(p => p.type === "day")?.value
          weekDatesInTimezone.push(`${year}-${month}-${day}`)
        }

        console.log("📅 Week start (UTC):", weekStart.toISOString())
        console.log("📅 Week dates in timezone:", weekDatesInTimezone)
        console.log("📅 Total sessions to process:", sessionsToShow.length)
        console.log("📅 All sessions from backend:", sessionsToShow.map((s: any) => ({
          id: s.id,
          started_at: s.started_at,
          subject: s.subject
        })))

        // Calculate week boundaries in UTC for strict validation
        const weekEndUTC = new Date(weekStart)
        weekEndUTC.setUTCDate(weekStart.getUTCDate() + 6) // Sunday
        weekEndUTC.setUTCHours(23, 59, 59, 999) // End of Sunday

        sessionsToShow.forEach((session: any) => {
          let startStr = session.started_at
          if (!startStr.includes('Z') && !startStr.includes('+') && !startStr.includes('-', 10)) {
            startStr = startStr + 'Z'
          }
          
          const startDateUTC = new Date(startStr)
          if (isNaN(startDateUTC.getTime())) {
            console.error("❌ Invalid date:", startStr)
            return
          }

          // First check: ensure session is within the week's UTC range (Monday 00:00 UTC to Sunday 23:59:59 UTC)
          if (startDateUTC < weekStart || startDateUTC > weekEndUTC) {
            console.warn(`⚠️ Session UTC date ${startDateUTC.toISOString()} outside week range (${weekStart.toISOString()} to ${weekEndUTC.toISOString()}), skipping: ${session.started_at}`)
            return
          }

          // Get the session's date in user's timezone
          const sessionDateInTimezone = getDateInTimezone(startDateUTC)
          const sessionTimeInTimezone = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(startDateUTC)
          
          // Second check: ensure session date matches one of the week's dates in timezone
          const dateIndex = weekDatesInTimezone.indexOf(sessionDateInTimezone)
          if (dateIndex === -1) {
            // Session is not in the current week - skip it (prevents previous week's Sunday from appearing)
            console.warn(`⚠️ Session date ${sessionDateInTimezone} not in current week dates, skipping: ${session.started_at}`)
            return
          }
          const dayIndex = dateIndex
          
          if (dayIndex < 0 || dayIndex > 6) {
            console.warn(`⚠️ Computed dayIndex ${dayIndex} out of range for session ${session.started_at}`)
            return
          }
          
          // Shift session blocks back one day: Monday(0) -> Sunday(6), Tuesday(1) -> Monday(0), etc.
          const shiftedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1
          
          console.log(`✅ Session: UTC=${startDateUTC.toISOString()}, TZ=${sessionDateInTimezone} ${sessionTimeInTimezone}, OriginalDayIndex=${dayIndex} (${days[dayIndex]}), ShiftedTo=${shiftedDayIndex} (${days[shiftedDayIndex]})`)
          
          sessionsByDayIndex[shiftedDayIndex].push(session)
        })

        console.log("📊 Sessions by day index:", Object.keys(sessionsByDayIndex).map(i => {
          const idx = Number(i)
          const sessionList = sessionsByDayIndex[idx]
          return `${idx}(${days[idx]}): ${sessionList.length} sessions${sessionList.length > 0 ? ` [${sessionList.map((s: any) => s.started_at).join(', ')}]` : ''}`
        }).join(", "))

        // Create schedule for the week (Monday to Sunday, but display as Sun-Sat)
        // Use profile owner's subjects when viewing their profile, otherwise use viewer's subjects
        // Use freshly fetched subjects if available, otherwise fall back to state
        const currentEffectiveSubjects = username ? (fetchedProfileSubjects.length > 0 ? fetchedProfileSubjects : profileSubjects) : subjects
        const subjectMap = new Map(currentEffectiveSubjects.map((s) => [s.name, s]))
        console.log("🎨 Subject map (using", username ? "profile" : "viewer", "subjects):", Array.from(subjectMap.entries()).map(([name, sub]) => `${name}: ${sub.color}`).join(", "))
        
        const schedule: DaySchedule[] = []
        // weekDatesInTimezone[0] = Monday, [1] = Tuesday, ..., [6] = Sunday
        for (let i = 0; i < 7; i++) {
          // Get the date string in user's timezone for this column (already calculated)
          const dateForColumn = weekDatesInTimezone[i]
          
          // Get sessions for this day index
          const daySessions = sessionsByDayIndex[i] || []

          // Process sessions for this day
          const blocks: FocusBlock[] = daySessions.map((session: any) => {
            let startStr = session.started_at
            let endStr = session.ended_at
            
            if (!startStr.includes('Z') && !startStr.includes('+') && !startStr.includes('-', 10)) {
              startStr = startStr + 'Z'
            }
            if (!endStr.includes('Z') && !endStr.includes('+') && !endStr.includes('-', 10)) {
              endStr = endStr + 'Z'
            }
            
            const startDateUTC = new Date(startStr)
            const endDateUTC = new Date(endStr)
            
            if (isNaN(startDateUTC.getTime()) || isNaN(endDateUTC.getTime())) {
              return null
            }
            
            // Get time parts in the selected timezone
            const formatterWithSeconds = new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            })
            
            const startParts = formatterWithSeconds.formatToParts(startDateUTC)
            const endParts = formatterWithSeconds.formatToParts(endDateUTC)
            
            const startHour = parseInt(startParts.find(p => p.type === "hour")?.value || "0", 10)
            const startMin = parseInt(startParts.find(p => p.type === "minute")?.value || "0", 10)
            const startSec = parseInt(startParts.find(p => p.type === "second")?.value || "0", 10)
            const endHour = parseInt(endParts.find(p => p.type === "hour")?.value || "0", 10)
            const endMin = parseInt(endParts.find(p => p.type === "minute")?.value || "0", 10)
            const endSec = parseInt(endParts.find(p => p.type === "second")?.value || "0", 10)
            
            const startHourDecimal = startHour + startMin / 60 + startSec / 3600
            const durationHours = session.durationMinutes / 60

            const subjectName = session.subject || "All Subjects"
            const subjectColor = subjectMap.get(subjectName)?.color || "#f59f0a"

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

          const totalMinutes = blocks.reduce((sum, block) => sum + (block.duration * 60), 0)
          
          // Format date directly from the date string (YYYY-MM-DD) - no timezone conversion
          const [year, month, day] = dateForColumn.split('-').map(Number)
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          const formattedDate = `${monthNames[month - 1]} ${day}`

          schedule.push({
            day: days[i], // Mon -> Sun order
            date: formattedDate,
            totalMinutes: Math.round(totalMinutes),
            blocks,
          })
          }

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
  }, [weekStart, subjects, selectedSubject, showAllSubjects, timezone, username])

  // Calculate current time indicator on load
  useEffect(() => {
    const getDateInTimezone = (date: Date): string => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
      const parts = formatter.formatToParts(date)
      const year = parts.find(p => p.type === "year")?.value
      const month = parts.find(p => p.type === "month")?.value
      const day = parts.find(p => p.type === "day")?.value
      return `${year}-${month}-${day}`
    }
    
    const now = new Date()
    
    // Get current date and time in user's timezone (24-hour format)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false // Force 24-hour format (0-23)
    })
    
    const parts = formatter.formatToParts(now)
    const year = parseInt(parts.find(p => p.type === "year")?.value || "0")
    const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1
    const day = parseInt(parts.find(p => p.type === "day")?.value || "0")
    let hour = parseInt(parts.find(p => p.type === "hour")?.value || "0")
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0")
    
    // Check if we got AM/PM indicator (shouldn't happen with hour12: false, but just in case)
    const dayPeriod = parts.find(p => p.type === "dayPeriod")?.value
    if (dayPeriod === "PM" && hour < 12) {
      hour += 12
    } else if (dayPeriod === "AM" && hour === 12) {
      hour = 0
    }
    
    // Get today's date string in timezone (YYYY-MM-DD)
    const todayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Build the week dates array the same way the calendar does (Sunday -> Saturday)
    const weekDatesInTimezone: string[] = []
    for (let j = 0; j < 7; j++) {
      const weekDateUTC = new Date(weekStart)
      weekDateUTC.setUTCDate(weekStart.getUTCDate() + j)
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
      const parts = formatter.formatToParts(weekDateUTC)
      const y = parts.find(p => p.type === "year")?.value
      const m = parts.find(p => p.type === "month")?.value
      const d = parts.find(p => p.type === "day")?.value
      weekDatesInTimezone.push(`${y}-${m}-${d}`)
    }
    
    // Find which column index (0-6) matches today's date
    const dayIndex = weekDatesInTimezone.findIndex(dateStr => dateStr === todayDateStr)
    // Shift indicator back by one day to match expected display alignment
    const indicatorIndex = dayIndex > 0 ? dayIndex - 1 : dayIndex
    
    // Only show indicator if today is in the current week
    if (indicatorIndex >= 0 && indicatorIndex < 7) {
      setCurrentTime({ dayIndex: indicatorIndex, hour, minute })
      console.log("🕐 Current time indicator:", { dayIndex: indicatorIndex, hour, minute, todayDateStr, weekDatesInTimezone })
    } else {
      setCurrentTime(null)
      console.log("🕐 Today not in current week:", { todayDateStr, weekDatesInTimezone })
    }
  }, [weekStart, timezone])

  // Calculate the local time (hour:minute) corresponding to Sunday 00:00 UTC
  // for the week being displayed. This is when ranks reset.
  useEffect(() => {
    // Sunday in UTC for this week (weekStart is Monday UTC, so add 6 days)
    const sundayUTC = new Date(weekStart)
    sundayUTC.setUTCDate(weekStart.getUTCDate() + 6)
    sundayUTC.setUTCHours(0, 0, 0, 0)
    
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(sundayUTC)
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10)
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10)
    
    setResetTime({ hour, minute })
  }, [weekStart, timezone])

  const previousWeek = () => {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + 7)
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
              {(() => {
                // weekStart is Monday UTC, convert to user's timezone for display (Mon-Sun)
                const startDate = new Date(weekStart)
                startDate.setUTCDate(weekStart.getUTCDate() + 1) // shift forward one day
                const endDate = new Date(weekStart)
                endDate.setUTCDate(weekStart.getUTCDate() + 7) // shift forward one day for end
                const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: timezone })
                const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: timezone })
                return `${startStr} - ${endStr}`
              })()}
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
            {data.length > 0 ? data.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-sm font-medium text-white">{d.day}</p>
                <p className="text-xs text-gray-400">{d.date}</p>
                <p className="text-xs text-white mt-1">{minutesToHhMm(d.totalMinutes)}</p>
              </div>
            )) : (
              // Show empty week days
              Array.from({ length: 7 }).map((_, i) => {
                const dayName = days[i]
                return (
                  <div key={i} className="text-center">
                    <p className="text-sm font-medium text-white">{dayName}</p>
                    <p className="text-xs text-gray-400">
                      {weekDatesRender[i] ? (() => {
                        const [y, m, d] = weekDatesRender[i].split('-').map(Number)
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                        return `${monthNames[m - 1]} ${d}`
                      })() : ""}
                    </p>
                    <p className="text-xs text-white mt-1">0h 0m</p>
                  </div>
                )
              })
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="text-white hover:bg-white/10"
              disabled={zoomLevel <= 0.5}
            >
              Zoom Out
            </Button>
            <span className="text-xs text-gray-400">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
              className="text-white hover:bg-white/10"
              disabled={zoomLevel >= 3}
            >
              Zoom In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setZoomLevel(1)
                setScrollPosition(0)
              }}
              className="text-white hover:bg-white/10"
            >
              Reset
            </Button>
          </div>

          {/* Scrollable container with zoom */}
          <div 
            className="relative border border-white/10 rounded-lg overflow-auto scrollbar-hide"
            style={{ 
              height: "800px",
              maxHeight: "800px"
            }}
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
          >
            <div 
              className="relative"
              style={{ 
                height: `${800 * zoomLevel}px`,
                minHeight: `${800 * zoomLevel}px`
              }}
            >
              {hours
                .filter((h) => h >= 0 && h <= 23)
                .map((hour) => {
                  const containerHeight = 800 * zoomLevel
                  const hourPosition = (hour / 24) * containerHeight
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-white/5"
                      style={{ top: `${hourPosition}px` }}
                    >
                      <span className="absolute -left-0 -top-2 text-[10px] text-gray-500 w-10 text-right pr-2">
                        {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                      </span>
                    </div>
                  )
                })}

              <div className="grid grid-cols-8 ml-10" style={{ height: `${800 * zoomLevel}px` }}>
                <div />
                {data.length > 0 ? data.map((day, dayIndex) => (
                  <div key={dayIndex} className="relative border-l border-white/10">
                    {/* Rank reset marker: Sunday 00:00 UTC, projected into viewer's timezone (underlying index 6) */}
                    {resetTime && dayIndex === 6 && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none z-10"
                        style={{
                          top: `${((resetTime.hour + resetTime.minute / 60) / 24) * 800 * zoomLevel}px`,
                        }}
                        title="Ranks reset (Sunday 00:00 UTC)"
                      >
                        <div className="h-0.5 bg-amber-400 w-full relative shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                      </div>
                    )}
                    {/* Current time indicator - red line (only on today's column) */}
                    {currentTime && currentTime.dayIndex === dayIndex && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none z-20"
                        style={{
                          top: `${((currentTime.hour + currentTime.minute / 60) / 24) * 800 * zoomLevel}px`,
                        }}
                      >
                        <div className="h-0.5 bg-red-500 w-full relative">
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                      </div>
                    )}
                    {day.blocks.map((block, blockIndex) => {
                    // Calculate position for 24-hour view (0-23) with zoom
                    const containerHeight = 800 * zoomLevel
                    const startPositionPx = (block.startHour / 24) * containerHeight
                    const durationPx = (block.duration / 24) * containerHeight
                    
                    // Calculate minimum height based on actual duration
                    // For very short sessions (< 1 minute), use a small but visible height
                    // For longer sessions, use the calculated height
                    const minHeightPx = block.duration < (1/60) ? 2 * zoomLevel : 0 // Scale min height with zoom
                    const finalHeightPx = Math.max(minHeightPx, durationPx)

                    return (
                      <TooltipProvider key={blockIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute left-1 right-1 rounded-md px-1 py-0.5 text-[10px] text-white font-medium overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                top: `${startPositionPx}px`,
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
                              Duration: {minutesToHhMm(Math.round(block.duration * 60))}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                    })}
                  </div>
                )
              ) : (
                // Show empty week columns
                Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div key={dayIndex} className="relative border-l border-white/10" />
                ))
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
