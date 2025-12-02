"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Zap, Loader2, Check, X } from "lucide-react"
import { signupWithGoogle, checkUsernameAvailability } from "@/lib/api"
import { Filter } from "bad-words"

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [googleName, setGoogleName] = useState<string | null>(null)
  const [googleSub, setGoogleSub] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const info = searchParams.get("info")
  
  // Initialize profanity filter
  const filter = new Filter()

  // Check for Google OAuth data in URL (from OAuth callback for new users)
  useEffect(() => {
    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const sub = searchParams.get("google_sub")
    
    if (email && typeof window !== "undefined") {
      setGoogleEmail(email)
      if (name) setGoogleName(name)
      if (sub) setGoogleSub(sub)
      // Pre-fill display name if available from Google
      if (name && !displayName) {
        setDisplayName(name)
      }
    }
    
    // Check for token (if somehow they got here with a token, redirect to dashboard)
    const token = searchParams.get("token")
    if (token && typeof window !== "undefined") {
      localStorage.setItem("access_token", token)
      router.push("/dashboard")
    }
  }, [searchParams, router, displayName])

  // Check username availability when it changes
  useEffect(() => {
    const checkUsername = async () => {
      const trimmed = username.trim().toLowerCase()
      
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
  }, [username])

  const handleGoogleSignup = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    // Validate fields
    if (!displayName.trim()) {
      setError("Display name is required")
      return
    }
    
    if (!username.trim()) {
      setError("Username is required")
      return
    }
    
    // Check for profanity in display name
    if (filter.isProfane(displayName.trim())) {
      setDisplayNameError("Display name contains inappropriate language. Please choose something else.")
      setError("Display name contains inappropriate language. Please choose something else.")
      return
    }
    
    // Check for profanity in username
    if (filter.isProfane(username.trim())) {
      setUsernameError("Username contains inappropriate language. Please choose something else.")
      setError("Username contains inappropriate language. Please choose something else.")
      return
    }
    
    if (usernameAvailable === false) {
      setError("Please choose a different username")
      return
    }
    
    if (usernameChecking || usernameAvailable === null) {
      setError("Please wait for username validation")
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      // If we already have Google email (from OAuth redirect), just complete signup
      // Otherwise, if Google OAuth is configured, redirect to Google first
      // Use same fallback strategy as login page for reliability (always available)
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "803284551348-u7jt1888te4a2vp2jhuq4p8rvcvg5302.apps.googleusercontent.com"
      
      console.log("🔍 Google Signup Debug:")
      console.log("- Client ID from env:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Found" : "NOT FOUND (using fallback)")
      console.log("- Using Client ID:", clientId ? "Found" : "ERROR")
      
      // If we already have Google email, complete signup directly
      if (googleEmail && googleSub) {
        // Complete signup with Google OAuth data
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
        const response = await fetch(`${backendUrl}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: googleEmail,
            display_name: displayName.trim(),
            username: username.trim().toLowerCase(),
            google_sub: googleSub,
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (parseErr) {
          const text = await response.text()
          console.error("Backend returned non-JSON response:", text)
          throw new Error("Signup failed. Please try again.")
        }

        if (response.ok && data.access_token) {
          localStorage.setItem("access_token", data.access_token)
          const status = data.status === "created" ? "created" : "existing"
          router.push(`/dashboard?signup_status=${status}`)
          return
        } else {
          const errorMsg = data?.error || `Signup failed (${response.status}). Please try again.`
          console.error("Signup error:", errorMsg, data)
          throw new Error(errorMsg)
        }
      }

      // Always redirect if we have a client ID (which we always do with fallback)
      if (typeof window !== "undefined" && clientId) {
        // Real Google OAuth - store signup data, then redirect to Google
        const pendingSignup = JSON.stringify({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
        })
        sessionStorage.setItem("pending_signup", pendingSignup)
        
        // Use state parameter to pass signup flag (Google preserves this)
        const state = "signup"
        const redirectUri = `${window.location.origin}/api/auth/google/callback`
        const scope = "openid email profile"
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account&state=${encodeURIComponent(state)}`
        
        console.log("🚀 Redirecting to Google OAuth for signup...")
        console.log("- Redirect URI:", redirectUri)
        window.location.href = authUrl
        return
      }

      // This should never happen with fallback, but just in case
      throw new Error("Unable to initialize Google OAuth. Please refresh the page and try again.")
    } catch (err: any) {
      console.error("Signup error:", err)
      const errorMessage = err.message || err.toString() || "Signup failed. Check console for details."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const canSignup = 
    displayName.trim().length > 0 &&
    username.trim().length >= 3 &&
    usernameAvailable === true &&
    !usernameChecking

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="w-full max-w-md p-8 bg-black border-white/10">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-black" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">Sign Up</h1>
        <p className="text-center text-gray-400 mb-2">Create your account with Google</p>
        {info === "account_not_found" && (
          <p className="text-center text-yellow-400 text-xs mb-4">
            We couldn&apos;t find an account for that Google email. Create one below to get started.
          </p>
        )}
        {googleEmail && (
          <p className="text-center text-green-400 text-xs mb-2">
            ✓ Signed in with Google: {googleEmail}
          </p>
        )}
        {googleEmail && (
          <p className="text-center text-gray-400 text-xs mb-6">
            Complete your profile below
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="Your Display Name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setDisplayNameError(null)
                setError(null)
              }}
              className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
            />
            {displayNameError && (
              <p className="text-red-400 text-xs mt-1">{displayNameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                  setUsername(val)
                }}
                className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
              />
              {username && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : usernameAvailable === true ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : usernameAvailable === false ? (
                    <X className="w-4 h-4 text-red-400" />
                  ) : null}
                </div>
              )}
            </div>
            {usernameError && (
              <p className="text-red-400 text-xs mt-1">{usernameError}</p>
            )}
            {username && usernameAvailable === true && (
              <p className="text-green-400 text-xs mt-1">✓ Username available</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              3-32 characters, letters, numbers, and underscores only
            </p>
          </div>
        </div>

        <Button
          onClick={(e) => {
            console.log("Signup button clicked!")
            handleGoogleSignup(e)
          }}
          disabled={loading || !canSignup}
          type="button"
          className="w-full mb-6 bg-white text-black hover:bg-gray-200 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing up...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </>
          )}
        </Button>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-2">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Log in
            </Link>
          </p>
          <Link href="/">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">Back to home</button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-black border-white/10">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        </Card>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  )
}
