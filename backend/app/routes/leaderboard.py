from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import func
from app import db
from app.models import User, FocusSession, Friend

leaderboard_bp = Blueprint("leaderboard", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

def compute_rank_tier(weekly_hours):
    """Compute rank tier based on weekly hours."""
    if weekly_hours < 5:
        return "Baus"
    elif weekly_hours < 10:
        return "Sherm"
    elif weekly_hours < 20:
        return "Squid"
    elif weekly_hours < 30:
        return "French Mouse"
    else:
        return "Taus"

def get_leaderboard_data(user_ids=None, days=7):
    """
    Common aggregation function for leaderboards.
    Returns list of user stats sorted by weeklyHours descending.
    Includes users with 0 hours.
    Uses Monday-to-Sunday week (matching dashboard).
    """
    # Calculate current week in UTC (Sunday to Saturday)
    # Use UTC to ensure everyone is on the same timezone basis
    today_utc = datetime.now(timezone.utc).date()
    days_since_sunday = (today_utc.weekday() + 1) % 7  # Sunday -> 0
    week_start = today_utc - timedelta(days=days_since_sunday)
    week_end = week_start + timedelta(days=6)
    
    print(f"📊 Leaderboard query: {len(user_ids) if user_ids else 'all'} users, week {week_start} to {week_end} (UTC)")
    
    # First, get all users (or filtered users)
    if user_ids:
        all_users = User.query.filter(User.id.in_(user_ids)).all()
    else:
        all_users = User.query.all()
    
    # Get session totals for each user
    # Use UTC datetime for comparison (sessions are stored in UTC)
    user_totals = {}
    if all_users:
        # Use UTC timezone for start and end of day
        start_dt = datetime.combine(week_start, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = datetime.combine(week_end, datetime.max.time(), tzinfo=timezone.utc)
        
        results = db.session.query(
            FocusSession.user_id,
            func.sum(FocusSession.duration_ms).label("total_ms")
        ).filter(
            FocusSession.started_at >= start_dt,
            FocusSession.started_at <= end_dt
        )
        
        if user_ids:
            results = results.filter(FocusSession.user_id.in_(user_ids))
        
        results = results.group_by(FocusSession.user_id).all()
        
        print(f"📊 Leaderboard query: start_dt={start_dt}, end_dt={end_dt}")
        print(f"📊 Leaderboard found {len(results)} users with sessions")
        for row in results:
            total_minutes = int(row.total_ms) / 60000 if row.total_ms else 0
            user_totals[row.user_id] = int(row.total_ms) if row.total_ms else 0
            print(f"📊 User {row.user_id}: {total_minutes:.2f} minutes ({int(row.total_ms)} ms)")
    
    # Build leaderboard entries for all users (including those with 0 hours)
    rows = []
    for user in all_users:
        total_ms = user_totals.get(user.id, 0)
        total_minutes = total_ms / 60000
        # Don't normalize - just use actual minutes for the current week
        weekly_minutes = total_minutes
        weekly_hours = total_minutes / 60
        
        print(f"📊 User {user.username} ({user.id}): {weekly_minutes:.2f} minutes ({total_ms} ms)")
        
        rows.append({
            "user_id": user.id,
            "name": user.display_name if user.display_name else user.username,
            "username": user.username,
            "email": user.email,
            "email_domain": user.email_domain,
            "hoursPerWeek": round(weekly_hours, 1),
            "minutesPerWeek": round(weekly_minutes, 0),  # Total minutes for ranking/display
            "total_ms": total_ms  # For sorting
        })
    
    # Sort by total_ms (milliseconds) descending for precise ranking
    rows.sort(key=lambda x: x["total_ms"], reverse=True)
    
    # Add ranks
    for i, row in enumerate(rows):
        row["rank"] = i + 1
        del row["total_ms"]  # Remove temporary field
        del row["user_id"]  # Remove temporary field
    
    print(f"📊 Leaderboard query returned {len(rows)} entries")
    
    return rows

@leaderboard_bp.route("/global", methods=["GET"])
@jwt_required(optional=True)
def leaderboard_global():
    """Global leaderboard (public users only)."""
    days = request.args.get("days", 7, type=int)
    
    # Get all public user IDs
    public_users = User.query.filter_by(privacy_opt_in=True).all()
    user_ids = [u.id for u in public_users]
    
    print(f"📊 Global leaderboard: {len(user_ids)} public users, days={days}")
    
    if not user_ids:
        return jsonify([]), 200
    
    rows = get_leaderboard_data(user_ids=user_ids, days=days)
    
    print(f"✅ Global leaderboard: {len(rows)} entries")
    return jsonify(rows), 200

@leaderboard_bp.route("/domain", methods=["GET"])
@jwt_required()
def leaderboard_domain():
    """Domain-based leaderboard (current user's email domain)."""
    user = get_current_user()
    days = request.args.get("days", 7, type=int)
    
    # Get public users from same domain
    public_users = User.query.filter(
        User.email_domain == user.email_domain,
        User.privacy_opt_in == True
    ).all()
    user_ids = [u.id for u in public_users]
    
    if not user_ids:
        return jsonify([]), 200
    
    rows = get_leaderboard_data(user_ids=user_ids, days=days)
    
    return jsonify(rows), 200

@leaderboard_bp.route("/friends", methods=["GET"])
@jwt_required()
def leaderboard_friends():
    """Friends-only leaderboard (includes current user)."""
    user = get_current_user()
    days = request.args.get("days", 7, type=int)
    
    print(f"📊 Friends leaderboard: user={user.id}, days={days}")
    
    # Find all accepted friends
    friendships = Friend.query.filter(
        Friend.status == "accepted",
        ((Friend.requester_id == user.id) | (Friend.addressee_id == user.id))
    ).all()
    
    # Collect friend IDs
    friend_ids = [user.id]  # Include current user
    for friendship in friendships:
        if friendship.requester_id == user.id:
            friend_ids.append(friendship.addressee_id)
        else:
            friend_ids.append(friendship.requester_id)
    
    print(f"📊 Friends leaderboard: {len(friend_ids)} friends (including self)")
    
    if not friend_ids:
        return jsonify([]), 200
    
    rows = get_leaderboard_data(user_ids=friend_ids, days=days)
    
    print(f"✅ Friends leaderboard: {len(rows)} entries")
    return jsonify(rows), 200
