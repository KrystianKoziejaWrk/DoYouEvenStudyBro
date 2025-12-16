## DoYouEvenStudyBro (DYESB?)

Full‑stack focus tracker that lets you time study sessions, see your stats, and compare your grind with friends and the global leaderboard.

---

### Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Zustand, Tailwind/shadcn UI  
- **Backend**: Flask, SQLAlchemy, Flask‑JWT‑Extended, Flask‑Migrate  
- **Database**: SQLite locally, Postgres in production (via `DATABASE_URL`)  
- **Auth**: Google OAuth → backend issues JWT → frontend stores token and sends `Authorization: Bearer <token>` on API calls  

---

### Project Structure

- `frontend/` – Next.js app  
  - `app/` – routes (`/`, `/dashboard`, `/tracker`, `/leaderboard`, `/friends`, `/settings`, `/profile/[slug]`, etc.)  
  - `components/` – dashboard widgets, charts, navbar, calendar, reusable UI  
  - `lib/` – API client (`api.ts`), Zustand store (`store.ts`), types and utilities  
- `backend/` – Flask API  
  - `app/__init__.py` – app factory + extension and blueprint registration  
  - `app/models.py` – `User`, `Subject`, `FocusSession`, `Friend`  
  - `app/routes/` – blueprints: `auth`, `users`, `sessions`, `subjects`, `stats`, `friends`, `leaderboard`  
  - `migrations/` – Alembic migrations  

---

### Running Locally

1. **Backend**
   - `cd backend`  
   - Create and activate a virtualenv  
   - Install deps: `pip install -r requirements.txt`  
   - Set env (at minimum):  
     - `SECRET_KEY`, `JWT_SECRET_KEY`  
     - `FLASK_APP=manage.py`  
   - Initialize DB (first time): `flask db upgrade`  
   - Run server: `python manage.py` (default `http://127.0.0.1:5001`)  

2. **Frontend**
   - `cd frontend`  
   - Install deps: `pnpm install` (or `npm install`)  
   - Set env: `NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api`  
   - Run dev server: `pnpm dev` (default `http://localhost:3000`)  

---

### Key Flows

- **Signup/Login**
  - Frontend uses Google OAuth, then calls:  
    - `POST /api/auth/signup` or `POST /api/auth/login`  
  - Backend validates user and returns `{ access_token, user }`  
  - Frontend saves token to `localStorage` and all subsequent API calls go through `frontend/lib/api.ts`  

- **Sessions → Stats**
  - `/tracker` page posts focus sessions to `POST /api/sessions/`  
  - Stats endpoints under `/api/stats/*` aggregate those sessions into:  
    - Weekly hours, streak, XP, rank  
    - Subject breakdown, last‑30‑days line chart, yearly heatmap  
  - Dashboard components consume these responses and render charts and the weekly calendar  

---

### Deployment (Typical Setup)

- **Backend**: Deployed to a platform like Heroku with `DATABASE_URL` pointing to Postgres.  
- **Frontend**: Deployed on Vercel, configured with `NEXT_PUBLIC_API_URL` pointing at the backend `/api` base URL.  
- **Secrets**: All `.env` files, DB files, and virtualenvs are ignored by Git via `.gitignore` and should only live in your deployment/config vars.  

### 0.2 Auth Flow End‑to‑End

- **Google → Backend**:
  - Frontend uses Google OAuth on `/signup` and `/login` to obtain an ID token / profile data.
  - Frontend sends a JSON payload to:
    - `POST /api/auth/signup` (`backend/app/routes/auth.py`, `signup()`)
    - or `POST /api/auth/login` (`login()`)
  - These endpoints read `email`, `sub` (Google subject), `display_name`, `username` from the body.
  - For `login`, if a `credential` field (Google ID token) is present, the backend verifies it using `google.oauth2.id_token.verify_oauth2_token` and extracts user info.
- **JWT creation**:
  - After signup/login succeeds, backend calls `create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))` (from `flask_jwt_extended`).
  - The JWT is signed using `JWT_SECRET_KEY` from `backend/app/config.py`.
- **Frontend storage**:
  - `frontend/lib/api.ts`:
    - `signupWithGoogle` and `loginWithGoogle` save the returned `access_token` into `localStorage` (`access_token` key).
  - `/dashboard` also supports receiving `?token=<jwt>` in the URL (e.g. from OAuth redirect) and persists it to `localStorage` (`frontend/app/dashboard/page.tsx`).
- **Authenticated requests**:
  - `apiFetch` reads the token and adds `Authorization: Bearer <token>`.
  - Backend decorators `@jwt_required()` / `@jwt_required(optional=True)` in routes protect endpoints and extract user identity via `get_jwt_identity()` (see helpers like `get_current_user()` in each blueprint).

### 0.3 Data Flow: Stopwatch → Sessions → Stats → UI

1. **User starts/ends a focus session**:
   - On `/tracker` (`frontend/app/tracker/page.tsx`), a stopwatch runs on the client.
   - When the user stops the timer, the component builds a payload with:
     - `duration_ms`
     - `subject_id` (optional, selected from user’s subjects)
     - `started_at` / `ended_at` ISO strings in UTC.
   - This payload is sent via `createSession` from `frontend/lib/api.ts` to `POST /api/sessions/` (`backend/app/routes/sessions.py`).

2. **Backend persists session**:
   - `create_session()`:
     - Validates JSON, ensures `duration_ms` is between 30 seconds and 10 hours.
     - Parses `started_at`/`ended_at` into timezone‑aware datetimes.
     - Ensures the user has an `"All Subjects"` entry and that any non‑null `subject_id` belongs to them.
     - Creates a `FocusSession` row (`backend/app/models.py`) and commits it to the DB.

3. **Stats computation**:
   - Dashboard and profile pages call `stats` endpoints in `backend/app/routes/stats.py`:
     - `/summary` → totals, weekly hours, rank, streak, XP.
     - `/by-subject` → minutes per subject.
     - `/daily` → last 30 days (or specified range).
     - `/yearly` → heatmap‑style annual aggregation.
     - `/weekly` → weekly calendar grid data (per day, per session).

4. **UI rendering**:
   - The `Dashboard` component splits these responses and passes them down:
     - `KpiRow` (`frontend/components/kpi-row.tsx`) shows weekly hours, streak, sessions count, XP, and rank.
     - `SubjectPie` renders the by‑subject breakdown.
     - `Last30Line` renders `daily` stats as a line chart.
     - `YearHeatmap` uses `yearly` stats for the heatmap calendar.
     - `WeeklyBars` or `WeeklyCalendar` use the weekly stats grid to render bars/blocks in the calendar view.

### 0.4 Key Technology Choices

- **Next.js App Router vs Pages Router**
  - App Router (`frontend/app/*`) gives:
    - Colocation of route components, loading states, error boundaries.
    - Easier server/client component splitting.
    - Better support for Suspense (used in `dashboard/page.tsx`).
  - This fits a dashboard‑style app where each route has a clear, componentized layout.

- **Flask App Factory Pattern**
  - `backend/app/__init__.py` defines `create_app(config_class=Config)` which:
    - Creates the Flask instance.
    - Initializes extensions: `SQLAlchemy`, `JWTManager`, `Migrate`, and CORS.
    - Registers blueprints for each feature area (`auth`, `users`, `sessions`, etc.).
  - Benefits:
    - Clean separation between configuration and app instance.
    - Easier testing (you can create multiple app instances with different configs).
    - Plays well with migrations and WSGI servers.

- **SQLite now vs Postgres later**
  - `Config` in `backend/app/config.py`:
    - Uses `DATABASE_URL` if set (Heroku Postgres), with automatic conversion to `postgresql+psycopg://`.
    - Falls back to `sqlite:///focus.db` (file inside `backend/instance/`).
  - Trade‑off:
    - SQLite is zero‑config and great for local dev.
    - Postgres is used in production and can handle concurrency, indexing, and scaling.

- **JWT vs Sessions/Cookies**
  - JWT:
    - Fits well with SPA/frontend hosted separately from backend.
    - Stateless on server: each request carries its own authentication.
    - Easy to attach as Bearer token from Next.js.
  - Sessions/cookies:
    - Would require session storage and tighter coupling to domain (cookies, CSRF).
  - You can explain that for a small app with mobile/SPA clients, JWT in `Authorization` is a clean and portable approach.

- **SQLAlchemy ORM + Migrations**
  - Models live in `backend/app/models.py`, representing `User`, `Subject`, `FocusSession`, `Friend`.
  - Flask‑Migrate (Alembic) connects SQLAlchemy models to the migrations in `backend/migrations/`.
  - Benefits:
    - Declarative models with relationships.
    - Single source of truth for schema.
    - Migrations (`flask db migrate`, `flask db upgrade`) handle schema evolution over time, and make the SQLite → Postgres transition smoother.

---

## 1. Repo Tour

### 1.1 Root

- `frontend/` – Next.js app (all user‑facing UI).
- `backend/` – Flask API server, models, routes, migrations.
- `AUTH_EXPLANATION.md`, `GOOGLE_OAUTH_SETUP.md`, `GOOGLE_OAUTH_UPDATE.md`, `DOMAIN_SETUP.md`, `TROUBLESHOOT.md` – operational docs for auth and deployment.
- `.gitignore` – aggressively excludes `.env` files, DB files, `backend/instance/`, `backend/venv/`, and build artifacts to keep secrets and local state out of Git.

### 1.2 Frontend (`frontend/`)

- `app/` – Next.js App Router routes:
  - `page.tsx` – marketing / landing page.
  - `dashboard/page.tsx` – protected main analytics dashboard.
  - `tracker/page.tsx` – stopwatch / session creation.
  - `leaderboard/page.tsx` – leaderboards (global, domain, friends).
  - `friends/page.tsx` – friends list, search, requests.
  - `settings/page.tsx` – profile, timezone, privacy edit.
  - `profile/[slug]/page.tsx` – read‑only profile/dashboard for other users.
  - `login/page.tsx`, `signup/page.tsx`, `signup-callback/page.tsx` – auth flows.
  - `api/auth/google/callback/route.ts` – API route that bridges Google OAuth back to the backend.
  - `layout.tsx` – global layout, `<html>`/`<body>` shell, metadata, providers.
  - `globals.css` – global Tailwind / CSS styles.

- `components/` – React components:
  - Top‑level dashboard components:
    - `dashboard.tsx` – orchestrates data fetching and renders all dashboard widgets.
    - `top-row.tsx` – summary KPIs like weekly hours, rank, streak.
    - `weekly-bars.tsx`, `weekly-calendar.tsx` – weekly time aggregation visualizations.
    - `last-30-line.tsx` – 30‑day line chart.
    - `subject-bar.tsx`, `subject-pie.tsx` – per‑subject visualizations.
    - `year-heatmap.tsx` – yearly calendar heatmap.
  - Layout & navigation:
    - `navbar.tsx`, `sidebar.tsx`, `main-content.tsx`.
  - Leaderboard & social:
    - `leaderboard-card.tsx`, `rank-card.tsx`, `friends` UI elements embedded in `friends` route.
  - Utilities:
    - `protected-route.tsx` – checks for access token and redirects to `/login` if missing.
  - `ui/` – shadcn‑style primitive components (buttons, dialogs, tabs, tooltips, etc.).

- `lib/`:
  - `api.ts` – the main API client layer (all functions that call the Flask backend).
  - `store.ts` – Zustand store holding filters (time range, subject, timezone, scope), theme, and cached subjects.
  - `auth-provider.tsx` – wraps the app in context for auth, handles loading user / redirect logic.
  - `types.ts` – shared TypeScript types for stats responses, sessions, etc.
  - `utils.ts` – date/time formatting, color helpers, general utilities.

- `hooks/`:
  - `use-mobile.ts` – responsive behavior hook.
  - `use-toast.ts` – toast hook re‑export for UI.

- `public/`:
  - `icon.svg` – favicon / tab icon (your “DYE / SBS?” graphic).
  - Other assets, logos, placeholder images.

### 1.3 Backend (`backend/`)

- `app/__init__.py` – **app factory**:
  - Creates Flask app, loads `Config`, initializes `db`, `jwt`, `migrate`, sets up CORS, registers all blueprints.
  - Also defines a simple HTML homepage (`/`) and health check (`/api/ping`).

- `app/config.py` – configuration class:
  - Loads `.env` via `dotenv`.
  - Reads `DATABASE_URL` / `SQLALCHEMY_DATABASE_URI`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`.

- `app/models.py` – core SQLAlchemy models:
  - `User`, `Subject`, `FocusSession`, `Friend` plus a `utc_now()` helper.
  - One‑to‑many:
    - `User.sessions` ↔ `FocusSession.user`.
    - `User.subjects` ↔ `Subject.user`.
  - Friendship modeling with `Friend` table (requester/addressee/status).

- `app/routes/` – blueprints:
  - `auth.py` – signup/login via Google, username checks, OAuth callback.
  - `users.py` – get/update current user, user lookup by username, global stats.
  - `subjects.py` – CRUD for subjects per user, with special handling for `"All Subjects"`.
  - `sessions.py` – create and list focus sessions.
  - `stats.py` – analytics/statistics endpoints (summary, by-subject, daily, yearly, weekly).
  - `friends.py` – friend relationships, requests, accept/decline, removal.
  - `leaderboard.py` – global/domain/friends leaderboards.

- `migrations/` – Alembic migrations:
  - `env.py`, `script.py.mako`, and `versions/*.py` describing schema changes.

- `manage.py` – entrypoint:
  - Creates app via `create_app()` and, when run directly, starts the dev server on `PORT` or 5001.

- `instance/focus.db` – SQLite DB file (ignored by git; not pushed).

---

## 2. Backend Deep Dive (Flask)

### 2.1 App Factory Pattern

- `create_app(config_class=Config)` in `backend/app/__init__.py`:
  - Creates `app = Flask(__name__)` and configures it via `app.config.from_object(config_class)`.
  - Sets `app.url_map.strict_slashes = False` to avoid slash/no‑slash redirect issues that break CORS preflight.
  - Initializes extensions:
    - `db.init_app(app)` – SQLAlchemy ORM.
    - `jwt.init_app(app)` – JWT support.
    - `migrate.init_app(app, db)` – database migrations.
    - `CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)` – allows frontend origins.
  - Registers blueprints with URL prefixes:
    - `/api/auth`, `/api/users`, `/api/sessions`, `/api/subjects`, `/api/friends`, `/api/leaderboard`, `/api/stats`.
  - Adds JWT error handlers (`expired_token_loader`, `invalid_token_loader`, `unauthorized_loader`) to return JSON errors instead of HTML.

- **Why app factory?**
  - Avoids global mutable app state.
  - Makes testing and configuration overrides (like different DB URLs) straightforward.
  - Works nicely with WSGI servers and CLI tools (e.g., `flask db`).

### 2.2 Database Models (SQLAlchemy)

All in `backend/app/models.py`:

- **User**
  - Fields: `id`, `email`, `email_domain`, `google_sub`, `display_name`, `username`, `username_changed_at`, `timezone`, `privacy_opt_in`, `created_at`.
  - Relationships:
    - `sessions` → dynamic relationship to `FocusSession`.
    - `outgoing_friends` / `incoming_friends` → relationships to `Friend`.
  - `to_dict()` returns a safe JSON representation (no secrets).

- **Subject**
  - Fields: `id`, `user_id`, `name`, `color`, `created_at`.
  - Relationship: `user` backref to `User`.
  - `to_dict()` includes `id`, `name`, `color`, `createdAt`.
  - Each user has a special default subject `"All Subjects"` (created on signup or lazily).

- **FocusSession**
  - Fields: `id`, `user_id`, `subject_id`, `started_at`, `ended_at`, `duration_ms`.
  - Relationships: `user`, `subject`.
  - `to_dict()`:
    - Fetches subject name (or `"All Subjects"` if null).
    - Returns ISO timestamps and duration in ms.

- **Friend**
  - Fields: `id`, `requester_id`, `addressee_id`, `status`, `created_at`.
  - Relationships:
    - `requester` and `addressee` back to `User`.
  - Unique constraint (`unique_friend_pair`) prevents duplicate friend rows between the same two users.

#### Relationships and Why

- **One‑to‑many**:
  - User → FocusSession: a user has many sessions; each session belongs to a single user.
  - User → Subject: a user has many subjects.
- **Friendship modeling**:
  - Instead of a symmetric M2M table, friendships are modeled as a row with `requester_id`, `addressee_id`, and `status`:
    - Allows states like `"pending"`, `"accepted"`.
    - Makes it easy to query pending incoming/outgoing requests.

#### Migrations

- **Files**:
  - `backend/migrations/` contains Alembic configuration and versions (e.g. `83241b7d4e16_initial_schema_with_subject...py`).
- **Commands**:
  - `flask db migrate`:
    - Compares current models to the database schema.
    - Generates a new migration script under `migrations/versions/`.
  - `flask db upgrade`:
    - Applies the migration scripts to the database.
- **SQLite → Postgres**:
  - Since the schema is defined in models and migration scripts, we can:
    - Point `SQLALCHEMY_DATABASE_URI` to a Postgres database.
    - Run `flask db upgrade` to create the schema.
  - Application code (models, routes) remains unchanged.

### 2.3 Auth (JWT)

- **JWT Basics**:
  - JSON Web Tokens encode a small payload (here, the user’s `id` as `identity`) plus metadata and are signed with `JWT_SECRET_KEY`.
  - They are stateless: server doesn’t need to store sessions.

- **Creation**:
  - In `auth.signup()` and `auth.login()`:
    - `create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))`.
  - The token is returned to the frontend in JSON:
    - `{ "access_token": "<jwt>", "user": { ... } }`.

- **Usage**:
  - Frontend stores the token in `localStorage`.
  - Each authenticated request sets `Authorization: Bearer <token>`.
  - On backend, `@jwt_required()` validates the token and exposes `get_jwt_identity()`:
    - Helpers like `get_current_user()` in each blueprint load `User` via `User.query.get_or_404(int(user_id))`.

- **Security Considerations**:
  - **Pros of localStorage**:
    - Simple to implement from SPAs.
    - Easy to attach to `fetch` calls.
  - **Cons**:
    - Vulnerable to XSS: if a script runs in your origin, it can read the token.
  - **If switching to httpOnly cookies**:
    - Tokens are sent as secure, httpOnly cookies.
    - Frontend does not manually attach headers; browser sends cookies automatically.
    - Backend must support cookie locations (`JWT_TOKEN_LOCATION = ["cookies"]`) and CSRF protection.

### 2.4 API Endpoints (Blueprints)

Below is a concise description of what each endpoint does, request/response shape, and DB logic. Use it as an interview crib sheet.

#### `auth` Blueprint (`backend/app/routes/auth.py`)

- `GET /api/auth/check-username`
  - Query: `username`.
  - Validates length/characters and profanity, checks uniqueness in `User`.
  - Response: `{ available: boolean, error?: string }`.

- `POST /api/auth/signup`
  - Body: `{ email, google_sub? (or sub), name?, display_name, username }`.
  - Validations:
    - Required fields: `email`, `display_name`, `username`.
    - Username: length, character set, profanity, uniqueness.
    - Email: unique.
  - DB operations:
    - Creates `User` with `email_domain` and `google_sub`.
    - Creates default `"All Subjects"` `Subject`.
  - Response:
    - `{ access_token, user: user.to_dict() }`.

- `POST /api/auth/login`
  - Body: `{ sub?, email?, name?, credential? }`.
  - If `credential` present: verifies Google ID token with `GOOGLE_CLIENT_ID`.
  - Locates user by `google_sub` or `email`.
  - Issues new JWT as above and returns `{ access_token, user }`.

- `GET /api/auth/google/callback`
  - Handles OAuth authorization code, exchanges it for Google tokens (when configured), and redirects back to frontend with a `token` query parameter.

#### `users` Blueprint (`backend/app/routes/users.py`)

- `GET /api/users/me` (auth required)
  - Returns current user’s `to_dict()`.

- `PATCH /api/users/me` (auth required)
  - Body supports:
    - `display_name`, `timezone`, `privacy_opt_in`, `username`.
  - Validations:
    - Profanity, username uniqueness, 30‑day change window for username.
  - Commits changes and returns updated user.

- `GET /api/users/<username>` (JWT optional)
  - Public profile lookup with privacy rules:
    - If private and requester is not a friend / not authenticated → returns 404.

- `GET /api/users/search?q=<query>` (auth required)
  - Searches other users by username (case‑insensitive).
  - Returns list of `{ id, display_name, username, email_domain }`.

- `GET /api/users/count` (public)
  - Returns `{ count }`.

- `GET /api/users/stats` (public)
  - Global stats: total users and total hours/minutes across all sessions.

#### `subjects` Blueprint (`backend/app/routes/subjects.py`)

- `GET /api/subjects[?username=<username>]` (auth required)
  - If `username` present: respects privacy checks (via `stats.get_target_user`).
  - Ensures `"All Subjects"` exists for that user.
  - Returns list of `Subject.to_dict()`.

- `POST /api/subjects` (auth required)
  - Body: `{ name, color? }`.
  - Validates uniqueness of name per user.
  - Returns created subject.

- `PATCH /api/subjects/<id>` (auth required)
  - Allows updating `name`, `color`, with duplication checks and logging.

- `DELETE /api/subjects/<id>` (auth required)
  - Prevents deleting `"All Subjects"`.
  - Sets sessions referencing this subject to `subject_id = NULL` and deletes subject.

#### `sessions` Blueprint (`backend/app/routes/sessions.py`)

- `POST /api/sessions/` (auth required)
  - Body: `{ duration_ms, subject_id?, started_at?, ended_at? }`.
  - Validations:
    - `duration_ms` required, between 30s and 10h.
    - If timestamps provided: ensure valid and `ended_at > started_at`.
  - Ensures `"All Subjects"` subject exists.
  - Validates that `subject_id` belongs to current user.
  - Inserts a `FocusSession` row and returns `{ ok: true, session: session.to_dict() }`.

- `GET /api/sessions/` (auth required)
  - Query params: `start_date`, `end_date`, `subject_id`.
  - Uses `func.date(FocusSession.started_at)` to filter by date range.
  - Returns list of `session.to_dict()`, ordered by most recent first.

#### `friends` Blueprint (`backend/app/routes/friends.py`)

- `GET /api/friends/` (auth required)
  - Returns accepted friends with basic user info.

- `POST /api/friends/request` (auth required)
  - Body can identify target user via `username`, `user_id`, or `email`.
  - Prevents self‑requests and duplicates.

- `GET /api/friends/requests/incoming` / `outgoing` (auth required)
  - Returns pending requests where current user is addressee / requester.

- `POST /api/friends/accept/<id>` (auth required)
  - Only addressee can accept; updates `status` to `"accepted"`.

- `DELETE /api/friends/decline/<id>` (auth required)
  - Only addressee can decline; deletes request.

- `DELETE /api/friends/<id>` (auth required)
  - Either side of the friendship can remove it.

#### `leaderboard` Blueprint (`backend/app/routes/leaderboard.py`)

- Internal `get_leaderboard_data(user_ids=None, days=7)`:
  - Uses UTC week (Sunday–Saturday) to aggregate session durations.
  - Sums `duration_ms` per user between `week_start` and `week_end`.
  - Converts to `minutesPerWeek` and `hoursPerWeek`, sorts, and assigns rank.

- `GET /api/leaderboard/global` (JWT optional)
  - Leaderboard among public users (`privacy_opt_in=True`).

- `GET /api/leaderboard/domain` (auth required)
  - Leaderboard among public users sharing the same `email_domain` as current user.

- `GET /api/leaderboard/friends` (auth required)
  - Leaderboard among current user and all accepted friends.

#### `stats` Blueprint (`backend/app/routes/stats.py`)

Core helpers:

- `get_target_user(current_user, username=None, user_id=None)`:
  - Handles privacy / friendship checks whenever you request stats on another user.
- `compute_rank_tier(weekly_hours)`:
  - Returns `"Baus"`, `"Sherm"`, `"Squid"`, `"French Mouse"`, or `"Taus"` based on weekly hours.
- `compute_xp(total_minutes)`:
  - 1 XP per 3 minutes studied.
- `get_date_range(start_date_str=None, end_date_str=None, default_days=None)`:
  - Parses query params or defaults to current Mon–Sun week (or last X days).
- `calculate_streak(user_id, end_date=None)`:
  - Walks backward day‑by‑day and counts consecutive days with >0 minutes.

Endpoints:

- `GET /api/stats/summary`
  - Uses `get_target_user` and `get_date_range`.
  - Sums `duration_ms` across sessions in the week.
  - Returns:
    - `totalMinutes`, `streakDays`, `sessionsCount`, `weeklyHours`, `rank`, `xp`.

- `GET /api/stats/by-subject`
  - Aggregates minutes by subject, resolving colors and names, sorted by minutes.

- `GET /api/stats/daily`
  - For last 30 days (or custom range):
    - Groups by `func.date(FocusSession.started_at)`.
    - Returns an array of `{ date, minutes }`.

- `GET /api/stats/yearly`
  - Aggregates sessions for an entire year, building a heatmap‑friendly structure (date → minutes).

- `GET /api/stats/weekly`
  - Computes per‑day buckets for weekly calendar.
  - Returns day labels + sessions structured so the frontend can render a grid (your `weekly-calendar.tsx` reads this and does timezone conversions and shifting).

##### Timezone Assumptions

- Backend stores all timestamps as timezone‑aware datetimes (UTC).
- Aggregations like `leaderboard` use UTC weeks so everyone is measured consistently.
- For a fully robust timezone solution:
  - Store user timezone in `User.timezone`.
  - For daily/weekly stats, convert UTC timestamps into that timezone before grouping by date.
  - Currently, a lot of fine‑grained timezone correction is done on the frontend’s calendar.

---

## 3. Frontend Deep Dive (Next.js)

### 3.1 App Router Fundamentals

- Routes under `frontend/app/` map directly to URLs:
  - `app/dashboard/page.tsx` → `/dashboard`
  - `app/profile/[slug]/page.tsx` → `/profile/:slug`
  - `app/tracker/page.tsx` → `/tracker`
  - etc.
- Components are marked `"use client"` when they use hooks/state (`dashboard/page.tsx`, `tracker/page.tsx`, etc.).
  - Most core pages are client components because they depend on `localStorage` for JWTs and use React hooks.
- Data fetching:
  - Happens mostly on the client, inside components, using the shared `lib/api.ts` helpers.
  - `Dashboard` and its children call the stats endpoints and populate charts.

### 3.2 API Client Layer (`frontend/lib/api.ts`)

- `API_BASE`:
  - Build‑time env: `NEXT_PUBLIC_API_URL` (e.g. your Heroku backend URL).
  - Fallback: `http://127.0.0.1:5001/api` for local dev.

- `apiFetch(path, options)`:
  - Combines `API_BASE` with relative `path`.
  - Adds `Content-Type: application/json`.
  - If an access token exists, adds `Authorization: Bearer <token>`.
  - Handles HTTP errors by parsing JSON error messages and throwing `Error`.
  - Specifically logs and surfaces network errors, explaining how to troubleshoot missing backend / CORS issues.

- Higher‑level functions:
  - **Auth**: `signupWithGoogle`, `loginWithGoogle`, `checkUsernameAvailability`.
  - **Users**: `getCurrentUser`, `updateCurrentUser`, `getUserByUsername`, `getUserCount`, `getGlobalStats`, `searchUsers`.
  - **Subjects**: `getSubjects`, `createSubject`, `updateSubject`, `deleteSubject`.
  - **Sessions**: `createSession`, `getSessions`.
  - **Stats**: `getStatsSummary`, `getStatsBySubject`, `getStatsDaily`, `getStatsYearly`, `getStatsWeekly`.
  - **Friends**: `getFriends`, `getIncomingFriendRequests`, `getOutgoingFriendRequests`, `requestFriend`, `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`.
  - **Leaderboard**: `getGlobalLeaderboard`, `getDomainLeaderboard`, `getFriendsLeaderboard`.

### 3.3 State Management (Zustand – `frontend/lib/store.ts`)

- Store fields:
  - `timeRange`: `"week" | "month | "year"` – controls how far back stats should be visualized.
  - `selectedSubject`: subject ID/name filter.
  - `timezone`: current timezone (e.g. `"America/Chicago"`, `"UTC"`).
  - `scope`: `"my_data" | "friends" | "global"` – influences which leaderboard or stats to call.
  - `compareMode`, `stackBySubject`, `unitsMode`, `theme`.
  - `subjects`: array of user subjects as loaded from backend.
  - `showAllSubjects`: toggle to show combined view.

- Actions:
  - Simple setters (`setTimeRange`, `setTimezone`, etc.).
  - Subject helpers:
    - `setSubjects`, `addSubject`, `updateSubject`, `deleteSubject`, `mergeSubjects`.
  - Dashboard components subscribe to this store to stay in sync (e.g., `SubjectBar`, `SubjectPie`).

### 3.4 UI Data Wiring – Route by Route

#### `/dashboard` (`frontend/app/dashboard/page.tsx` + `components/dashboard.tsx`)

- `DashboardPage`:
  - Suspense wrapper with loading fallback.
  - Handles `token` and `signup_status` query params:
    - Saves `token` to `localStorage`.
    - Shows a toast when coming from signup.
  - Wraps `Dashboard` in `ProtectedRoute` (which checks JWT and may redirect).

- `Dashboard` component:
  - On mount:
    - Calls `getCurrentUser` to get timezone and display name.
    - Calls `getSubjects` to populate the subject list into `useFilterStore`.
    - Calls stats endpoints (summary, by‑subject, daily, yearly, weekly).
  - Renders:
    - `TopRow` – uses `summary` data to show weekly hours, streak, XP, and rank badge.
    - `WeeklyBars` / `WeeklyCalendar` – uses weekly stats for time distribution.
    - `SubjectPie` and `SubjectBar` – uses by‑subject stats.
    - `Last30Line` – uses daily stats.
    - `YearHeatmap` – uses yearly stats.

#### `/tracker` (`frontend/app/tracker/page.tsx`)

- Maintains stopwatch state (`isRunning`, `displayMilliseconds`, etc.) and selected subject.
- Uses `useFilterStore` to get the list of subjects.
- On session stop:
  - Builds session payload with `duration_ms` and UTC timestamps.
  - Calls `createSession` from `lib/api.ts`.
  - Shows success/failure toasts.
  - Optionally enforces cooldown between sessions using `cooldownEndsAt`.

#### `/leaderboard` (`frontend/app/leaderboard/page.tsx` + `components/leaderboard-card.tsx`)

- Maintains selected tab (global/domain/friends).
- For each tab, calls:
  - `getGlobalLeaderboard` / `getDomainLeaderboard` / `getFriendsLeaderboard`.
- Renders rows with:
  - Rank position, username/display name, weekly hours, domain info.
  - Your rank tier naming ties back to `compute_rank_tier` logic on backend.

#### `/friends` (`frontend/app/friends/page.tsx`)

- Uses:
  - `searchUsers` for user search.
  - Friend endpoints for pending/accepted/incoming/outgoing requests.
- UI flows:
  - Search → select user → `requestFriend`.
  - Incoming requests tab → Accept/Decline.
  - Friends tab → show accepted friends and allow removal.

#### `/settings` (`frontend/app/settings/page.tsx`)

- Fetches current user via `getCurrentUser`.
- Allows updating:
  - Display name, username (with 30‑day limit enforced by backend), timezone, privacy flag.
- On submit, calls `updateCurrentUser`.

#### `/profile/[slug]` (`frontend/app/profile/[slug]/page.tsx`)

- Reads `slug` from route (username).
- Calls:
  - `getUserByUsername(slug)` to fetch public profile (subject to privacy/friend checks).
  - Stats endpoints (`summary`, `by-subject`, `daily`, `yearly`, `weekly`) with `username` param to view someone else’s stats.
- Reuses many of the same dashboard components but in a read‑only, profile context.

---

## 4. Interview Mode

### 4.1 60‑Second Elevator Pitch

> “DoYouEvenStudyBro is a full‑stack productivity app that tracks focused study sessions and turns them into rich analytics and social competition. The frontend is a Next.js App Router app that renders dashboards, a weekly calendar, and leaderboards, while a Flask API backend stores sessions in a SQLite/Postgres database and exposes JWT‑protected REST endpoints. Users sign up with Google OAuth, the backend issues a signed JWT, and the frontend stores it in localStorage and sends it as a Bearer token on every request. From there, the backend aggregates focus sessions into weekly totals, streaks, XP, and per‑subject stats, which power the dashboard charts, year‑heatmap, and friend/global leaderboards.”

### 4.2 3‑Minute Deep Dive

> “Architecturally, the app is split into a Next.js frontend and a Flask backend. On the backend, I used the Flask app‑factory pattern (`create_app`) to keep configuration, extension initialization, and blueprint registration clean. SQLAlchemy models represent `User`, `Subject`, `FocusSession`, and `Friend`, and Flask‑Migrate manages schema changes so I can run the same code against SQLite in development and Postgres in production by just changing `DATABASE_URL`. Authentication uses Google OAuth for identity and Flask‑JWT‑Extended for sessionless auth: after Google login/signup, the backend issues a short‑lived JWT containing the user id, signed with `JWT_SECRET_KEY`.”
>
> “The frontend stores that token in `localStorage` and a central API client (`lib/api.ts`) attaches it to every request as an `Authorization: Bearer` header. That client wraps all backend endpoints—auth, users, sessions, stats, friends, leaderboard—and handles errors consistently. For state management I use Zustand: a single store tracks filters like time range, selected subject, timezone, and scope (my data vs friends vs global), and those values drive which endpoints the dashboard calls. The dashboard itself composes smaller components: a KPI row for weekly hours and streaks, charts for subjects, a 30‑day line graph, a yearly heatmap, and a weekly calendar grid. All of that is powered by a stats blueprint that aggregates focus sessions by date, subject, and week, computes XP and rank tiers, and exposes those as JSON. On top of that, I layer social features with a `Friend` model and leaderboard endpoints that compute weekly hours per user in UTC, so everyone’s rank resets consistently at the same weekly boundary.”
>
> “In terms of trade‑offs, I prioritized a simple but solid architecture: stateless JWTs keep the Flask API thin, SQLite makes local development trivial while still being compatible with Postgres and migrations for production. If this grew, I’d move heavy stats into materialized views or cached aggregates, switch token storage to httpOnly cookies for stronger XSS protection, and add background jobs and rate‑limiting to protect against abuse.”

### 4.3 Likely Interview Questions + Answers

- **Q: Why did you choose Flask + Next.js?**
  - **A:** Flask gives me a very lightweight, explicit API layer where I control routing, models, and query behavior, which is perfect for a stats‑heavy backend. Next.js App Router on the frontend gives me a modern React experience with good defaults, routing, and a path to server components when I need them. Splitting UI and API this way also makes it easy to scale or swap the frontend later and keeps the backend reusable for other clients (e.g., mobile).

- **Q: Why JWT instead of session cookies?**
  - **A:** With JWTs, the backend stays stateless: I don’t need a session table and I can horizontally scale the API without sticky sessions. The frontend is a SPA hosted separately, so attaching a Bearer token to each `fetch` call is straightforward. The trade‑off is that storing tokens in localStorage exposes them to XSS, so for a stricter security posture I’d move to httpOnly cookies and CSRF protection—but for this project JWTs keep the architecture simple and well‑suited for multiple clients.

- **Q: How do you prevent abuse, like someone spamming fake sessions?**
  - **A:** On the backend, the `create_session` endpoint enforces guardrails: it rejects sessions shorter than 30 seconds and longer than 10 hours, and verifies that timestamps are valid (`ended_at > started_at`). It also checks that the `subject_id` belongs to the current user. Beyond that, we could add rate limiting per user/IP, anomaly detection on session patterns, and potentially move long‑running sessions into a worker to avoid deliberately huge writes.

- **Q: How would you scale this system?**
  - **A:** First, I’d standardize on Postgres and add indexes on `FocusSession.user_id`, `started_at`, and `subject_id` to keep stat queries fast. Then I’d introduce a Redis cache or materialized views for heavy aggregations (weekly/yearly stats, leaderboards) so dashboards don’t recompute large ranges on every request. Background jobs (e.g., Celery or a cloud worker) could precompute weekly aggregates and XP, and I’d put both Flask and Next.js behind a load balancer with autoscaling. Since auth is stateless, scaling horizontally is straightforward.

- **Q: How do you handle timezone correctness, and how would you improve it?**
  - **A:** All timestamps are stored as timezone‑aware UTC datetimes; leaderboard and weekly windows are computed in UTC so the “week” definition is consistent for everyone. On the frontend, I convert sessions into the user’s timezone to render the weekly calendar and labels correctly. To harden this, I’d move more of the timezone logic server‑side: store user timezones in the DB, convert UTC timestamps into user time before grouping, and return pre‑bucketed per‑day/per‑week data that the frontend can render directly.

- **Q: How do you secure tokens, and what would you change for production‑grade security?**
  - **A:** Currently the token is stored in `localStorage` and sent as a Bearer header, which avoids CSRF but is vulnerable to XSS. For production hardening, I’d switch to httpOnly, Secure cookies with short‑lived access tokens and longer‑lived refresh tokens, and implement a token revocation list. I’d also lock down CORS origins, add strict Content Security Policy headers to mitigate XSS, and ensure all endpoints validate inputs and avoid leaking information through different error codes.

- **Q: How do you model friendships and why?**
  - **A:** I use a `Friend` table with `requester_id`, `addressee_id`, `status`, and a unique constraint on the pair. That gives me a clear life‑cycle: a row starts as `"pending"` when one user sends a request, and switches to `"accepted"` when the other accepts. It’s easy to query incoming vs outgoing requests and to enforce one row per pair, which is cleaner than a symmetric join table for this use case.

---

## 5. Improvements & Tradeoffs

- **SQLite → Postgres**
  - Postgres gives stronger guarantees and better performance under concurrency. Migrations and the `DATABASE_URL` config make this a drop‑in change; I’d also add proper indexes and tune connection pooling.

- **Adding Indexes**
  - I’d add indexes on `FocusSession.user_id`, `FocusSession.started_at`, and `FocusSession.subject_id`, plus on `Friend.requester_id/addressee_id` and `User.username/email_domain` to keep leaderboards, stats, and lookups fast as data grows.

- **Rate Limiting**
  - Per‑IP and per‑user rate limits on auth and session‑creation endpoints would prevent abuse and accidental overload (e.g., someone hammering the stopwatch API).

- **Materialized Views / Caching for Heavy Stats**
  - Leaderboards and yearly stats can be precomputed into materialized views or cached in Redis and invalidated on new sessions. That turns expensive aggregations into cheap reads.

- **Background Jobs for Weekly Aggregates**
  - A scheduled job could roll up each user’s weekly totals, XP, and streaks nightly, so dashboard loads are O(1) instead of scanning all sessions every time.

- **httpOnly Cookies for JWTs**
  - Moving tokens to httpOnly, Secure cookies plus CSRF protection would significantly reduce XSS token theft risk and align with best practices for web auth.

- **Testing, API Schema, CI/CD**
  - I’d add pytest suites for routes and stats logic, generate an OpenAPI/Swagger spec for the API, and wire CI to run tests + linting on every push. That would catch regressions in the analytics logic and give external clients a typed contract to integrate against.

Use this README as your script: each section maps directly to specific files (`auth.py`, `stats.py`, `api.ts`, `store.ts`, etc.) so you can drill down to exact lines when answering interview questions. 


