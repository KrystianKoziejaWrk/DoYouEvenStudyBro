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

    // Get pending signup data from sessionStorage
    const pendingSignupJson = typeof window !== "undefined" ? sessionStorage.getItem("pending_signup") : null
    
    if (!pendingSignupJson) {
      router.push("/signup?error=no_signup_data")
      return
    }

    // Call backend with code and pending_signup
    const handleSignup = async () => {
      try {
        // NEXT_PUBLIC_API_URL already includes /api, so don't add it again
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
        const callbackUrl = `${backendUrl}/auth/google/callback?code=${code}&pending_signup=${encodeURIComponent(pendingSignupJson)}`
        
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

        if (response.ok && data.access_token) {
          // Success! Save token and redirect to dashboard
          localStorage.setItem("access_token", data.access_token)
          // Clear pending signup
          sessionStorage.removeItem("pending_signup")
          router.push("/dashboard")
        } else {
          // Error - redirect back to signup with error
          const errorMsg = data.error || `HTTP ${response.status}`
          router.push(`/signup?error=${encodeURIComponent(errorMsg)}`)
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

