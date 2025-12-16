## DoYouEvenStudyBro (DYESB?)

Full‑stack focus tracker that lets you time study sessions, see your stats, and compare your grind with friends and the global leaderboard.

---

### Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Zustand, Tailwind/shadcn UI  
- **Backend**: Flask, SQLAlchemy, Flask‑JWT‑Extended, Flask‑Migrate  
- **Database**: SQLite locally, Postgres in production (via `DATABASE_URL`)  
- **Auth**: Google OAuth with JWTs for API auth  

---

### Project Structure

- `frontend/` – Next.js app  
  - `app/` – routes (`/`, `/dashboard`, `/tracker`, `/leaderboard`, `/friends`, `/settings`, `/profile/[slug]`, etc.)  
  - `components/` – dashboard widgets, charts, navbar, calendar, reusable UI  
  - `lib/` – API client (`api.ts`), Zustand store (`store.ts`), shared types and utilities  
- `backend/` – Flask API  
  - `app/__init__.py` – app factory + extension and blueprint registration  
  - `app/models.py` – `User`, `Subject`, `FocusSession`, `Friend`  
  - `app/routes/` – blueprints: `auth`, `users`, `sessions`, `subjects`, `stats`, `friends`, `leaderboard`  
  - `migrations/` – Alembic migrations  

---

### Getting Started

#### Backend

1. `cd backend`  
2. Create and activate a virtualenv  
3. Install deps: `pip install -r requirements.txt`  
4. Set env vars (at minimum):  
   - `SECRET_KEY`  
   - `JWT_SECRET_KEY`  
   - `FLASK_APP=manage.py`  
5. Initialize DB (first time): `flask db upgrade`  
6. Run server: `python manage.py` (defaults to `http://127.0.0.1:5001`)  

#### Frontend

1. `cd frontend`  
2. Install deps: `pnpm install` (or `npm install`)  
3. Create `.env.local` with:  
   - `NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api`  
4. Run dev server: `pnpm dev` (defaults to `http://localhost:3000`)  

---

### Deployment Notes

- **Backend**: typically deployed to a platform like Heroku with `DATABASE_URL` pointing to Postgres.  
- **Frontend**: typically deployed to Vercel with `NEXT_PUBLIC_API_URL` set to the backend `/api` base URL.  
- **Secrets**: `.env` files, DB files, and virtualenvs are ignored by Git via `.gitignore` and should only live in environment/config vars.  


