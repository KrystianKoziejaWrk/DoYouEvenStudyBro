export interface FocusSession {
  id: string
  startTime: string
  endTime: string
  duration: number
  subject: string
  notes?: string
}

export interface DailyStats {
  date: string
  minutes: number
  bySubject?: Record<string, number>
}

export interface SubjectStats {
  subject: string
  minutes: number
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatarUrl: string
  minutes: number
  deltaPct: number
  spark: number[]
}

export interface SummaryStats {
  totalMinutes: number
  sessionsCount: number
  avgSessionMinutes: number
  streakDays: number
}

export interface Badge {
  id: string
  name: string
  description: string
  earned: boolean
}

export interface Subject {
  id: string
  name: string
  color: string
  createdAt: string
}

export type TimezoneOption = string
export type DateRange = "week" | "last-week" | "month" | "year" | "custom"
