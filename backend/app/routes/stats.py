from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, or_
from app import db
from app.models import User, FocusSession, Subject, Friend
from app.models import utc_now

stats_bp = Blueprint("stats", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

def get_target_user(current_user, username=None, user_id=None):
    """Get target user for stats (with privacy checks)."""
    if username:
        target = User.query.filter_by(username=username).first()
        print(f"🔍 Looking for user by username: {username}")
    elif user_id:
        target = User.query.get(user_id)
        print(f"🔍 Looking for user by id: {user_id}")
    else:
        print(f"✅ Returning current user: {current_user.id}")
        return current_user
    
    if not target:
        print(f"❌ User not found")
        return None
    
    print(f"✅ Found target user: {target.id} ({target.username}), privacy_opt_in: {target.privacy_opt_in}")
    
    # Privacy check
    if target.id == current_user.id:
        print(f"✅ Target is current user, allowing access")
        return target
    
    if not target.privacy_opt_in:
        # Check if they're friends
        print(f"🔒 User is private, checking friendship...")
        is_friend = Friend.query.filter(
            Friend.status == "accepted",
            ((Friend.requester_id == current_user.id) & (Friend.addressee_id == target.id)) |
            ((Friend.requester_id == target.id) & (Friend.addressee_id == current_user.id))
        ).first()
        if is_friend:
            print(f"✅ Users are friends, allowing access")
        else:
            print(f"❌ Users are not friends, denying access")
        if not is_friend:
            return None
    else:
        print(f"✅ User is public, allowing access")
    
    return target

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

def compute_xp(total_minutes):
    """Compute XP: 1 XP per 3 minutes."""
    return int(total_minutes / 3)

def get_date_range(start_date_str=None, end_date_str=None, default_days=None):
    """Parse and return date range."""
    if start_date_str and end_date_str:
        try:
            start = datetime.fromisoformat(start_date_str + "T00:00:00+00:00").date()
            end = datetime.fromisoformat(end_date_str + "T23:59:59+00:00").date()
            return start, end
        except ValueError:
            return None, None
    
    # Default: current week (Mon-Sun)
    today = date.today()
    if default_days:
        start = today - timedelta(days=default_days - 1)
        return start, today
    
    # Current week (Monday to Sunday)
    days_since_monday = today.weekday()
    start = today - timedelta(days=days_since_monday)
    return start, today

def calculate_streak(user_id, end_date=None):
    """Calculate consecutive days with >0 minutes ending on end_date (or today)."""
    if end_date is None:
        end_date = date.today()
    
    streak = 0
    current_date = end_date
    
    while True:
        # Get total minutes for this day
        day_start = datetime.combine(current_date, datetime.min.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
        day_end = datetime.combine(current_date, datetime.max.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
        
        total_ms = db.session.query(func.sum(FocusSession.duration_ms)).filter(
            FocusSession.user_id == user_id,
            FocusSession.started_at >= day_start,
            FocusSession.started_at <= day_end
        ).scalar() or 0
        
        total_minutes = total_ms / 60000
        
        if total_minutes > 0:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
    
    return streak

@stats_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_summary():
    """Get summary stats for current user (or specified user)."""
    try:
        current_user = get_current_user()
        username = request.args.get("username")
        user_id = request.args.get("user_id", type=int)
        
        print(f"📊 Summary request - current_user: {current_user.id}, username: {username}, user_id: {user_id}")
        
        target_user = get_target_user(current_user, username, user_id)
        if not target_user:
            print(f"❌ Target user not found or not accessible")
            return jsonify({"error": "User not found or not accessible"}), 404
    except Exception as e:
        print(f"❌ Error in get_summary: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal error: {str(e)}"}), 500
    
    # Get date range (default: current week)
    start_date, end_date = get_date_range(
        request.args.get("start_date"),
        request.args.get("end_date")
    )
    
    # Query sessions in range
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    
    print(f"📊 Summary stats for user {target_user.id} ({target_user.username})")
    print(f"   Date range: {start_date} to {end_date}")
    print(f"   DateTime range: {start_dt} to {end_dt}")
    
    # Query with optional subject filter
    subject_id = request.args.get("subject_id", type=int)
    query = FocusSession.query.filter(
        FocusSession.user_id == target_user.id,
        FocusSession.started_at >= start_dt,
        FocusSession.started_at <= end_dt
    )
    
    if subject_id is not None:
        query = query.filter(FocusSession.subject_id == subject_id)
        print(f"   Filtering by subject_id: {subject_id}")
    
    sessions = query.all()
    print(f"   Found {len(sessions)} sessions in range")
    
    # Calculate stats
    total_ms = sum(s.duration_ms for s in sessions)
    total_minutes = total_ms / 60000
    sessions_count = len(sessions)
    weekly_hours = total_minutes / 60
    rank = compute_rank_tier(weekly_hours)
    xp = compute_xp(total_minutes)
    streak_days = calculate_streak(target_user.id)
    
    print(f"   Total minutes: {total_minutes}, Sessions: {sessions_count}, Hours: {weekly_hours}")
    
    return jsonify({
        "totalMinutes": int(total_minutes),
        "streakDays": streak_days,
        "sessionsCount": sessions_count,
        "weeklyHours": round(weekly_hours, 1),
        "rank": rank,
        "xp": xp
    }), 200

@stats_bp.route("/by-subject", methods=["GET"])
@jwt_required()
def get_by_subject():
    """Get stats aggregated by subject."""
    current_user = get_current_user()
    username = request.args.get("username")
    user_id = request.args.get("user_id", type=int)
    
    target_user = get_target_user(current_user, username, user_id)
    if not target_user:
        return jsonify({"error": "User not found or not accessible"}), 404
    
    # Get date range
    start_date, end_date = get_date_range(
        request.args.get("start_date"),
        request.args.get("end_date")
    )
    
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    
    print(f"📊 Subject stats for user {target_user.id} ({target_user.username})")
    print(f"   Date range: {start_date} to {end_date}")
    
    # Query with optional subject filter
    subject_id = request.args.get("subject_id", type=int)
    query = FocusSession.query.filter(
        FocusSession.user_id == target_user.id,
        FocusSession.started_at >= start_dt,
        FocusSession.started_at <= end_dt
    )
    
    if subject_id is not None:
        query = query.filter(FocusSession.subject_id == subject_id)
        print(f"   Filtering by subject_id: {subject_id}")
    
    sessions = query.all()
    print(f"   Found {len(sessions)} sessions for subject breakdown")
    
    # Aggregate by subject
    by_subject = {}
    for session in sessions:
        if session.subject_id:
            subject = Subject.query.get(session.subject_id)
            subject_name = subject.name if subject else "Unknown"
            subject_id_val = session.subject_id
        else:
            subject_name = "All Subjects"
            subject_id_val = None
        
        if subject_name not in by_subject:
            # Get subject color if available
            color = "#3b82f6"  # default
            if session.subject_id:
                subject_obj = Subject.query.get(session.subject_id)
                if subject_obj and subject_obj.color:
                    color = subject_obj.color
            
            by_subject[subject_name] = {
                "subject": subject_name,
                "minutes": 0,
                "subject_id": subject_id_val,
                "color": color
            }
        
        by_subject[subject_name]["minutes"] += session.duration_ms / 60000
    
    # Convert to list and sort
    result = list(by_subject.values())
    result.sort(key=lambda x: x["minutes"], reverse=True)
    
    return jsonify(result), 200

@stats_bp.route("/daily", methods=["GET"])
@jwt_required()
def get_daily():
    """Get daily stats for last 30 days (or specified range)."""
    current_user = get_current_user()
    username = request.args.get("username")
    user_id = request.args.get("user_id", type=int)
    subject_id = request.args.get("subject_id", type=int)
    
    target_user = get_target_user(current_user, username, user_id)
    if not target_user:
        return jsonify({"error": "User not found or not accessible"}), 404
    
    # Get date range (default: last 30 days)
    start_date, end_date = get_date_range(
        request.args.get("start_date"),
        request.args.get("end_date"),
        default_days=30
    )
    
    # Build query
    query = db.session.query(
        func.date(FocusSession.started_at).label("date"),
        func.sum(FocusSession.duration_ms).label("total_ms")
    ).filter(
        FocusSession.user_id == target_user.id,
        func.date(FocusSession.started_at) >= start_date,
        func.date(FocusSession.started_at) <= end_date
    )
    
    # Filter by subject if provided
    if subject_id is not None:
        query = query.filter(FocusSession.subject_id == subject_id)
    
    # Group by date
    results = query.group_by(
        func.date(FocusSession.started_at)
    ).all()
    
    # Create dict for lookup
    data_dict = {str(row.date): row.total_ms for row in results}
    
    # Build complete list
    days = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        total_ms = data_dict.get(date_str, 0)
        minutes = int(total_ms / 60000) if total_ms else 0
        days.append({
            "date": date_str,
            "minutes": minutes
        })
        current_date += timedelta(days=1)
    
    return jsonify(days), 200

@stats_bp.route("/weekly", methods=["GET"])
@jwt_required()
def get_weekly():
    """Get weekly stats with daily breakdown."""
    current_user = get_current_user()
    username = request.args.get("username")
    user_id = request.args.get("user_id", type=int)
    
    target_user = get_target_user(current_user, username, user_id)
    if not target_user:
        return jsonify({"error": "User not found or not accessible"}), 404
    
    # Get week start (default: current week Monday)
    week_start_str = request.args.get("start_date")
    if week_start_str:
        try:
            week_start = datetime.fromisoformat(week_start_str + "T00:00:00+00:00").date()
        except ValueError:
            return jsonify({"error": "Invalid start_date format"}), 400
    else:
        today = date.today()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
    
    week_end = week_start + timedelta(days=6)
    
    # Previous week for comparison
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(days=1)
    
    # Query current week sessions
    start_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    end_dt = datetime.combine(week_end, datetime.max.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    
    # Get optional subject filter
    subject_id = request.args.get("subject_id", type=int)
    
    query = FocusSession.query.filter(
        FocusSession.user_id == target_user.id,
        FocusSession.started_at >= start_dt,
        FocusSession.started_at <= end_dt
    )
    
    if subject_id is not None:
        query = query.filter(FocusSession.subject_id == subject_id)
        print(f"📊 Weekly stats filtering by subject_id: {subject_id}")
    
    sessions = query.order_by(FocusSession.started_at).all()
    print(f"📊 Weekly stats: found {len(sessions)} sessions")
    
    # Group by date
    by_date = {}
    for session in sessions:
        date_str = session.started_at.date().isoformat()
        if date_str not in by_date:
            by_date[date_str] = {
                "date": date_str,
                "totalMinutes": 0,
                "sessions": []
            }
        
        by_date[date_str]["totalMinutes"] += session.duration_ms / 60000
        
        # Get subject name
        subject_name = "All Subjects"
        if session.subject_id:
            subject = Subject.query.get(session.subject_id)
            if subject:
                subject_name = subject.name
        
        # Get subject color
        subject_color = "#3b82f6"  # default
        if session.subject_id:
            subject_obj = Subject.query.get(session.subject_id)
            if subject_obj and subject_obj.color:
                subject_color = subject_obj.color
        
        by_date[date_str]["sessions"].append({
            "id": session.id,
            "subject_id": session.subject_id,
            "subject": subject_name,
            "color": subject_color,
            "started_at": session.started_at.isoformat(),
            "ended_at": session.ended_at.isoformat(),
            "durationMinutes": int(session.duration_ms / 60000)
        })
    
    # Build days list (all 7 days)
    days = []
    weekly_total_minutes = 0
    current_date = week_start
    while current_date <= week_end:
        date_str = current_date.isoformat()
        if date_str in by_date:
            day_data = by_date[date_str]
            day_data["totalMinutes"] = int(day_data["totalMinutes"])
            days.append(day_data)
            weekly_total_minutes += day_data["totalMinutes"]
        else:
            days.append({
                "date": date_str,
                "totalMinutes": 0,
                "sessions": []
            })
        current_date += timedelta(days=1)
    
    # Query previous week total
    prev_start_dt = datetime.combine(prev_week_start, datetime.min.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    prev_end_dt = datetime.combine(prev_week_end, datetime.max.time()).replace(tzinfo=datetime.now().astimezone().tzinfo)
    
    prev_total_ms = db.session.query(func.sum(FocusSession.duration_ms)).filter(
        FocusSession.user_id == target_user.id,
        FocusSession.started_at >= prev_start_dt,
        FocusSession.started_at <= prev_end_dt
    ).scalar() or 0
    
    prev_week_total_minutes = int(prev_total_ms / 60000)
    
    return jsonify({
        "weekStart": week_start.isoformat(),
        "days": days,
        "weeklyTotalMinutes": int(weekly_total_minutes),
        "prevWeekTotalMinutes": prev_week_total_minutes
    }), 200

@stats_bp.route("/heatmap", methods=["GET"])
@jwt_required()
def get_heatmap():
    """Get heatmap data for last year (or specified range)."""
    current_user = get_current_user()
    username = request.args.get("username")
    user_id = request.args.get("user_id", type=int)
    
    target_user = get_target_user(current_user, username, user_id)
    if not target_user:
        return jsonify({"error": "User not found or not accessible"}), 404
    
    # Get date range (default: last year from Jan 1)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    
    if start_date_str and end_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str + "T00:00:00+00:00").date()
            end_date = datetime.fromisoformat(end_date_str + "T23:59:59+00:00").date()
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400
    else:
        today = date.today()
        start_date = date(today.year, 1, 1)  # Jan 1 of current year
        end_date = today
    
    # Query sessions grouped by date
    results = db.session.query(
        func.date(FocusSession.started_at).label("date"),
        func.sum(FocusSession.duration_ms).label("total_ms")
    ).filter(
        FocusSession.user_id == target_user.id,
        func.date(FocusSession.started_at) >= start_date,
        func.date(FocusSession.started_at) <= end_date
    ).group_by(
        func.date(FocusSession.started_at)
    ).all()
    
    # Create dict for lookup
    data_dict = {str(row.date): row.total_ms for row in results}
    
    # Build complete list
    days = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        total_ms = data_dict.get(date_str, 0)
        minutes = int(total_ms / 60000) if total_ms else 0
        days.append({
            "date": date_str,
            "minutes": minutes
        })
        current_date += timedelta(days=1)
    
    return jsonify(days), 200

