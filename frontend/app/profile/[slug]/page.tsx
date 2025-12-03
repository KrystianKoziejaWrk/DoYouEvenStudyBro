"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Flame, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Clock, Target, Loader2, UserPlus, Check, Clock as ClockIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getUserByUsername,
  getStatsSummary,
  getStatsBySubject,
  getStatsWeekly,
  getStatsDaily,
  getStatsHeatmap,
  getSubjects,
  sendFriendRequest,
  getFriends,
  getOutgoingRequests,
  getIncomingRequests,
  acceptFriendRequest,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-provider"
import { useFilterStore } from "@/lib/store"
import Last30Line from "@/components/last-30-line"
import { minutesToHhMm } from "@/lib/utils"
import { toast } from "sonner"

const RANKS = [
  { name: "Baus", minHours: 0, image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-29-20am.png" },
  { name: "Sherm", minHours: 5, image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-35-20-20pm.png" },
  { name: "Squid", minHours: 10, image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-06-20am.png" },
  { name: "French Mouse", minHours: 15, image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-33-28-20pm.png" },
  { name: "Taus", minHours: 30, image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-32-49-20pm.png" },
]

function getRank(totalHours: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalHours >= RANKS[i].minHours) {
      const current = RANKS[i]
      const next = RANKS[i + 1]
      const progressToNext = next ? ((totalHours - current.minHours) / (next.minHours - current.minHours)) * 100 : 100
      return { current, next, progressToNext }
    }
  }
  return { current: RANKS[0], next: RANKS[1], progressToNext: 0 }
}

export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { user: currentUser } = useAuth()
  const { timezone, selectedSubject, subjects, showAllSubjects } = useFilterStore()
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    params.then((p) => setUsername(p.slug))
  }, [params])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [subjectStats, setSubjectStats] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any>(null)
  const [dailyData, setDailyData] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [friendSubjects, setFriendSubjects] = useState<any[]>([]) // Store friend's subjects for filtering
  const [currentSubjectId, setCurrentSubjectId] = useState<number | undefined>(undefined) // Track current filter
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_outgoing" | "pending_incoming" | "friends">("none")
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null)
  const [addingFriend, setAddingFriend] = useState(false)

  useEffect(() => {
    if (!username) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        console.log("📊 Loading profile data for:", username)
        
        // Calculate date ranges (Sunday-Saturday, matching weekly calendar)
        // Use viewer's timezone to calculate week boundaries
        const today = new Date()
        const daysSinceSunday = today.getDay() // 0 = Sunday, 1 = Monday, etc.
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - daysSinceSunday)
        weekStart.setHours(0, 0, 0, 0) // Start of Sunday in viewer's timezone
        const weekEnd = new Date(today)
        weekEnd.setHours(23, 59, 59, 999) // End of today
        
        // Convert to ISO date strings (YYYY-MM-DD) for API calls
        // The backend will handle timezone conversion for the actual session queries
        const startDate = weekStart.toISOString().split("T")[0]
        const endDate = weekEnd.toISOString().split("T")[0]
        
        // For heatmap, use year start
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearStartStr = yearStart.toISOString().split("T")[0]
        const yearEndStr = today.toISOString().split("T")[0]
        
        console.log("📅 Date ranges:", { startDate, endDate, yearStartStr, yearEndStr })
        
        // Load user and subjects first (needed for filtering)
        const [userData, subjectsList] = await Promise.all([
          getUserByUsername(username).catch((err) => {
            console.error("❌ Failed to load user:", err)
            return null
          }),
          getSubjects(username).catch((err) => {
            console.error("❌ Failed to load subjects list:", err)
            return []
          }),
        ])
        
        // Store friend's subjects immediately for filtering
        const currentFriendSubjects = subjectsList || []
        setFriendSubjects(currentFriendSubjects)
        
        // Get subject_id for filtering if a specific subject is selected
        // When viewing a friend's profile, use friend's subjects; otherwise use current user's subjects
        let subjectId: number | undefined = undefined
        if (!showAllSubjects && selectedSubject) {
          // If we have friend's subjects loaded, use those (we're viewing a friend's profile)
          // Otherwise, use current user's subjects (viewing own profile)
          const subjectsToSearch = currentFriendSubjects.length > 0 ? currentFriendSubjects : subjects
          const subject = subjectsToSearch.find((s: any) => String(s.id) === String(selectedSubject))
          
          if (subject) {
            subjectId = Number(subject.id)
            console.log(`🔍 Filtering by subject_id: ${subjectId} (${subject.name || subject.subject})`)
          } else {
            console.log(`⚠️ Subject not found: ${selectedSubject} in ${currentFriendSubjects.length > 0 ? 'friend' : 'own'} subjects`)
          }
        } else {
          console.log(`📊 Showing all subjects`)
        }
        
        // Store current subjectId for use in rendering
        setCurrentSubjectId(subjectId)
        
        // Now load the rest of the data with the subject filter
        const [summaryData, subjectData, weeklyDataResult, dailyDataResult, heatmapDataResult] =
          await Promise.all([
            getStatsSummary({ username, start_date: startDate, end_date: endDate, subject_id: subjectId }).catch((err) => {
              console.error("❌ Failed to load summary:", err)
              return null
            }),
            getStatsBySubject({ username, start_date: startDate, end_date: endDate }).catch((err) => {
              console.error("❌ Failed to load subject stats:", err)
              return []
            }),
            getStatsWeekly({ username, start_date: startDate, subject_id: subjectId }).catch((err) => {
              console.error("❌ Failed to load weekly data:", err)
              return null
            }),
            getStatsDaily({ username, subject_id: subjectId }).catch((err) => {
              console.error("❌ Failed to load daily data:", err)
              return []
            }),
            getStatsHeatmap({ username, start_date: yearStartStr, end_date: yearEndStr }).catch((err) => {
              console.error("❌ Failed to load heatmap:", err)
              return []
            }),
          ])

        console.log("✅ Profile data loaded:", {
          user: !!userData,
          summary: !!summaryData,
          subjects: subjectData.length,
          weekly: !!weeklyDataResult,
          daily: dailyDataResult.length,
          heatmap: heatmapDataResult.length,
        })

        // Get all subjects for this user (from subjects list)
        // Map them with stats if available, otherwise just show them with 0 minutes
        const subjectsMap = new Map()
        
        // First, add all subjects from the subjects list
        if (subjectsList && Array.isArray(subjectsList)) {
          subjectsList.forEach((subj: any) => {
            subjectsMap.set(subj.id, {
              subject: subj.name || "Unknown",
              minutes: 0,
              color: subj.color || "#3b82f6",
              subject_id: subj.id,
            })
          })
        }
        
        // Then, update with stats from subjectData
        if (subjectData && Array.isArray(subjectData)) {
          subjectData.forEach((s: any) => {
            if (s.subject_id) {
              const existing = subjectsMap.get(s.subject_id)
              if (existing) {
                existing.minutes = Math.round(s.minutes || 0)
              } else {
                subjectsMap.set(s.subject_id, {
                  subject: s.subject || "Unknown",
                  minutes: Math.round(s.minutes || 0),
                  color: s.color || "#3b82f6",
                  subject_id: s.subject_id,
                })
              }
            }
          })
        }
        
        // Convert to array and filter out "All Subjects" from the buttons (we'll add it separately)
        const subjectsWithColors = Array.from(subjectsMap.values())
          .filter((s: any) => s.subject !== "All Subjects")
          .sort((a: any, b: any) => b.minutes - a.minutes)

        console.log("✅ Profile data loaded:", {
          user: !!userData,
          summary: summaryData,
          weeklyData: weeklyDataResult,
          subjects: subjectsWithColors.length,
          daily: dailyDataResult.length,
          heatmap: heatmapDataResult.length,
        })

        setUser(userData)
        setSummary(summaryData)
        setSubjectStats(subjectsWithColors)
        setWeeklyData(weeklyDataResult)
        setDailyData(dailyDataResult)
        setHeatmapData(heatmapDataResult)

        // Check friend status if viewing someone else's profile
        if (currentUser && userData && currentUser.id !== userData.id) {
          try {
            const [friendsList, outgoingRequests, incomingRequests] = await Promise.all([
              getFriends().catch(() => []),
              getOutgoingRequests().catch(() => []),
              getIncomingRequests().catch(() => []),
            ])

            // Check if already friends
            const isFriend = friendsList.some((f: any) => f.user.id === userData.id || f.user.username === username)
            if (isFriend) {
              setFriendStatus("friends")
            } else {
              // Check if there's a pending outgoing request
              const outgoingRequest = outgoingRequests.find((r: any) => r.addressee?.id === userData.id || r.addressee?.username === username)
              if (outgoingRequest) {
                setFriendStatus("pending_outgoing")
                setPendingRequestId(outgoingRequest.id)
              } else {
                // Check if there's a pending incoming request (they sent us one)
                const incomingRequest = incomingRequests.find((r: any) => r.requester?.id === userData.id || r.requester?.username === username)
                if (incomingRequest) {
                  setFriendStatus("pending_incoming")
                  setPendingRequestId(incomingRequest.id)
                } else {
                  setFriendStatus("none")
                }
              }
            }
          } catch (err) {
            console.error("Failed to check friend status:", err)
            setFriendStatus("none")
          }
        } else if (currentUser && userData && currentUser.id === userData.id) {
          // Viewing own profile
          setFriendStatus("none")
        }
      } catch (err) {
        console.error("❌ Failed to load profile data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [username, selectedSubject, subjects, showAllSubjects, timezone, currentUser])

  if (!username || loading) {
    return (
      <div className="flex h-screen bg-black text-white items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-black text-white items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="text-gray-400 mb-4">The user @{username} doesn't exist or their profile is private.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/leaderboard">
              <Button>Back to Leaderboard</Button>
            </Link>
            <Link href="/friends">
              <Button variant="outline">Back to Friends</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate total hours from summary or weekly data (in minutes, then convert)
  const totalMinutes = summary 
    ? (summary.totalMinutes || 0)
    : weeklyData 
      ? (weeklyData.weeklyTotalMinutes || 0)
      : 0
  
  const totalHours = totalMinutes / 60
  const rankInfo = getRank(totalHours)
  const totalSubjectMinutes = subjectStats.reduce((sum, s) => sum + (s.minutes || 0), 0)
  
  console.log("📊 Profile data state:", {
    user: !!user,
    summary,
    weeklyData,
    subjectStats: subjectStats.length,
    subjectStatsData: subjectStats,
    dailyData: dailyData.length,
    totalMinutes,
    totalHours,
  })
  const hours = Array.from({ length: 18 }, (_, i) => i + 6)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="flex h-screen bg-black text-white flex-col">
      {/* Navbar - matching dashboard */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-1 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 flex items-center justify-between gap-1 sm:gap-2">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">DYESB?</h1>
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-4 absolute left-1/2 -translate-x-1/2 overflow-x-auto scrollbar-hide max-w-[60vw] sm:max-w-none">
            <Link href="/dashboard" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Dashboard
            </Link>
            <Link href="/tracker" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Web Tracker
            </Link>
            <Link href="/leaderboard" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Leaderboard
            </Link>
            <Link href="/friends" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Friends
            </Link>
            <Link href="/settings" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Settings
            </Link>
          </div>

          {currentUser ? (
            <span className="text-white text-sm font-medium">
              {currentUser.display_name || currentUser.username || currentUser.email.split("@")[0]}
            </span>
          ) : (
          <Link href="/login">
            <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
          </Link>
          )}
        </div>
      </nav>

      {/* Main Content - matching dashboard layout */}
      <ScrollArea className="flex-1 w-full bg-black">
        <div className="p-6 space-y-6 max-w-full">
          {/* Back button and profile header */}
          <div className="animate-in fade-in-50 duration-500">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            {/* Profile Header Card */}
            <Card className="p-4 bg-black border-white/10 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {(user.display_name || user.username || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{user.display_name || user.username}</h1>
                    <p className="text-gray-400">@{user.username}</p>
                  </div>
                </div>
                {/* Add Friend Button - only show if viewing someone else's profile */}
                {currentUser && user && currentUser.id !== user.id && (
                  <div>
                    {friendStatus === "none" && (
                      <Button
                        onClick={async () => {
                          setAddingFriend(true)
                          try {
                            await sendFriendRequest(username)
                            setFriendStatus("pending_outgoing")
                            toast.success("Friend request sent", {
                              description: `Sent friend request to @${username}`,
                            })
                          } catch (err: any) {
                            console.error("Failed to send friend request:", err)
                            toast.error("Error", {
                              description: err.message || "Failed to send friend request",
                            })
                          } finally {
                            setAddingFriend(false)
                          }
                        }}
                        disabled={addingFriend}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        {addingFriend ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Friend
                          </>
                        )}
                      </Button>
                    )}
                    {friendStatus === "pending_outgoing" && (
                      <Button disabled className="bg-gray-600 text-white cursor-not-allowed">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        Request Sent
                      </Button>
                    )}
                    {friendStatus === "pending_incoming" && (
                      <Button
                        onClick={async () => {
                          if (pendingRequestId) {
                            setAddingFriend(true)
                            try {
                              await acceptFriendRequest(pendingRequestId)
                              setFriendStatus("friends")
                              toast.success("Friend request accepted", {
                                description: `You're now friends with @${username}`,
                              })
                            } catch (err: any) {
                              console.error("Failed to accept friend request:", err)
                              toast.error("Error", {
                                description: err.message || "Failed to accept friend request",
                              })
                            } finally {
                              setAddingFriend(false)
                            }
                          }
                        }}
                        disabled={addingFriend}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        {addingFriend ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Accept Request
                          </>
                        )}
                      </Button>
                    )}
                    {friendStatus === "friends" && (
                      <Button disabled className="bg-green-600 text-white cursor-not-allowed">
                        <Check className="w-4 h-4 mr-2" />
                        Friends
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Top Row: Stats - matching TopRow component */}
          <div className="animate-in fade-in-50 duration-500">
            <Card className="p-4 bg-black border-white/10">
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
                {/* Rank Section */}
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
                    <p className="text-xs text-gray-400">{Math.round(totalMinutes)}m this week</p>
                    {rankInfo.next && (
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={rankInfo.progressToNext} className="h-1.5 w-20 bg-gray-800" />
                        <span className="text-xs text-gray-500">
                          {minutesToHhMm((rankInfo.next.minHours - totalHours) * 60)} to {rankInfo.next.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden lg:block w-px h-16 bg-white/10" />

                {/* Streak */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Flame className="w-10 h-10 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-orange-500">{summary?.streakDays || 0}</p>
                    <p className="text-xs text-gray-400">day streak</p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-16 bg-white/10" />

                {/* Weekly Total */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{Math.round(totalMinutes)}m</p>
                    <p className="text-xs text-gray-400">this week</p>
                  </div>
                  {weeklyData && weeklyData.prevWeekTotalMinutes && weeklyData.prevWeekTotalMinutes > 0 && (
                  <div
                      className={`flex items-center gap-1 px-2 py-1 rounded ${
                        (weeklyData.weeklyTotalMinutes || 0) >= weeklyData.prevWeekTotalMinutes
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                  >
                      {(weeklyData.weeklyTotalMinutes || 0) >= weeklyData.prevWeekTotalMinutes ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                        {(weeklyData.weeklyTotalMinutes || 0) >= weeklyData.prevWeekTotalMinutes ? "+" : ""}
                        {weeklyData.prevWeekTotalMinutes > 0 ? (
                          (
                            ((weeklyData.weeklyTotalMinutes || 0) - weeklyData.prevWeekTotalMinutes) /
                            weeklyData.prevWeekTotalMinutes
                          ) * 100
                        ).toFixed(0) : "0"}
                        %
                    </span>
                  </div>
                  )}
                </div>

                <div className="hidden lg:block w-px h-16 bg-white/10" />

                {/* Subject Breakdown */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Subject breakdown</p>
                  {totalSubjectMinutes > 0 ? (
                    <>
                  <div className="h-4 rounded-full overflow-hidden flex bg-gray-800">
                        {subjectStats.map((subject, i) => {
                          const percentage = (subject.minutes / totalSubjectMinutes) * 100
                          return (
                      <div
                        key={i}
                        style={{
                                width: `${percentage}%`,
                                backgroundColor: subject.color || "#3b82f6",
                                minWidth: percentage > 0 ? "2px" : "0",
                        }}
                              className="h-full relative group"
                              title={`${subject.subject}: ${minutesToHhMm(subject.minutes)}`}
                      />
                          )
                        })}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {subjectStats.slice(0, 4).map((subject, i) => (
                      <div key={i} className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: subject.color || "#3b82f6" }}
                            />
                        <span className="text-xs text-gray-400">
                              {subject.subject} ({((subject.minutes / totalSubjectMinutes) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                        {subjectStats.length > 4 && (
                          <span className="text-xs text-gray-500">+{subjectStats.length - 4} more</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-4 rounded-full overflow-hidden flex bg-gray-800">
                      <div className="h-full w-full bg-gray-700" title="No data" />
                  </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Subject Bar - Clickable for filtering */}
          <div className="animate-in fade-in-50 duration-700">
            <Card className="p-3 bg-black border-white/10">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    useFilterStore.getState().setShowAllSubjects(true)
                    useFilterStore.getState().setSelectedSubject(null)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    showAllSubjects
                      ? "bg-white text-black"
                      : "bg-transparent border border-white/20 text-white/70 hover:bg-white/10"
                  }`}
                >
                  All Subjects
                </button>
                {subjectStats.map((subject, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      useFilterStore.getState().setShowAllSubjects(false)
                      useFilterStore.getState().setSelectedSubject(String(subject.subject_id))
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      !showAllSubjects && selectedSubject === String(subject.subject_id)
                        ? "bg-white text-black"
                        : "bg-transparent border text-white/70 hover:bg-white/10"
                    }`}
                    style={{ borderColor: subject.color || "#3b82f6" }}
                  >
                    {subject.subject}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Weekly Calendar - matching WeeklyCalendar component */}
          <div className="animate-in fade-in-50 duration-700">
            <Card className="p-6 bg-black border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-white">Weekly Overview</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" disabled>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-400 w-32 text-center">
                      {weeklyData?.weekStart
                        ? `${new Date(weeklyData.weekStart).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })} - ${new Date(
                            new Date(weeklyData.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Loading..."}
                    </span>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white" />
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="font-semibold text-white">{Math.round(totalMinutes)}m</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-white" />
                    <div>
                      <p className="text-xs text-gray-400">Avg Session</p>
                      <p className="font-semibold text-white">
                        {weeklyData && weeklyData.sessionsCount > 0
                          ? `${Math.floor((weeklyData.weeklyTotalMinutes / weeklyData.sessionsCount) / 60)}h ${Math.floor((weeklyData.weeklyTotalMinutes / weeklyData.sessionsCount) % 60)}m`
                          : "0h 0m"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-8 gap-1 mb-2">
                    <div className="w-12" />
              {weeklyData?.days.map((d: any, i: number) => {
                const dateObj = new Date(d.date)
                const dayName = days[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]
                // Calculate filtered total minutes if subject filter is active
                const dayTotalMinutes = !showAllSubjects && currentSubjectId !== undefined
                  ? (d.sessions || []).filter((s: any) => s.subject_id === currentSubjectId).reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0)
                  : d.totalMinutes
                return (
                  <div key={i} className="text-center">
                    <p className="text-sm font-medium text-white">{dayName}</p>
                    <p className="text-xs text-gray-400">
                      {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-white mt-1">{Math.floor(dayTotalMinutes / 60)}h</p>
                      </div>
                )
              })}
                  </div>

                  <div
                    className="relative border border-white/10 rounded-lg overflow-hidden"
                    style={{ height: "400px" }}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-white/5"
                        style={{ top: `${((hour - 6) / 18) * 100}%` }}
                      >
                        <span className="absolute -left-0 -top-2 text-[10px] text-gray-500 w-10 text-right pr-2">
                          {hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </span>
                      </div>
                    ))}

                    <div className="grid grid-cols-8 h-full ml-10">
                      <div />
                      {weeklyData?.days.map((day: any, dayIndex: number) => {
                        // Filter sessions by selected subject if filtering is active
                        let sessionsToShow = day.sessions || []
                        if (!showAllSubjects && currentSubjectId !== undefined) {
                          sessionsToShow = sessionsToShow.filter((session: any) => {
                            return session.subject_id === currentSubjectId
                          })
                        }
                        
                        return (
                        <div key={dayIndex} className="relative border-l border-white/10">
                          {sessionsToShow.map((session: any, blockIndex: number) => {
                            // Parse UTC timestamps and convert to local timezone (same as dashboard)
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
                              console.error("❌ Invalid date:", { startStr, endStr })
                              return null
                            }
                            
                            // Convert UTC to selected timezone
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
                            
                            const startHourDecimal = startHour + startMin / 60 + startSec / 3600
                            const durationHours = session.durationMinutes / 60
                            
                            // Calculate position for 6 AM - 12 AM view (18 hours)
                            const startPercent = ((startHourDecimal - 6) / 18) * 100
                            const heightPercent = (durationHours / 18) * 100
                            
                            // Calculate minimum height based on actual duration
                            const minHeightPx = durationHours < (1/60) ? 2 : 0
                            const calculatedHeightPx = (heightPercent / 100) * 400 // 400px container height
                            const finalHeightPx = Math.max(minHeightPx, calculatedHeightPx)
                            
                            // Get subject color from session data
                            const subjectColor = session.color || "#3b82f6"
                            
                            // Format times for display
                            const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:${startSec.toString().padStart(2, '0')}`
                            
                            return (
                              <div
                                key={blockIndex}
                                className="absolute left-1 right-1 rounded-md px-1 py-0.5 text-[10px] text-white font-medium overflow-hidden"
                                style={{
                                  top: `${startPercent}%`,
                                  height: `${finalHeightPx}px`,
                                  backgroundColor: subjectColor,
                                  minHeight: minHeightPx > 0 ? `${minHeightPx}px` : undefined,
                                }}
                                title={`${session.subject}: ${startTimeStr} (${Math.round(session.durationMinutes)}m)`}
                              >
                                {finalHeightPx >= 20 && (
                                  <>
                                    <div className="truncate">{session.subject}</div>
                                    <div className="text-white/70">{Math.round(session.durationMinutes)}m</div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Last 30 Days Trend */}
          <div className="animate-in fade-in-50 duration-700">
            <Last30Line username={username} />
          </div>

          {/* Year Heatmap */}
          <div className="animate-in fade-in-50 duration-700">
            <Card className="p-6 bg-black border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-white">Year Overview</h3>
              <div className="flex flex-wrap gap-1">
        {heatmapData.map((day, i) => {
          const maxMinutes = Math.max(...heatmapData.map((d) => d.minutes), 1)
                  const opacity = day.minutes > 0 ? Math.max(0.2, Math.min(1, day.minutes / maxMinutes)) : 0
                  return (
                    <div
                      key={i}
                      className="h-3 w-3 rounded-sm transition-all hover:scale-150 cursor-pointer"
                      style={{
                        backgroundColor: "#ffffff",
                        opacity: day.minutes === 0 ? 0.1 : opacity,
                      }}
                      title={`${day.date}: ${Math.floor(day.minutes / 60)}h ${day.minutes % 60}m`}
                    />
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
