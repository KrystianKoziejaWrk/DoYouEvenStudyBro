import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  // Exchange code for token via backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
    const response = await fetch(`${backendUrl}/api/auth/google/callback?code=${code}`, {
      method: "GET",
    })

    let data
    try {
      data = await response.json()
    } catch (parseErr) {
      const text = await response.text()
      console.error("Backend returned non-JSON response:", text)
      return NextResponse.redirect(new URL(`/login?error=backend_error&details=${encodeURIComponent(text.substring(0, 100))}`, request.url))
    }
    
    console.log("Backend response:", { status: response.status, data })
    
    if (response.ok && data.access_token) {
      // Regular login - redirect directly to dashboard with token
      // The login page will handle saving the token and redirecting
      // URL-encode the token to handle special characters
      const encodedToken = encodeURIComponent(data.access_token)
      return NextResponse.redirect(new URL(`/login?token=${encodedToken}`, request.url))
    } else if (response.status === 404 && data.email) {
      // User doesn't exist - redirect to signup with Google info
      const signupUrl = new URL(`/signup`, request.url)
      signupUrl.searchParams.set("email", data.email)
      if (data.name) signupUrl.searchParams.set("name", data.name)
      if (data.google_sub) signupUrl.searchParams.set("google_sub", data.google_sub)
      return NextResponse.redirect(signupUrl)
    } else {
      // Backend returned an error - show it
      const errorMsg = data.error || data.details || `HTTP ${response.status}`
      console.error("Backend OAuth error:", errorMsg)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url))
    }
  } catch (err) {
    console.error("OAuth callback error:", err)
    // Log more details for debugging
    if (err instanceof Error) {
      console.error("Error details:", err.message, err.stack)
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback_failed", request.url))
}
