# How Authentication Works (Dev Stub Mode)

## Overview

Currently, the app uses a **dev stub** for authentication instead of real Google OAuth. This allows you to test the app without setting up Google OAuth credentials.

## How It Works

### 1. Login Flow

1. **User visits `/login`**
   - Sees a form with email and name fields
   - Note: This is NOT real Google OAuth - it's a dev stub for testing

2. **User enters email/name and clicks "Continue with Google"**
   - Frontend calls: `POST /api/auth/google`
   - Sends: `{ email: "user@uiuc.edu", name: "User Name", sub: "dev-user@uiuc.edu" }`

3. **Backend processes the request**
   - Creates or finds user by email
   - Generates a JWT token (valid for 7 days)
   - Returns: `{ access_token: "...", user: {...} }`

4. **Frontend stores token**
   - Saves `access_token` in `localStorage`
   - Redirects to `/settings` (if no display_name) or `/dashboard`

### 2. Protected Routes

Protected routes (dashboard, tracker, settings, friends, leaderboard) check for authentication:

- If no token → redirects to `/login`
- If token invalid → clears token and redirects to `/login`
- If token valid → shows the page

### 3. API Calls

All API calls to protected endpoints include the token:

```javascript
Authorization: Bearer <token>
```

The backend validates the token using Flask-JWT-Extended.

## Testing Without Real Google OAuth

**To test the app:**

1. Go to `/login`
2. Enter any email (e.g., `test@uiuc.edu`)
3. Enter a name (optional)
4. Click "Continue with Google"
5. You'll be logged in and redirected

**The backend will:**
- Create a user if they don't exist
- Generate a unique username from email
- Return a JWT token

## Adding Real Google OAuth Later

When ready for production:

1. Set up Google OAuth credentials
2. Install: `pip install google-auth requests`
3. Update `backend/app/routes/auth.py` to:
   - Verify Google ID tokens
   - Extract user info from Google
   - Keep the same JWT generation logic

The frontend will need to:
- Use Google's OAuth button
- Handle the OAuth callback
- Send the Google ID token to the backend

## Current Auth Flow Diagram

```
User → /login → Enter email/name → POST /api/auth/google
                                              ↓
                                    Backend creates/finds user
                                              ↓
                                    Returns JWT token
                                              ↓
                                    Frontend stores in localStorage
                                              ↓
                                    Redirect to /dashboard or /settings
```

## Viewing the Database

To see users, sessions, etc.:

```bash
cd backend
python view_db.py
```

Or use SQLite directly:

```bash
cd backend
sqlite3 instance/focus.db
.tables
SELECT * FROM users;
```

