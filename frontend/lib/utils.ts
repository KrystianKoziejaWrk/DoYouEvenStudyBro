import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function minutesToHhMm(minutes: number): string {
  // Round to nearest minute
  const roundedMinutes = Math.round(minutes)
  const hours = Math.floor(roundedMinutes / 60)
  const mins = roundedMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export function getMonday(date: Date): Date {
  // Calculate Monday in UTC to match backend behavior
  // Convert date to UTC
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ))
  
  // Get day of week in UTC (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const day = utcDate.getUTCDay()
  
  // Calculate days to subtract to get to Monday
  // If Sunday (0), subtract 6 days; otherwise subtract (day - 1) days
  const diff = day === 0 ? -6 : 1 - day
  
  // Create new date with the adjustment
  const mondayUTC = new Date(utcDate)
  mondayUTC.setUTCDate(utcDate.getUTCDate() + diff)
  
  // Set time to midnight UTC
  mondayUTC.setUTCHours(0, 0, 0, 0)
  
  return mondayUTC
}

export function calculateXP(totalMinutes: number): number {
  return Math.floor(totalMinutes / 10)
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100)
}

export function calculateXPToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp)
  const nextLevelXP = (currentLevel + 1) * 100
  return nextLevelXP - xp
}
