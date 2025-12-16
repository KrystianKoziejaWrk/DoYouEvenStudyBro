"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Dashboard from "@/components/dashboard"
import { ProtectedRoute } from "@/components/protected-route"
import { useToast } from "@/components/ui/use-toast"

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Handle token from OAuth callback
  useEffect(() => {
    const token = searchParams.get("token")
    if (token && typeof window !== "undefined") {
      const cleanToken = decodeURIComponent(token)
      console.log("🔑 Saving token from OAuth callback")
      localStorage.setItem("access_token", cleanToken)
      // Remove token from URL to clean it up
      window.history.replaceState({}, "", "/dashboard")
    }
  }, [searchParams])

  // Show a small popup when arriving from signup flow
  useEffect(() => {
    const status = searchParams.get("signup_status")
    if (!status) return

    if (status === "created") {
      toast({
        title: "Account created",
        description: "You’re all set. Welcome to DoYouEvenStudyBro.",
      })
    } else if (status === "existing") {
      toast({
        title: "You’re already registered",
        description: "We found your existing account and logged you in.",
      })
    }

    // Clean the URL so the toast doesn't repeat on refresh
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("signup_status")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, toast])

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black text-white items-center justify-center">
          <div className="animate-spin">Loading...</div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}
