"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Crown, Medal, Award, User, Loader2, Clock } from "lucide-react"
import { getLeaderboardGlobal, getLeaderboardDomain, getLeaderboardFriends } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-provider"
import { minutesToHhMm } from "@/lib/utils"

type LeaderboardScope = "friends" | "domain" | "global"

interface LeaderboardEntry {
  rank: number
  name: string
  username: string
  email: string
  email_domain: string
  hoursPerWeek: number
  minutesPerWeek: number
}

function LeaderboardPageContent() {
  const { user } = useAuth()
  const [scope, setScope] = useState<LeaderboardScope>("global")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [timeUntilReset, setTimeUntilReset] = useState<string>("")

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        let data: LeaderboardEntry[] = []
        if (scope === "global") {
          data = await getLeaderboardGlobal()
        } else if (scope === "domain") {
          data = await getLeaderboardDomain()
        } else {
          data = await getLeaderboardFriends()
        }
        setLeaderboard(data)
        
        // Find user's rank
        if (user?.username) {
          const rank = data.findIndex(entry => entry.username === user.username)
          setUserRank(rank >= 0 ? rank + 1 : null)
        } else {
          setUserRank(null)
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err)
      } finally {
        setLoading(false)
      }
    }
    loadLeaderboard()
  }, [scope, user])

  // Calculate time until next UTC week reset (Monday 00:00:00 UTC)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      
      // Get current UTC time components
      const currentDay = now.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Calculate days until next Monday
      // If it's Monday, next reset is next Monday (7 days)
      // Otherwise, calculate days until next Monday
      let daysUntilMonday = 0
      if (currentDay === 1) { // Monday
        // Monday - next reset is next Monday (7 days)
        daysUntilMonday = 7
      } else if (currentDay === 0) { // Sunday
        daysUntilMonday = 1
      } else {
        // Tuesday (2) through Saturday (6)
        daysUntilMonday = 8 - currentDay
      }
      
      // Create next Monday 00:00:00 UTC
      const nextMonday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilMonday,
        0, 0, 0, 0
      ))
      
      // Calculate time difference
      const diff = nextMonday.getTime() - now.getTime()
      
      if (diff <= 0) {
        // Shouldn't happen, but handle edge case
        setTimeUntilReset("Resetting...")
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      if (days > 0) {
        setTimeUntilReset(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeUntilReset(`${minutes}m ${seconds}s`)
      } else {
        setTimeUntilReset(`${seconds}s`)
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)
  
  // Check if current user is in top 3
  const userInTop3 = user?.username && top3.some(entry => entry.username === user.username)

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 relative">
          {/* Left - Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">DYESB?</h1>
          </Link>

          {/* Center - Nav links - visible at all zoom levels */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 absolute left-1/2 -translate-x-1/2 overflow-x-auto scrollbar-hide">
            <Link href="/dashboard" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
              Dashboard
            </Link>
            <Link href="/tracker" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
              Web Tracker
            </Link>
            <Link href="/leaderboard" className="text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap px-1">
              Leaderboard
            </Link>
            <Link href="/friends" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
              Friends
            </Link>
            <Link href="/settings" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-1">
              Settings
            </Link>
          </div>

          {/* Right - User Name or Sign In */}
          {user ? (
            <span className="text-white text-sm font-medium">
              {user.display_name || user.username || user.email.split("@")[0]}
            </span>
          ) : (
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-6">
            {/* Week Reset Timer */}
            <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-white/10 rounded-lg">
              <Clock className="w-4 h-4 text-gray-400" />
              <div className="text-right">
                <p className="text-xs text-gray-400">Week resets in</p>
                <p className="text-sm font-semibold text-white">{timeUntilReset || "Calculating..."}</p>
              </div>
            </div>
            {userRank !== null && (
              <div className="text-right">
                <p className="text-sm text-gray-400">Your Rank</p>
                <p className="text-2xl font-bold text-white">#{userRank}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scope Selector */}
        <div className="mb-8 flex gap-3">
          {(["friends", "domain", "global"] as const).map((s) => (
            <Button
              key={s}
              onClick={() => setScope(s)}
              className={`capitalize ${
                scope === s
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-transparent border border-white/20 text-white hover:bg-white/10"
              }`}
            >
              {s}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card className="p-12 bg-black border-white/10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-gray-400">Loading leaderboard...</p>
          </Card>
        ) : (
          <>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* 2nd Place */}
          <Card className={`bg-gradient-to-br from-gray-900 to-black border-gray-600 p-6 flex flex-col items-center order-1 md:order-1 ${
            user?.username === top3[1]?.username ? "ring-2 ring-yellow-500" : ""
          }`}>
            <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mb-4">
              <Medal className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-5xl font-bold text-gray-400 mb-2">2</div>
            <h3 className="text-xl font-bold text-white mb-1">
              {top3[1]?.name} {user?.username === top3[1]?.username && "(You)"}
            </h3>
            <p className="text-sm text-gray-400 mb-2">{top3[1]?.email}</p>
            <p className="text-2xl font-bold text-white">{top3[1]?.minutesPerWeek ? minutesToHhMm(top3[1].minutesPerWeek) : "0m"}</p>
            <Link href={`/profile/${top3[1]?.username}`} className="mt-4">
              <Button className="bg-gray-700 text-white hover:bg-gray-600">
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </Card>

          {/* 1st Place */}
          <Card className={`bg-gradient-to-br from-yellow-900/50 to-black border-yellow-600 p-6 flex flex-col items-center order-0 md:order-2 md:-mt-4 md:mb-4 ${
            user?.username === top3[0]?.username ? "ring-2 ring-yellow-500" : ""
          }`}>
            <div className="w-20 h-20 rounded-full bg-yellow-600 flex items-center justify-center mb-4">
              <Crown className="w-10 h-10 text-yellow-200" />
            </div>
            <div className="text-6xl font-bold text-yellow-500 mb-2">1</div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {top3[0]?.name} {user?.username === top3[0]?.username && "(You)"}
            </h3>
            <p className="text-sm text-gray-400 mb-2">{top3[0]?.email}</p>
            <p className="text-3xl font-bold text-yellow-500">{top3[0]?.minutesPerWeek ? minutesToHhMm(top3[0].minutesPerWeek) : "0m"}</p>
            <Link href={`/profile/${top3[0]?.username}`} className="mt-4">
              <Button className="bg-yellow-600 text-black hover:bg-yellow-500">
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </Card>

          {/* 3rd Place */}
          <Card className={`bg-gradient-to-br from-orange-900/30 to-black border-orange-700 p-6 flex flex-col items-center order-2 md:order-3 ${
            user?.username === top3[2]?.username ? "ring-2 ring-yellow-500" : ""
          }`}>
            <div className="w-16 h-16 rounded-full bg-orange-700 flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-orange-300" />
            </div>
            <div className="text-5xl font-bold text-orange-600 mb-2">3</div>
            <h3 className="text-xl font-bold text-white mb-1">
              {top3[2]?.name} {user?.username === top3[2]?.username && "(You)"}
            </h3>
            <p className="text-sm text-gray-400 mb-2">{top3[2]?.email}</p>
            <p className="text-2xl font-bold text-white">{top3[2]?.minutesPerWeek ? minutesToHhMm(top3[2].minutesPerWeek) : "0m"}</p>
            <Link href={`/profile/${top3[2]?.username}`} className="mt-4">
              <Button className="bg-orange-700 text-white hover:bg-orange-600">
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </Card>
        </div>

        <Card className="overflow-hidden bg-black border-white/10">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-black sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Hours/Week</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Profile</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry, idx) => {
                  const rank = idx + 4
                  const isCurrentUser = user?.username === entry.username
                  return (
                    <tr
                      key={entry.rank}
                      className={`border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors ${
                        isCurrentUser ? "bg-yellow-500/10 border-yellow-500/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${isCurrentUser ? "text-yellow-500" : "text-gray-400"}`}>
                          {rank}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${isCurrentUser ? "text-yellow-500" : "text-white"}`}>
                        {entry.name} {isCurrentUser && "(You)"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{entry.email}</td>
                      <td className={`px-6 py-4 text-sm ${isCurrentUser ? "text-yellow-500 font-bold" : "text-white"}`}>
                        {entry.minutesPerWeek ? minutesToHhMm(entry.minutesPerWeek) : "0m"}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/profile/${entry.username}`}>
                          <Button className="bg-white/10 text-white hover:bg-white/20" size="sm">
                            <User className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
        )}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardPageContent />
    </ProtectedRoute>
  )
}
