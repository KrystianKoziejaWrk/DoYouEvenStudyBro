"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

function SignupCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      router.push("/signup?error=no_code")
      return
    }

    // Get pending signup data from sessionStorage (may be null if cleared/incognito)
    const pendingSignupJson = typeof window !== "undefined" ? sessionStorage.getItem("pending_signup") : null

    // Call backend with code and pending_signup (if available)
    const handleSignup = async () => {
      try {
        // NEXT_PUBLIC_API_URL already includes /api, so don't add it again
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
        
        // Build callback URL with optional pending_signup
        let callbackUrl = `${backendUrl}/auth/google/callback?code=${code}`
        if (pendingSignupJson) {
          callbackUrl += `&pending_signup=${encodeURIComponent(pendingSignupJson)}`
        }
        
        console.log("🔍 Signup callback - calling backend:", { hasPendingSignup: !!pendingSignupJson })
        
        const response = await fetch(callbackUrl, {
          method: "GET",
        })

        const responseClone = response.clone()
        let data
        try {
          data = await response.json()
        } catch (parseErr) {
          const text = await responseClone.text()
          console.error("Backend returned non-JSON response:", text)
          router.push(`/signup?error=${encodeURIComponent(text.substring(0, 100))}`)
          return
        }

        console.log("📊 Backend response:", { status: response.status, hasToken: !!data.access_token, hasEmail: !!data.email })

        if (response.ok && data.access_token) {
          // Success! Save token and redirect to dashboard
          localStorage.setItem("access_token", data.access_token)
          // Clear pending signup if it exists
          if (pendingSignupJson) {
            sessionStorage.removeItem("pending_signup")
          }
          // Pass along a small status so dashboard can show a toast
          const status = data.status === "created" ? "created" : "existing"
          router.push(`/dashboard?signup_status=${status}`)
        } else if (response.status === 404 && data.email) {
          // User doesn't exist and we don't have pending_signup - redirect to signup with email/name/google_sub
          // This handles the case where sessionStorage was cleared
          const signupUrl = new URL("/signup", window.location.origin)
          signupUrl.searchParams.set("email", data.email)
          if (data.name) signupUrl.searchParams.set("name", data.name)
          if (data.google_sub) signupUrl.searchParams.set("google_sub", data.google_sub)
          signupUrl.searchParams.set("info", "account_not_found")
          // Don't set error param - just info so user can complete signup
          console.log("⚠️ No pending signup data, redirecting to signup with email:", data.email)
          router.push(signupUrl.toString())
          return
        } else {
          // Error - redirect back to signup with error
          const errorMsg = data.error || `HTTP ${response.status}`
          // If we have email from backend, include it in the redirect
          const signupUrl = new URL("/signup", window.location.origin)
          signupUrl.searchParams.set("error", errorMsg)
          if (data.email) signupUrl.searchParams.set("email", data.email)
          if (data.name) signupUrl.searchParams.set("name", data.name)
          if (data.google_sub) signupUrl.searchParams.set("google_sub", data.google_sub)
          router.push(signupUrl.toString())
        }
      } catch (err: any) {
        console.error("Signup callback error:", err)
        router.push(`/signup?error=${encodeURIComponent(err.message || "callback_failed")}`)
      }
    }

    handleSignup()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
        <p className="text-white">Completing signup...</p>
      </div>
    </div>
  )
}

export default function SignupCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <SignupCallbackContent />
    </Suspense>
  )
}

