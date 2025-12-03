// API client for backend communication
import type { DailyStats } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"

// Get access token from localStorage (browser-safe)
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

// Generic API fetch helper
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    console.log(`📡 Making request to: ${API_BASE}${path}`)
    
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    console.log(`📥 Response status: ${response.status} for ${path}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }))
      console.error(`❌ API Error (${response.status}) for ${path}:`, error)
      const errorMessage = error.error || error.message || `HTTP ${response.status}`
      console.error(`   Full error details:`, { path, status: response.status, error })
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (err: any) {
    // Handle network errors
    const isNetworkError = 
      err instanceof TypeError || 
      err.name === 'TypeError' || 
      err.message?.includes("fetch") || 
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("NetworkError") ||
      err.message?.includes("Network request failed")
    
    if (isNetworkError) {
      console.error(`❌ Network Error: Failed to connect to ${API_BASE}${path}`)
      console.error("Error details:", err)
      console.error("Full URL attempted:", `${API_BASE}${path}`)
      console.error("API_BASE value:", API_BASE)
      console.error("🔧 Troubleshooting:")
      console.error("1. Check if backend is running: curl https://doyouevenstudybro-9e34cda89f7f.herokuapp.com/api/ping")
      console.error("2. Check CORS configuration in backend")
      console.error("3. Check browser console for CORS errors")
      console.error("4. Verify NEXT_PUBLIC_API_URL env var is set correctly")
      
      throw new Error(`Cannot connect to backend at ${API_BASE}${path}. Check console for details.`)
    }
    
    // Re-throw other errors
    throw err
  }
}

// Auth API
export async function checkUsernameAvailability(username: string) {
  try {
    console.log(`🔍 Checking username availability: ${username}, API_BASE: ${API_BASE}`)
    const response = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }))
      console.error(`❌ Username check failed (${response.status}):`, error)
      return { available: false, error: error.error || error.message || "Failed to check username" }
    }

    const result = await response.json()
    console.log(`✅ Username check result:`, result)
    return result
  } catch (err: any) {
    console.error("checkUsernameAvailability error:", err)
    // Return a result object instead of throwing
    return { 
      available: false, 
      error: err.message || "Network error. Please check your connection." 
    }
  }
}

export async function signupWithGoogle(data: { 
  sub?: string
  email: string
  name?: string
  display_name: string
  username: string
}) {
  console.log("Calling signupWithGoogle with:", data)
  
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response:", errorText)
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log("Signup successful, result:", result)
    
    if (result.access_token && typeof window !== "undefined") {
      localStorage.setItem("access_token", result.access_token)
      console.log("Token saved to localStorage")
    }
    
    return result
  } catch (err) {
    console.error("signupWithGoogle error:", err)
    throw err
  }
}

export async function loginWithGoogle(data: { sub?: string; email?: string; name?: string; credential?: string }) {
  console.log("Calling loginWithGoogle with:", data)
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response:", errorText)
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log("Login successful, result:", result)
    
    if (result.access_token && typeof window !== "undefined") {
      localStorage.setItem("access_token", result.access_token)
      console.log("Token saved to localStorage")
    }
    
    return result
  } catch (err) {
    console.error("loginWithGoogle error:", err)
    throw err
  }
}

// User API
export async function getCurrentUser() {
  return apiFetch("/users/me")
}

export async function updateCurrentUser(patch: {
  display_name?: string
  username?: string
  privacy_opt_in?: boolean
  timezone?: string
}) {
  return apiFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function getUserByUsername(username: string) {
  // URL encode the username to handle special characters
  return apiFetch(`/users/${encodeURIComponent(username)}`)
}

export async function getUserCount() {
  // This endpoint doesn't require auth, so we'll fetch directly
  const response = await fetch(`${API_BASE}/users/count`)
  if (!response.ok) {
    return { count: 0 } // Fallback to 0 if request fails
  }
  return response.json()
}

export async function searchUsers(query: string) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`)
}

// Subjects API
export async function getSubjects(username?: string) {
  const query = username ? `?username=${encodeURIComponent(username)}` : ""
  return apiFetch(`/subjects${query}`)
}

export async function createSubject(data: { name: string; color?: string }) {
  return apiFetch("/subjects", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateSubject(id: number, data: { name?: string; color?: string }) {
  return apiFetch(`/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteSubject(id: number) {
  return apiFetch(`/subjects/${id}`, {
    method: "DELETE",
  })
}

// Sessions API
export async function createSession(data: {
  subject_id?: number | null
  duration_ms: number
  started_at: string
  ended_at: string
}) {
  return apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getSessions(params?: {
  start_date?: string
  end_date?: string
  subject_id?: number
}) {
  const query = new URLSearchParams()
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.end_date) query.append("end_date", params.end_date)
  if (params?.subject_id !== undefined) query.append("subject_id", String(params.subject_id))
  
  const queryString = query.toString()
  return apiFetch(`/sessions${queryString ? `?${queryString}` : ""}`)
}

// Stats API
export async function getStatsSummary(params?: { username?: string; start_date?: string; end_date?: string; subject_id?: number }) {
  const query = new URLSearchParams()
  if (params?.username) query.append("username", params.username)
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.end_date) query.append("end_date", params.end_date)
  if (params?.subject_id !== undefined) query.append("subject_id", String(params.subject_id))
  
  const queryString = query.toString()
  return apiFetch(`/stats/summary${queryString ? `?${queryString}` : ""}`)
}

export async function getStatsBySubject(params?: { username?: string; start_date?: string; end_date?: string; subject_id?: number }) {
  const query = new URLSearchParams()
  if (params?.username) query.append("username", params.username)
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.end_date) query.append("end_date", params.end_date)
  if (params?.subject_id !== undefined) query.append("subject_id", String(params.subject_id))
  
  const queryString = query.toString()
  return apiFetch(`/stats/by-subject${queryString ? `?${queryString}` : ""}`)
}

export async function getStatsDaily(params?: { username?: string; start_date?: string; end_date?: string; subject_id?: number | null }) {
  const query = new URLSearchParams()
  if (params?.username) query.append("username", params.username)
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.end_date) query.append("end_date", params.end_date)
  if (params?.subject_id !== undefined && params?.subject_id !== null) query.append("subject_id", String(params.subject_id))
  
  const queryString = query.toString()
  return apiFetch(`/stats/daily${queryString ? `?${queryString}` : ""}`)
}

export async function getStatsWeekly(params?: { username?: string; start_date?: string; subject_id?: number }) {
  const query = new URLSearchParams()
  if (params?.username) query.append("username", params.username)
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.subject_id !== undefined) query.append("subject_id", String(params.subject_id))
  
  const queryString = query.toString()
  return apiFetch(`/stats/weekly${queryString ? `?${queryString}` : ""}`)
}

// Helper function to fetch weekly data and transform it to DailyStats format
export async function fetchWeekly(startDate: string, timezone: string): Promise<DailyStats[]> {
  // Calculate end date (7 days from start)
  const start = new Date(startDate + "T00:00:00Z")
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  
  const weekData = await getStatsWeekly({ start_date: startDate })
  
  // Transform weekly data to DailyStats format
  if (weekData && weekData.days && Array.isArray(weekData.days)) {
    return weekData.days.map((day: any) => {
      const bySubject: Record<string, number> = {}
      
      // Process sessions to group by subject
      if (day.sessions && Array.isArray(day.sessions)) {
        day.sessions.forEach((session: any) => {
          const subjectName = session.subject || "All Subjects"
          const minutes = session.durationMinutes || 0
          bySubject[subjectName] = (bySubject[subjectName] || 0) + minutes
        })
      }
      
      return {
        date: day.date,
        minutes: day.totalMinutes || 0,
        bySubject
      }
    })
  }
  
  // Fallback: return empty array with 7 days
  const days: DailyStats[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    days.push({
      date: date.toISOString().split("T")[0],
      minutes: 0,
      bySubject: {}
    })
  }
  return days
}

export async function getStatsHeatmap(params?: { username?: string; start_date?: string; end_date?: string }) {
  const query = new URLSearchParams()
  if (params?.username) query.append("username", params.username)
  if (params?.start_date) query.append("start_date", params.start_date)
  if (params?.end_date) query.append("end_date", params.end_date)
  
  const queryString = query.toString()
  return apiFetch(`/stats/heatmap${queryString ? `?${queryString}` : ""}`)
}

// Friends API
export async function getFriends() {
  return apiFetch("/friends")
}

export async function sendFriendRequest(username: string) {
  return apiFetch("/friends/request", {
    method: "POST",
    body: JSON.stringify({ username }),
  })
}

export async function getIncomingRequests() {
  return apiFetch("/friends/requests/incoming")
}

export async function getOutgoingRequests() {
  return apiFetch("/friends/requests/outgoing")
}

export async function acceptFriendRequest(id: number) {
  return apiFetch(`/friends/accept/${id}`, {
    method: "POST",
  })
}

export async function declineFriendRequest(id: number) {
  return apiFetch(`/friends/decline/${id}`, {
    method: "DELETE",
  })
}

export async function removeFriend(id: number) {
  return apiFetch(`/friends/${id}`, {
    method: "DELETE",
  })
}

// Leaderboard API
export async function getLeaderboardGlobal(days: number = 7) {
  return apiFetch(`/leaderboard/global?days=${days}`)
}

export async function getLeaderboardDomain(days: number = 7) {
  return apiFetch(`/leaderboard/domain?days=${days}`)
}

export async function getLeaderboardFriends(days: number = 7) {
  return apiFetch(`/leaderboard/friends?days=${days}`)
}
