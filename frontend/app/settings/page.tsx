"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Settings, Loader2, Check, LogOut } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-provider"
import { checkUsernameAvailability, getCurrentUser, updateCurrentUser } from "@/lib/api"

type PrivacySetting = "public" | "friends"

interface UserProfile {
  id: number
  email: string
  display_name: string | null
  username: string
  email_domain: string
  privacy_opt_in: boolean
  timezone: string
  username_changed_at?: string | null
}

function SettingsPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [currentUsername, setCurrentUsername] = useState("")
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null)
  const [privacy, setPrivacy] = useState<PrivacySetting>("friends")
  const [loading, setLoading] = useState(true)
  const [initialDisplayName, setInitialDisplayName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUsernameSuccess, setShowUsernameSuccess] = useState(false)
  const [showPrivacySuccess, setShowPrivacySuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/login")
        return
      }

      try {
        const user: UserProfile = await getCurrentUser()
        const displayNameValue = user.display_name || ""
        setDisplayName(displayNameValue)
        setInitialDisplayName(user.display_name || null)
        setUsername(user.username || "")
        setCurrentUsername(user.username || "")
        setEmail(user.email || "")
        setPrivacy(user.privacy_opt_in ? "public" : "friends")
          
          // Calculate rate limit remaining if username was changed recently
          if (user.username_changed_at) {
            const changedAt = new Date(user.username_changed_at)
            const now = new Date()
            const diffMs = now.getTime() - changedAt.getTime()
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
            const remainingMs = thirtyDaysMs - diffMs
            
            if (remainingMs > 0) {
              const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
              const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
              const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
              setRateLimitRemaining({ days: remainingDays, hours: remainingHours, minutes: remainingMinutes })
            } else {
              setRateLimitRemaining(null)
            }
          } else {
            setRateLimitRemaining(null)
          }
      } catch (err: any) {
        if (err.message?.includes("401") || err.message?.includes("422")) {
          // Token invalid, redirect to login
          localStorage.removeItem("access_token")
          router.push("/login")
        } else {
          setError("Failed to load user data")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  // Check username availability when it changes (like signup page)
  useEffect(() => {
    const checkUsername = async () => {
      const trimmed = username.trim().toLowerCase()
      
      // Don't check if it's the current username
      if (trimmed === currentUsername.toLowerCase()) {
        setUsernameAvailable(null)
        setUsernameError(null)
        return
      }
      
      if (!trimmed) {
        setUsernameAvailable(null)
        setUsernameError(null)
        return
      }
      
      // Validate format first
      if (trimmed.length < 3 || trimmed.length > 32) {
        setUsernameError("Username must be between 3 and 32 characters")
        setUsernameAvailable(false)
        return
      }
      
      if (!/^[a-z0-9_]+$/.test(trimmed)) {
        setUsernameError("Username can only contain letters, numbers, and underscores")
        setUsernameAvailable(false)
        return
      }
      
      setUsernameChecking(true)
      setUsernameError(null)
      
      try {
        const result = await checkUsernameAvailability(trimmed)
        setUsernameAvailable(result.available)
        if (!result.available && result.error) {
          setUsernameError(result.error)
        }
      } catch (err: any) {
        setUsernameError("Failed to check username availability")
        setUsernameAvailable(false)
      } finally {
        setUsernameChecking(false)
      }
    }
    
    // Debounce username check
    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [username, currentUsername])

  const handleSaveDisplayName = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/login")
      return
    }

    if (!displayName.trim()) {
      setError("Display name cannot be empty")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const userData = await updateCurrentUser({ display_name: displayName.trim() })
      setShowSuccess(true)
      setInitialDisplayName(userData.display_name)
      // If this was the first time setting display_name (was null/empty before), check if username is also set
      const wasFirstTime = !initialDisplayName || initialDisplayName === ""
      if (wasFirstTime && username) {
        // Both display_name and username are set, redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUsername = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    // Validate username format (matches backend: 3-32 characters)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      setUsernameError("Username must be 3-32 characters, letters, numbers, and underscores only")
      return
    }

    // Check if username is available (like signup page)
    if (usernameAvailable === false) {
      setUsernameError("Please choose a different username")
      return
    }

    if (usernameChecking || usernameAvailable === null) {
      setUsernameError("Please wait for username validation")
      return
    }

    setSavingUsername(true)
    setUsernameError(null)
    setError(null)

    try {
      await updateCurrentUser({ username: username.trim().toLowerCase() })
      setShowUsernameSuccess(true)
      setRateLimitRemaining(null) // Reset rate limit after successful change
      // If display_name is also set, redirect to dashboard (first-time setup complete)
      if (displayName && displayName.trim()) {
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setTimeout(() => setShowUsernameSuccess(false), 2000)
      }
    } catch (err: any) {
      // Handle rate limit error with time remaining
      const errorMessage = err.message || ""
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        // Try to parse rate limit info from error
        try {
          const errorData = JSON.parse(errorMessage)
          if (errorData.rate_limited && errorData.remaining) {
            setRateLimitRemaining(errorData.remaining)
            const { days, hours, minutes } = errorData.remaining
            setUsernameError(`Username can only be changed once every 30 days. Time remaining: ${days}d ${hours}h ${minutes}m`)
          } else {
            setUsernameError(errorData.error || "Failed to update username")
          }
        } catch {
          setUsernameError(errorMessage || "Failed to update username")
        }
      } else {
        setUsernameError(errorMessage || "Failed to update username")
      }
    } finally {
      setSavingUsername(false)
    }
  }

  const handleSavePrivacy = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setSavingPrivacy(true)
    setError(null)

    const privacy_opt_in = privacy === "public"

    try {
      await updateCurrentUser({ privacy_opt_in })
      setShowPrivacySuccess(true)
      setTimeout(() => setShowPrivacySuccess(false), 2000)
    } catch (err: any) {
      setError(err.message || "Failed to save privacy settings")
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("access_token")
    router.push("/")
  }

  const privacyOptions = [
    {
      value: "public" as PrivacySetting,
      label: "Public",
      description: "Visible on global and domain leaderboards, viewable to everyone",
    },
    {
      value: "friends" as PrivacySetting,
      label: "Friends Only",
      description: "Only friends can view your profile, friends leaderboard only",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">DYESB?</h1>
          </Link>

          <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            <Link href="/dashboard" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/tracker" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Web Tracker
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/friends" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Friends
            </Link>
            <Link href="/settings" className="text-sm font-medium text-white transition-colors">
              Settings
            </Link>
          </div>

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

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-white" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {error && (
          <Card className="p-4 mb-6 bg-red-500/10 border-red-500/20">
            <p className="text-red-400">{error}</p>
          </Card>
        )}

        {/* First-time user banner */}
        {!loading && (!displayName || !username) && (
          <Card className="p-4 mb-6 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-yellow-400 text-sm">
              👋 Welcome! Please set your <strong>display name</strong> and <strong>username</strong> to continue. 
              These are required to use the app.
            </p>
          </Card>
        )}

        {/* Account Info Card */}
        <Card className="p-6 mb-6 bg-black border-white/10">
          <h2 className="text-lg font-semibold text-white mb-6">Account Info</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28">Display Name:</span>
                <span className="text-white font-medium">{displayName || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28">Username:</span>
                <span className="text-white font-medium">@{username || "not_set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28">Email:</span>
                <span className="text-white font-medium">{email || "Not set"}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Profile Settings */}
        <Card className="p-6 mb-6 bg-black border-white/10">
          <h2 className="text-lg font-semibold text-white mb-6">Profile Setup</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Display Name - REQUIRED for first-time users */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Display Name <span className="text-red-400">*</span>
                  <span className="text-gray-500 ml-2 font-normal">(required - shown to others)</span>
                </label>
                <Input
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                />
                {!displayName && (
                  <p className="text-yellow-400 text-xs mt-1">You must set a display name to continue</p>
                )}
                <Button
                  onClick={handleSaveDisplayName}
                  disabled={saving || !displayName.trim()}
                  className="mt-3 bg-white text-black hover:bg-gray-200 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : showSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  {showSuccess ? "Saved! Redirecting..." : "Save Display Name"}
                </Button>
              </div>

              {/* Username - required for first-time users */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Username <span className="text-red-400">*</span>
                  <span className="text-gray-500 ml-2 font-normal">
                    (how others find you - can change once every 30 days)
                  </span>
                </label>
                {rateLimitRemaining && (
                  <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                    ⏱️ Username change available in: {rateLimitRemaining.days}d {rateLimitRemaining.hours}h {rateLimitRemaining.minutes}m
                  </div>
                )}
                <div className="relative">
                  <Input
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      setUsernameError(null)
                    }}
                    className={`bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 ${
                      usernameAvailable === true ? "border-green-500/50" : 
                      usernameAvailable === false ? "border-red-500/50" : ""
                    }`}
                  />
                  {usernameChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  {!usernameChecking && usernameAvailable === true && username.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
                {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
                {!usernameError && usernameAvailable === true && username.trim() && (
                  <p className="text-green-400 text-sm mt-1">✓ Username is available</p>
                )}
                <Button
                  onClick={handleSaveUsername}
                  disabled={savingUsername || !username.trim()}
                  className="mt-3 bg-white text-black hover:bg-gray-200 flex items-center gap-2"
                >
                  {savingUsername ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : showUsernameSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  {showUsernameSuccess ? "Saved!" : "Save Username"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6 mb-6 bg-black border-white/10">
          <h2 className="text-lg font-semibold text-white mb-6">Privacy Settings</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {privacyOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      privacy === option.value ? "border-white bg-white/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy"
                      value={option.value}
                      checked={privacy === option.value}
                      onChange={(e) => setPrivacy(e.target.value as PrivacySetting)}
                      className="w-4 h-4 mt-1 accent-white"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{option.label}</p>
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleSavePrivacy}
                disabled={savingPrivacy}
                className="mt-6 bg-white text-black hover:bg-gray-200 flex items-center gap-2"
              >
                {savingPrivacy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : showPrivacySuccess ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {showPrivacySuccess ? "Saved!" : "Save Privacy Settings"}
              </Button>
            </>
          )}
        </Card>

        {/* Sign Out Card */}
        <Card className="p-6 bg-black border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <p className="text-sm text-gray-400 mb-4">Sign out of your account on this device.</p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
