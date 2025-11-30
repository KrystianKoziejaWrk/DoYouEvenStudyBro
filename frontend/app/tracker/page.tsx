"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useFilterStore } from "@/lib/store"
import { getSubjects, createSession } from "@/lib/api"
import { toast } from "sonner"
import { ProtectedRoute } from "@/components/protected-route"

// localStorage keys
const STORAGE_KEY = "focus_tracker_session"

interface StoredSession {
  isRunning: boolean
  startTimestamp: number
  selectedSubjectId: number | null
  selectedSubject: string
}

function TrackerPageContent() {
  const [isRunning, setIsRunning] = useState(false)
  const [displayMilliseconds, setDisplayMilliseconds] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const allSubjects = useFilterStore((state) => state.subjects)

  // Include all subjects, including "All Subjects" since it's the default
  const subjects = useMemo(() => allSubjects || [], [allSubjects?.length])

  // Check for cooldown from localStorage on mount
  useEffect(() => {
    const storedCooldown = localStorage.getItem("focus_tracker_cooldown")
    if (storedCooldown) {
      const cooldownEnd = parseInt(storedCooldown, 10)
      const now = Date.now()
      if (cooldownEnd > now) {
        // Cooldown is still active
        setCooldownEndsAt(cooldownEnd)
      } else {
        // Cooldown expired, clear it
        localStorage.removeItem("focus_tracker_cooldown")
      }
    }
  }, [])

  // Load subjects from API
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const apiSubjects = await getSubjects()
        // Update store with API subjects
        apiSubjects.forEach((s: any) => {
          const existing = allSubjects.find((sub) => sub.id === String(s.id))
          if (!existing) {
            useFilterStore.getState().addSubject({
              id: String(s.id),
              name: s.name,
              color: s.color || "#3b82f6",
              createdAt: s.createdAt || new Date().toISOString(),
            })
          }
        })
      } catch (err) {
        console.error("Failed to load subjects:", err)
      }
    }
    loadSubjects()
  }, [])

  useEffect(() => {
    if (isHydrated && subjects.length > 0 && !selectedSubject) {
      // Prefer "All Subjects" if it exists, otherwise use first subject
      const allSubjectsOption = subjects.find((s) => s.name === "All Subjects")
      const subjectToSelect = allSubjectsOption || subjects[0]
      if (subjectToSelect) {
        setSelectedSubject(subjectToSelect.name)
        setSelectedSubjectId(Number(subjectToSelect.id))
      }
    }
  }, [subjects, selectedSubject, isHydrated])

  // Load session from localStorage on mount - but DON'T auto-start
  useEffect(() => {
    if (typeof window === "undefined") return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const session: StoredSession = JSON.parse(stored)
        
        // Validate that the stored subject_id still exists in current subjects
        let validSubjectId = session.selectedSubjectId
        let validSubjectName = session.selectedSubject || ""
        
        if (session.selectedSubjectId && subjects.length > 0) {
          const subjectExists = subjects.find(s => Number(s.id) === session.selectedSubjectId)
          if (!subjectExists) {
            // Subject doesn't exist anymore (database was reset), default to "All Subjects"
            console.warn(`⚠️ Stored subject_id ${session.selectedSubjectId} not found, defaulting to "All Subjects"`)
            const allSubjectsOption = subjects.find((s) => s.name === "All Subjects")
            if (allSubjectsOption) {
              validSubjectId = Number(allSubjectsOption.id)
              validSubjectName = allSubjectsOption.name
            } else if (subjects.length > 0) {
              // Fallback to first subject if "All Subjects" doesn't exist
              validSubjectId = Number(subjects[0].id)
              validSubjectName = subjects[0].name
            } else {
              validSubjectId = null
              validSubjectName = ""
            }
          }
        }
        
        if (session.isRunning && session.startTimestamp) {
          // Check if session is still valid (not older than 24 hours)
          const now = Date.now()
          const sessionAge = now - session.startTimestamp
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours
          
          if (sessionAge < maxAge) {
            // Restore subject selection but DON'T auto-start timer
            // User must manually click to resume
            setSelectedSubject(validSubjectName)
            setSelectedSubjectId(validSubjectId)
            
            // Show elapsed time but don't start counting
            setDisplayMilliseconds(sessionAge)
            setStartTimestamp(session.startTimestamp)
            // Keep isRunning as false - user must click to resume
          } else {
            // Session too old, save it and clear
            if (session.startTimestamp && validSubjectId) {
              // Auto-save old session before clearing
              const oldDuration = now - session.startTimestamp
              if (oldDuration >= 1000) {
                // Save in background (don't await)
                createSession({
                  subject_id: validSubjectId,
                  duration_ms: oldDuration,
                  started_at: new Date(session.startTimestamp).toISOString(),
                  ended_at: new Date(now).toISOString(),
                }).catch(err => console.error("Failed to auto-save old session:", err))
              }
            }
            localStorage.removeItem(STORAGE_KEY)
          }
        } else {
          // Not running, just restore subject selection (if valid)
          setSelectedSubject(validSubjectName)
          setSelectedSubjectId(validSubjectId)
        }
      }
    } catch (err) {
      console.error("Failed to load session from localStorage:", err)
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsHydrated(true)
  }, [subjects]) // Add subjects as dependency to re-validate when subjects load

  // Calculate elapsed time from timestamp (works even when tab is inactive)
  const calculateElapsed = (start: number | null): number => {
    if (!start) return 0
    return Date.now() - start
  }

  // Update display timer (for UI only - actual duration calculated from timestamp)
  useEffect(() => {
    if (isRunning && startTimestamp) {
      // Update immediately
      setDisplayMilliseconds(calculateElapsed(startTimestamp))
      
      // Then update every 100ms for smooth display
      intervalRef.current = setInterval(() => {
        setDisplayMilliseconds(calculateElapsed(startTimestamp))
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (!isRunning && startTimestamp) {
        // When stopped, show final elapsed time
        setDisplayMilliseconds(calculateElapsed(startTimestamp))
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startTimestamp])

  // Handle cooldown timer
  useEffect(() => {
    if (cooldownEndsAt) {
      const updateCooldown = () => {
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
        setCooldownSeconds(remaining)
        
        if (remaining <= 0) {
          setCooldownEndsAt(null)
          localStorage.removeItem("focus_tracker_cooldown")
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current)
            cooldownIntervalRef.current = null
          }
        }
      }
      
      updateCooldown() // Update immediately
      cooldownIntervalRef.current = setInterval(updateCooldown, 1000)
    } else {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
      setCooldownSeconds(0)
    }
    
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
      }
    }
  }, [cooldownEndsAt])

  // Save session state to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return
    
    if (isRunning && startTimestamp) {
      const session: StoredSession = {
        isRunning: true,
        startTimestamp,
        selectedSubjectId,
        selectedSubject,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      // Clear when not running
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [isRunning, startTimestamp, selectedSubjectId, selectedSubject, isHydrated])

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning && startTimestamp) {
        // Tab became visible - recalculate elapsed time
        setDisplayMilliseconds(calculateElapsed(startTimestamp))
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isRunning, startTimestamp])

  // Handle page unload - save session when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && startTimestamp && selectedSubjectId) {
        // Calculate actual duration
        const actualDuration = Date.now() - startTimestamp
        
        if (actualDuration >= 1000) {
          // Save session synchronously before page unloads
          const token = localStorage.getItem("access_token")
          if (token) {
            const data = {
              subject_id: selectedSubjectId,
              duration_ms: actualDuration,
              started_at: new Date(startTimestamp).toISOString(),
              ended_at: new Date().toISOString(),
            }
            
            // Use synchronous XMLHttpRequest for reliable delivery
            try {
              const xhr = new XMLHttpRequest()
              xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"}/api/sessions`, false) // false = synchronous
              xhr.setRequestHeader("Content-Type", "application/json")
              xhr.setRequestHeader("Authorization", `Bearer ${token}`)
              xhr.send(JSON.stringify(data))
              
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log("✅ Session saved on page unload")
              } else {
                console.error("❌ Failed to save session on unload:", xhr.status, xhr.responseText)
              }
            } catch (err) {
              console.error("❌ Error saving session on unload:", err)
            }
            
            // Clear localStorage
            localStorage.removeItem(STORAGE_KEY)
            
            // Set cooldown in localStorage so it persists across page reloads
            localStorage.setItem("focus_tracker_cooldown", String(Date.now() + 15000))
          }
        }
      }
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isRunning, startTimestamp, selectedSubjectId])

  // Update document title
  useEffect(() => {
    if (isRunning) {
      document.title = `🟢 ${formatTime(displayMilliseconds)} - DYESB?`
    } else if (displayMilliseconds > 0) {
      document.title = `🔴 Paused - DYESB?`
    } else {
      document.title = "DYESB? - Focus Tracker"
    }
  }, [isRunning, displayMilliseconds])

  const handleSaveSession = async () => {
    if (!startTimestamp) return
    
    // Calculate actual duration from timestamps (accurate even if tab was inactive)
    const actualDuration = Date.now() - startTimestamp
    
    // Save ALL sessions, no minimum duration
    if (actualDuration < 1000) {
      // Less than 1 second - probably an error, don't save
      return
    }
    
    if (!selectedSubjectId) {
      toast.error("Please select a subject before saving")
      return
    }

    try {
      const startedAt = new Date(startTimestamp)
      const endedAt = new Date()

      console.log("💾 Saving session:", {
        subject_id: selectedSubjectId,
        duration_ms: actualDuration,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
      })

      const result = await createSession({
        subject_id: selectedSubjectId,
        duration_ms: actualDuration,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
      })

      console.log("✅ Session saved successfully:", result)

      const seconds = Math.floor(actualDuration / 1000)
      const minutes = Math.floor(seconds / 60)
      
      if (minutes > 0) {
        toast.success(`✅ ${minutes} minute${minutes !== 1 ? 's' : ''} logged for ${selectedSubject}!`)
      } else {
        toast.success(`✅ ${seconds} second${seconds !== 1 ? 's' : ''} logged for ${selectedSubject}!`)
      }
      
      // Reset
      setDisplayMilliseconds(0)
      setStartTimestamp(null)
      setIsRunning(false)
      setShowPopup(false)
      localStorage.removeItem(STORAGE_KEY)
      
      // ALWAYS start 15-second cooldown, regardless of session duration
      const cooldownEnd = Date.now() + 15000
      setCooldownEndsAt(cooldownEnd)
      localStorage.setItem("focus_tracker_cooldown", String(cooldownEnd))
    } catch (err: any) {
      console.error("❌ Failed to save session:", err)
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      toast.error(err.message || "Failed to save session. Check console for details.")
      // ALWAYS start cooldown even if save failed
      const cooldownEnd = Date.now() + 15000
      setCooldownEndsAt(cooldownEnd)
      localStorage.setItem("focus_tracker_cooldown", String(cooldownEnd))
    }
  }

  const formatTime = (totalMilliseconds: number) => {
    const totalSeconds = Math.floor(totalMilliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const ms = Math.floor((totalMilliseconds % 1000) / 10)
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(2, "0")}`
  }

  const selectedSubjectObj = subjects.find((s) => s.name === selectedSubject)
  const subjectColor = selectedSubjectObj?.color || "#ef4444"

  useEffect(() => {
    if (showPopup && !isRunning) {
      const timer = setTimeout(() => {
        setShowPopup(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showPopup, isRunning])

  if (!isHydrated) return null

  return (
    <div
      className="fixed inset-0 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center"
      style={{
        backgroundColor: isRunning ? "#22c55e" : cooldownSeconds > 0 ? "#f59e0b" : "#ef4444",
      }}
      onClick={async () => {
        // Check cooldown
        if (cooldownSeconds > 0) {
          toast.error(`Please wait ${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''} before starting again`)
          return
        }
        
        // Don't allow starting without a subject selected
        if (!isRunning && !selectedSubjectId) {
          toast.error("Please select a subject first")
          return
        }
        
        if (!isRunning) {
          // Start tracking
          const now = Date.now()
          setIsRunning(true)
          setStartTimestamp(now)
        } else {
          // Stop tracking
          setIsRunning(false)
          setShowPopup(true)
          
          // Always save session (no minimum duration)
          await handleSaveSession()
        }
      }}
    >
      <Link href="/" className="absolute top-6 left-6">
        <Button variant="ghost" size="sm" className="gap-2 bg-white/20 hover:bg-white/30 text-white">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </Link>

      <div className="absolute top-6 right-6 max-w-xs">
        <div className="flex flex-wrap gap-2 justify-end">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={(e) => {
                e.stopPropagation()
                // If currently running, stop and save current session first
                if (isRunning && startTimestamp) {
                  const actualDuration = Date.now() - startTimestamp
                  if (actualDuration >= 60000) {
                    handleSaveSession()
                  }
                }
                setSelectedSubject(subject.name)
                setSelectedSubjectId(Number(subject.id))
                setDisplayMilliseconds(0)
                setIsRunning(false)
                setStartTimestamp(null)
                localStorage.removeItem(STORAGE_KEY)
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedSubject === subject.name
                  ? "bg-white/90 text-black shadow-lg"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
            >
              {subject.name}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-white/80 text-2xl mb-8 font-sans">Tracking: {selectedSubject}</p>
        <div className="text-8xl md:text-9xl font-bold font-sans text-white mb-8 drop-shadow-lg tabular-nums tracking-tight">
          {formatTime(displayMilliseconds)}
        </div>
        {cooldownSeconds > 0 ? (
          <p className="text-white/80 text-xl font-sans">Please wait {cooldownSeconds}s before starting again</p>
        ) : (
          <p className="text-white/80 text-xl font-sans">Click anywhere to {isRunning ? "pause" : "start"}</p>
        )}
      </div>

      {displayMilliseconds > 0 && showPopup && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-fade-out-long">
          <div
            className="backdrop-blur-sm border border-white/30 rounded-lg p-8 text-white text-center"
            style={{
              backgroundColor: isRunning ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
            }}
          >
            <p className="text-sm opacity-80 mb-2 font-sans">Session Duration</p>
            <p className="text-5xl font-bold font-sans tabular-nums">{formatTime(displayMilliseconds)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TrackerPage() {
  return (
    <ProtectedRoute>
      <TrackerPageContent />
    </ProtectedRoute>
  )
}
