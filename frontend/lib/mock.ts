import type { FocusSession, DailyStats, SubjectStats, LeaderboardEntry, SummaryStats, Badge } from "./types"

const SUBJECTS = ["ECE 210", "Math 101", "Physics", "Data Structures", "Algorithms", "Web Dev"]

function generateRandomMinutes(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateDateRange(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split("T")[0])
  }
  return dates
}

export function generateMockSummary(): SummaryStats {
  return {
    totalMinutes: generateRandomMinutes(480, 1440),
    sessionsCount: generateRandomMinutes(4, 12),
    avgSessionMinutes: generateRandomMinutes(25, 90),
    streakDays: generateRandomMinutes(3, 47),
  }
}

export function generateMockBySubject(): SubjectStats[] {
  return SUBJECTS.map((subject) => ({
    subject,
    minutes: generateRandomMinutes(60, 600),
  }))
}

export function generateMockWeekly(weekStart: string): DailyStats[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const data: DailyStats[] = []
  const startDate = new Date(weekStart)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]

    const bySubject: Record<string, number> = {}
    let total = 0

    SUBJECTS.forEach((subject) => {
      const minutes = generateRandomMinutes(0, 180)
      bySubject[subject] = minutes
      total += minutes
    })

    data.push({
      date: dateStr,
      minutes: total,
      bySubject,
    })
  }

  return data
}

export function generateMockLast30Days(): DailyStats[] {
  return generateDateRange(30).map((date) => ({
    date,
    minutes: generateRandomMinutes(60, 480),
  }))
}

export function generateMockYearData(year: number): DailyStats[] {
  const data: DailyStats[] = []
  const startDate = new Date(year, 0, 1)

  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]

    data.push({
      date: dateStr,
      minutes: Math.random() > 0.3 ? generateRandomMinutes(30, 300) : 0,
    })
  }

  return data
}

export function generateMockLeaderboard(): LeaderboardEntry[] {
  const names = ["Alex Chen", "Jordan Smith", "Casey Williams", "Morgan Lee", "Taylor Jones"]
  return names.map((name, i) => ({
    userId: `user-${i}`,
    name,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    minutes: generateRandomMinutes(300, 1200),
    deltaPct: (Math.random() - 0.5) * 30,
    spark: Array.from({ length: 7 }, () => generateRandomMinutes(30, 200)),
  }))
}

export function generateMockSessions(): FocusSession[] {
  const sessions: FocusSession[] = []
  const today = new Date()

  for (let i = 0; i < 15; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const startHour = generateRandomMinutes(6, 20)
    const startTime = new Date(date)
    startTime.setHours(startHour, generateRandomMinutes(0, 59), 0)

    const duration = generateRandomMinutes(25, 120)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    sessions.push({
      id: `session-${i}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      subject: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)],
      notes: Math.random() > 0.3 ? "Good focus session" : undefined,
    })
  }

  return sessions
}

export function generateMockBadges(): Badge[] {
  const badges: Badge[] = [
    {
      id: "early-bird",
      name: "Early Bird",
      description: "3 sessions before 9am",
      earned: Math.random() > 0.3,
    },
    {
      id: "marathon",
      name: "Marathon",
      description: "Single session ≥3 hours",
      earned: Math.random() > 0.4,
    },
    {
      id: "consistency-7d",
      name: "Consistency 7d",
      description: "Focus 7 consecutive days",
      earned: Math.random() > 0.5,
    },
  ]
  return badges
}
