"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Zap, Loader2 } from "lucide-react"
import { loginWithGoogle, getCurrentUser } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error in URL params
  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  // Check for token in URL (from OAuth callback)
  useEffect(() => {
    const token = searchParams.get("token")
    if (token && typeof window !== "undefined") {
      // Token is already URL-decoded by Next.js, but ensure it's clean
      const cleanToken = decodeURIComponent(token)
      console.log("🔑 Saving token from URL:", cleanToken.substring(0, 20) + "...")
      localStorage.setItem("access_token", cleanToken)
      checkUserAndRedirect()
    }
  }, [searchParams, router])

  const checkUserAndRedirect = async () => {
    try {
      const user = await getCurrentUser()
      // Always redirect to dashboard after successful login
      // If user needs to set display_name, they'll be redirected from dashboard
      window.location.replace("/dashboard")
    } catch (err) {
      console.error("Failed to get user after login:", err)
      // If token is invalid, clear it and stay on login
      localStorage.removeItem("access_token")
      setError("Failed to authenticate. Please try again.")
    }
  }

  const handleGoogleLogin = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    setLoading(true)
    setError(null)

    try {
      // Get client ID - hardcoded fallback for reliability
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "803284551348-u7jt1888te4a2vp2jhuq4p8rvcvg5302.apps.googleusercontent.com"
      
      console.log("🔍 Google Login Debug:")
      console.log("- Client ID from env:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Found" : "NOT FOUND")
      console.log("- Using Client ID:", clientId)
      
      if (clientId && typeof window !== "undefined") {
        // Real Google OAuth - redirect to Google
        const redirectUri = `${window.location.origin}/api/auth/google/callback`
        const scope = "openid email profile"
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`
        
        console.log("🚀 Redirecting to Google OAuth")
        console.log("- Redirect URI:", redirectUri)
        console.log("- Full URL (first 100 chars):", authUrl.substring(0, 100))
        
        // Use window.location.href for redirect
        window.location.href = authUrl
        // Don't set loading to false - we're redirecting
        return
      }
      
      console.log("❌ No Google Client ID found, using dev stub")

      // Fallback: Dev stub (for testing without Google OAuth)
      const testEmail = "test@uiuc.edu"
      console.log("Logging in with Google (dev stub):", { email: testEmail })
      
      const result = await loginWithGoogle({
        email: testEmail,
        sub: `dev-${testEmail}`,
      })

      console.log("Login result:", result)

      if (result && result.access_token) {
        console.log("Login successful! Token saved. Redirecting to dashboard...")
        setTimeout(() => {
          window.location.replace("/dashboard")
        }, 200)
      } else {
        throw new Error("No access token received")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      const errorMessage = err.message || err.toString() || "Login failed. Check console for details."
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="w-full max-w-md p-8 bg-black border-white/10">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-black" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">DYESB?</h1>
        <p className="text-center text-gray-400 mb-8">Get started with your focus journey</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {searchParams.get("error") && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {searchParams.get("error")}
          </div>
        )}

        <Button
          onClick={(e) => {
            console.log("Continue with Google button clicked!")
            handleGoogleLogin(e)
          }}
          disabled={loading}
          type="button"
          className="w-full mb-4 bg-white text-black hover:bg-gray-200 border border-white/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
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
          Continue with Google
            </>
          )}
        </Button>

        <div className="mt-6 text-center">
          <Link href="/signup" className="text-sm text-gray-400 hover:text-white transition-colors underline">
            Don't have an account? Sign up here
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link href="/">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">Back to home</button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
