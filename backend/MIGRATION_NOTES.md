# Backend API Implementation Summary

## Files Modified/Created

### Models (`app/models.py`)
- **Added `Subject` model**: User-specific subjects with name and color
- **Updated `FocusSession` model**: 
  - Changed from `subject_name` (string) to `subject_id` (FK to Subject)
  - Changed from `duration_s` to `duration_ms` (milliseconds)
  - Changed from `start_utc`/`end_utc` to `started_at`/`ended_at`
  - Added `to_dict()` method matching API contract

### Configuration (`app/config.py`)
- Added `FRONTEND_URL` config
- Updated CORS to include `http://localhost:3000`

### Authentication (`app/routes/auth.py`)
- **GET `/api/auth/google`**: OAuth redirect entry point (dev stub)
- **GET `/api/auth/google/callback`**: OAuth callback handler (dev stub)
- **POST `/api/auth/google`**: Alternative direct API endpoint (dev stub)
- Dev stub accepts `?email=...&name=...` query params or uses mock data
- Redirects to frontend with token: `http://localhost:3000/login?token=<jwt>`

### Routes Created/Updated

#### `app/routes/subjects.py` (NEW)
- **GET `/api/subjects`**: List current user's subjects
- **POST `/api/subjects`**: Create new subject
- **PATCH `/api/subjects/<id>`**: Update subject (name/color)
- **DELETE `/api/subjects/<id>`**: Delete subject (sets sessions' subject_id to null)

#### `app/routes/sessions.py` (UPDATED)
- **POST `/api/sessions`**: Create session with `duration_ms`, `subject_id`, `started_at`, `ended_at`
- **GET `/api/sessions`**: List sessions with filters (`start_date`, `end_date`, `subject_id`)
- Removed old `/rolling30` and `/year_heatmap` endpoints (moved to stats)

#### `app/routes/users.py` (UPDATED)
- **GET `/api/users/me`**: Get current user (unchanged)
- **PATCH `/api/users/me`**: Update user (now returns updated user dict)
- **GET `/api/users/<username>`**: Get user by username (public with privacy checks)
- **GET `/api/users/search?q=<query>`**: Search users by username/display_name

#### `app/routes/friends.py` (UPDATED)
- **GET `/api/friends`**: List accepted friends
- **POST `/api/friends/request`**: Send friend request
- **GET `/api/friends/requests/incoming`**: List incoming requests
- **GET `/api/friends/requests/outgoing`**: List outgoing requests
- **POST `/api/friends/accept/<id>`**: Accept request
- **DELETE `/api/friends/decline/<id>`**: Decline request
- **DELETE `/api/friends/<id>`**: Remove friend

#### `app/routes/leaderboard.py` (UPDATED)
- **GET `/api/leaderboard/global`**: Global leaderboard (public users)
- **GET `/api/leaderboard/domain`**: Domain-based leaderboard (requires JWT)
- **GET `/api/leaderboard/friends`**: Friends-only leaderboard
- All return format: `[{rank, name, username, email, email_domain, hoursPerWeek}, ...]`

#### `app/routes/stats.py` (NEW)
- **GET `/api/stats/summary`**: Summary stats (totalMinutes, streakDays, sessionsCount, weeklyHours, rank, xp)
- **GET `/api/stats/by-subject`**: Stats aggregated by subject
- **GET `/api/stats/daily`**: Daily stats for date range (default: last 30 days)
- **GET `/api/stats/weekly`**: Weekly breakdown with sessions
- **GET `/api/stats/heatmap`**: Heatmap data (default: year from Jan 1)
- All support `username` or `user_id` query params for viewing other users' stats (with privacy checks)

### App Factory (`app/__init__.py`)
- Registered `subjects_bp` and `stats_bp` blueprints
- Health check: `GET /api/ping` → `{"msg": "pong"}`

## Database Migration Steps

**IMPORTANT**: The models have changed significantly. You'll need to create a new migration:

```bash
cd backend
source .venv/bin/activate  # or venv/bin/activate

# If migrations folder doesn't exist:
flask db init

# Create migration for the changes:
flask db migrate -m "Add Subject model and update FocusSession to use subject_id and duration_ms"

# Review the migration file in migrations/versions/ to ensure it's correct

# Apply the migration:
flask db upgrade
```

**Note**: If you have existing data:
- Old `FocusSession` rows with `subject_name` will need to be migrated manually or the migration script should handle it
- Consider creating a data migration script if you have production data

## Running the Server

```bash
cd backend
source .venv/bin/activate
python manage.py
```

Server runs on `http://127.0.0.1:5000`

## API Base URL

All API endpoints are prefixed with `/api`:
- Base: `http://127.0.0.1:5000/api`

## Key Changes from Old API

1. **Sessions**: Now use `duration_ms` (milliseconds) instead of `duration_s` (seconds)
2. **Sessions**: Use `subject_id` (FK) instead of `subject_name` (string)
3. **Sessions**: Use `started_at`/`ended_at` instead of `start_utc`/`end_utc`
4. **Subjects**: New model for user-specific subjects
5. **Stats**: New comprehensive stats endpoints replacing old `/rolling30` and `/year_heatmap`
6. **Leaderboard**: Updated response format and endpoint names (`/global`, `/domain`, `/friends`)
7. **Friends**: Restructured endpoints to match frontend contract

## Testing the API

### 1. Health Check
```bash
curl http://127.0.0.1:5000/api/ping
```

### 2. Dev Auth Flow
```bash
# GET redirect flow
curl "http://127.0.0.1:5000/api/auth/google?email=test@uiuc.edu&name=Test%20User"

# POST direct flow
curl -X POST http://127.0.0.1:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"email": "test@uiuc.edu", "name": "Test User"}'
```

### 3. Protected Endpoints
Use the token from auth response in Authorization header:
```bash
curl http://127.0.0.1:5000/api/users/me \
  -H "Authorization: Bearer <token>"
```

## Next Steps

1. Run migrations as described above
2. Test the auth flow with your frontend
3. Wire up frontend API calls to match these endpoints
4. Test each endpoint individually
5. Consider adding real Google OAuth integration (replace dev stub in `auth.py`)

