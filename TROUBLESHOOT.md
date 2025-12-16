# Signup/Login Troubleshooting

## Most Common Issue: Google OAuth Redirect URI Mismatch

When you click "Sign up with Google" or "Login with Google", it redirects to Google, but Google rejects it because the redirect URI doesn't match what's configured.

## Fix: Update Google OAuth Redirect URIs

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", make sure you have:
   - https://doyouevenstudybro.com/api/auth/google/callback
   - https://www.doyouevenstudybro.com/api/auth/google/callback
4. REMOVE any old Vercel URLs (frontend-xxx-vercel.app)
5. Click SAVE

## Check Browser Console

Open browser DevTools (F12) → Console tab, and look for:
- "redirect_uri_mismatch" errors
- "Failed to fetch" errors
- Any red error messages

## Test Steps

1. Go to https://doyouevenstudybro.com/signup
2. Fill in username and display name
3. Click "Sign up with Google"
4. Check browser console for errors
5. If you see "redirect_uri_mismatch", update Google Console

## If Still Not Working

Check:
- Browser console errors (F12 → Console)
- Network tab (F12 → Network) - look for failed requests
- Make sure you're on the custom domain (not the old Vercel URL)
