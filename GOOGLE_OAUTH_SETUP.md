# Google OAuth Setup Guide

## Quick Setup (5 minutes)

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google+ API" 
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (dev)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Copy the **Client ID**

### 2. Frontend Setup

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 3. Backend Setup

Add to `backend/.env`:
```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 4. Install Backend Dependencies

```bash
cd backend
source venv/bin/activate
pip install google-auth requests
```

### 5. Restart Servers

Both frontend and backend need to be restarted to pick up the new env variables.

## How It Works

1. User clicks "Continue with Google"
2. Redirects to Google login
3. Google redirects back with authorization code
4. Backend exchanges code for ID token
5. Backend verifies token and creates/logs in user
6. Returns JWT token to frontend
7. User is logged in!

## Dev Mode (Without Google OAuth)

If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set, it falls back to dev stub mode:
- Uses test email `test@uiuc.edu`
- No real Google authentication
- Good for local testing

