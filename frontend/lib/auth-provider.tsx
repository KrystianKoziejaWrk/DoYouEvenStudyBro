"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"

interface User {
  id: number
  email: string
  display_name: string | null
  username: string
  email_domain: string
  privacy_opt_in: boolean
  timezone: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setUser(null)
      setLoading(false)
      // Redirect to login if on protected route
      const protectedRoutes = ["/dashboard", "/tracker", "/settings", "/friends", "/leaderboard"]
      if (protectedRoutes.includes(pathname)) {
        router.push("/login")
      }
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
      const res = await fetch(`${apiBase}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const userData: User = await res.json()
        setUser(userData)

        // Redirect first-time users to settings if no display_name
        // Only redirect if not already on settings or login page, and not coming from login
        if (!userData.display_name && pathname !== "/settings" && pathname !== "/login" && !pathname.includes("token")) {
          router.push("/settings")
        }
      } else if (res.status === 401 || res.status === 422) {
        // Token is invalid or expired, clear it and redirect
        localStorage.removeItem("access_token")
        setUser(null)
        const protectedRoutes = ["/dashboard", "/tracker", "/settings", "/friends", "/leaderboard"]
        if (protectedRoutes.includes(pathname)) {
          router.push("/login")
        }
      }
    } catch (err) {
      console.error("Failed to fetch user")
      // On error, clear token if on protected route
      const protectedRoutes = ["/dashboard", "/tracker", "/settings", "/friends", "/leaderboard"]
      if (protectedRoutes.includes(pathname)) {
        localStorage.removeItem("access_token")
        router.push("/login")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [pathname])

  return <AuthContext.Provider value={{ user, loading, refreshUser: fetchUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
