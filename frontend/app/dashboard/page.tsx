"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Dashboard from "@/components/dashboard"
import { ProtectedRoute } from "@/components/protected-route"

function DashboardPageContent() {
  const searchParams = useSearchParams()

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

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-black text-white items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  )
}
