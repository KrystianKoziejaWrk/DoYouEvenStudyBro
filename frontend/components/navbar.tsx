"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFilterStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-provider"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
]

export default function Navbar() {
  const { timezone, setTimezone } = useFilterStore()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.documentElement.classList.add("dark")
  }, [])

  return (
    <nav className="border-b border-white/10 bg-black backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        {/* Left - Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">DYESB?</h1>
        </Link>

        {/* Center - Nav links - visible at all zoom levels, responsive spacing */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 absolute left-1/2 -translate-x-1/2 overflow-x-auto scrollbar-hide">
          <Link href="/dashboard" className="text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap px-1">
            Dashboard
          </Link>
          <Link href="/tracker" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
            Web Tracker
          </Link>
          <Link href="/leaderboard" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
            Leaderboard
          </Link>
          <Link href="/friends" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
            Friends
          </Link>
          <Link href="/settings" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
            Settings
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-32 bg-black border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/10">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz} className="text-white focus:bg-white/10 focus:text-white">
                  {tz.split("/")[1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {mounted && user ? (
            <span className="text-white text-sm font-medium">
              {user.display_name || user.username || user.email.split("@")[0]}
            </span>
          ) : (
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
