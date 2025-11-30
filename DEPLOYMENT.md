# Deployment Guide for DoYouEvenStudyBro

## Overview
This app has two parts:
- **Backend**: Flask API (deploy to Heroku)
- **Frontend**: Next.js (deploy to Vercel - recommended, or Heroku)

## Backend Deployment to Heroku

### Prerequisites
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Install Heroku Postgres addon (free tier available)

### Steps

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create Heroku app:**
   ```bash
   heroku create your-app-name-backend
   ```

3. **Add PostgreSQL database:**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```
   (This automatically sets `DATABASE_URL` environment variable)

4. **Set environment variables:**
   ```bash
   heroku config:set SECRET_KEY="your-secret-key-here"
   heroku config:set JWT_SECRET_KEY="your-jwt-secret-key-here"
   heroku config:set FRONTEND_URL="https://your-frontend-url.vercel.app"
   heroku config:set CORS_ORIGINS="https://your-frontend-url.vercel.app,http://localhost:3000"
   heroku config:set GOOGLE_CLIENT_ID="your-google-client-id"
   ```

5. **Run database migrations:**
   ```bash
   heroku run flask db upgrade
   ```

6. **Deploy:**
   ```bash
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku main
   ```
   (If your default branch is `master`, use `git push heroku master`)

7. **Check if it's running:**
   ```bash
   heroku open
   ```
   Visit: `https://your-app-name-backend.herokuapp.com/api/ping`

### Backend URL
Your backend will be at: `https://your-app-name-backend.herokuapp.com`

---

## Frontend Deployment to Vercel (Recommended)

### Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Or use the web interface: https://vercel.com

### Steps

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create `.env.local` file:**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-app-name-backend.herokuapp.com/api
   ```

3. **Deploy via CLI:**
   ```bash
   vercel
   ```
   Follow the prompts. When asked about environment variables, add:
   - `NEXT_PUBLIC_API_URL` = `https://your-app-name-backend.herokuapp.com/api`

4. **Or deploy via GitHub:**
   - Push your code to GitHub
   - Go to https://vercel.com
   - Import your repository
   - Add environment variable: `NEXT_PUBLIC_API_URL`
   - Deploy!

### Frontend URL
Your frontend will be at: `https://your-app-name.vercel.app`

---

## Frontend Deployment to Heroku (Alternative)

If you prefer to deploy frontend to Heroku:

1. **Create `frontend/Procfile`:**
   ```
   web: npm run start
   ```

2. **Update `frontend/package.json` scripts:**
   ```json
   "scripts": {
     "build": "next build",
     "start": "next start -p $PORT"
   }
   ```

3. **Create Heroku app:**
   ```bash
   cd frontend
   heroku create your-app-name-frontend
   ```

4. **Set environment variable:**
   ```bash
   heroku config:set NEXT_PUBLIC_API_URL=https://your-app-name-backend.herokuapp.com/api
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

---

## Post-Deployment Checklist

1. ✅ Update CORS_ORIGINS in backend to include your frontend URL
2. ✅ Update FRONTEND_URL in backend to your frontend URL
3. ✅ Set NEXT_PUBLIC_API_URL in frontend to your backend URL
4. ✅ Run database migrations on Heroku
5. ✅ Test the API endpoint: `https://your-backend.herokuapp.com/api/ping`
6. ✅ Test frontend can connect to backend

---

## Troubleshooting

### Backend Issues:
- **Database errors**: Make sure migrations ran: `heroku run flask db upgrade`
- **CORS errors**: Check CORS_ORIGINS includes your frontend URL
- **500 errors**: Check logs: `heroku logs --tail`

### Frontend Issues:
- **API connection errors**: Verify NEXT_PUBLIC_API_URL is set correctly
- **Build errors**: Check `vercel logs` or Heroku logs

### View Logs:
- **Heroku**: `heroku logs --tail`
- **Vercel**: Dashboard → Your Project → Logs

---

## Environment Variables Summary

### Backend (Heroku):
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `DATABASE_URL` - Auto-set by Heroku Postgres
- `FRONTEND_URL` - Your frontend URL
- `CORS_ORIGINS` - Comma-separated list of allowed origins
- `GOOGLE_CLIENT_ID` - Google OAuth client ID

### Frontend (Vercel/Heroku):
- `NEXT_PUBLIC_API_URL` - Your backend API URL

---

## Quick Deploy Commands

```bash
# Backend
cd backend
heroku create your-app-backend
heroku addons:create heroku-postgresql:mini
heroku config:set SECRET_KEY="$(openssl rand -hex 32)"
heroku config:set JWT_SECRET_KEY="$(openssl rand -hex 32)"
heroku config:set FRONTEND_URL="https://your-frontend.vercel.app"
heroku config:set CORS_ORIGINS="https://your-frontend.vercel.app"
heroku run flask db upgrade
git push heroku main

# Frontend (Vercel)
cd frontend
vercel
# Add NEXT_PUBLIC_API_URL when prompted
```

