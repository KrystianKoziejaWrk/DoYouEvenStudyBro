import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state") // "signup" if coming from signup page

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  // Exchange code for token via backend
  try {
    // NEXT_PUBLIC_API_URL already includes /api, so don't add it again
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
    
    // If state is "signup", we need to get pending_signup from sessionStorage
    // But we're in a server component, so we'll pass state to backend and handle it there
    // Actually, we need to redirect to a client page that can read sessionStorage
    if (state === "signup") {
      // Redirect to a client page that will read sessionStorage and call backend
      const signupCallbackUrl = new URL("/signup-callback", request.url)
      signupCallbackUrl.searchParams.set("code", code)
      return NextResponse.redirect(signupCallbackUrl)
    }
    
    // Regular login flow (no signup)
    const callbackUrl = `${backendUrl}/auth/google/callback?code=${code}`
    
    const response = await fetch(callbackUrl, {
      method: "GET",
    })

    // Clone response to avoid "Body has already been read" error
    const responseClone = response.clone()
    let data
    try {
      data = await response.json()
    } catch (parseErr) {
      // If JSON parse fails, try text
      const text = await responseClone.text()
      console.error("Backend returned non-JSON response:", text)
      return NextResponse.redirect(new URL(`/login?error=backend_error&details=${encodeURIComponent(text.substring(0, 100))}`, request.url))
    }
    
    console.log("Backend response:", { status: response.status, data })
    
    if (response.ok && data.access_token) {
      // Success! User is logged in
      // Redirect directly to dashboard with token
      const encodedToken = encodeURIComponent(data.access_token)
      return NextResponse.redirect(new URL(`/dashboard?token=${encodedToken}`, request.url))
    } else if (response.status === 404 && data.email) {
      // User doesn't exist - redirect to signup page
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
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url))
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback_failed", request.url))
}
