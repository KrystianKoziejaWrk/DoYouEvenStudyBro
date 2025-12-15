from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import func
from app import db
from app.models import User, FocusSession
from app.models import utc_now

# Try to import better-profanity for content filtering
try:
    from better_profanity import profanity
    PROFANITY_AVAILABLE = True
    profanity.load_censor_words()
except ImportError:
    PROFANITY_AVAILABLE = False
    profanity = None

def contains_profanity(text):
    """Check if text contains profanity. Returns (has_profanity, error_message)."""
    if not PROFANITY_AVAILABLE:
        return False, None
    
    if not text:
        return False, None
    
    if profanity.contains_profanity(text):
        return True, "This username or display name contains inappropriate language. Please choose something else."
    
    return False, None

users_bp = Blueprint("users", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

@users_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Get current user info."""
    user = get_current_user()
    return jsonify(user.to_dict()), 200

@users_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_me():
    """Update current user profile."""
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    # Update display_name (allow null or empty to clear)
    if "display_name" in data:
        new_display_name = data["display_name"] if data["display_name"] else None
        if new_display_name:
            # Check for profanity in display_name
            has_profanity, profanity_error = contains_profanity(new_display_name)
            if has_profanity:
                return jsonify({"error": profanity_error}), 400
        user.display_name = new_display_name
    
    # Update timezone
    if "timezone" in data:
        tz = data["timezone"]
        if not tz or not isinstance(tz, str):
            return jsonify({"error": "timezone must be a non-empty string"}), 400
        user.timezone = tz
    
    # Update privacy_opt_in
    if "privacy_opt_in" in data:
        user.privacy_opt_in = bool(data["privacy_opt_in"])
    
    # Update username (with restrictions)
    if "username" in data:
        new_username = data["username"].strip()
        
        # Validate length
        if len(new_username) < 3 or len(new_username) > 32:
            return jsonify({"error": "Username must be between 3 and 32 characters"}), 400
        
        # Check for profanity in username
        has_profanity, profanity_error = contains_profanity(new_username)
        if has_profanity:
            return jsonify({"error": profanity_error}), 400
        
        # Check uniqueness
        existing = User.query.filter_by(username=new_username).first()
        if existing and existing.id != user.id:
            return jsonify({"error": "Username already taken"}), 400
        
        # Check 30-day restriction
        if user.username_changed_at:
            time_since_change = utc_now() - user.username_changed_at
            days_since_change = time_since_change.days
            if days_since_change < 30:
                # Calculate remaining time in days:hours:minutes
                remaining_seconds = (30 * 24 * 60 * 60) - int(time_since_change.total_seconds())
                remaining_days = remaining_seconds // (24 * 60 * 60)
                remaining_hours = (remaining_seconds % (24 * 60 * 60)) // (60 * 60)
                remaining_minutes = (remaining_seconds % (60 * 60)) // 60
                
                return jsonify({
                    "error": "Username can only be changed once every 30 days.",
                    "rate_limited": True,
                    "remaining": {
                        "days": remaining_days,
                        "hours": remaining_hours,
                        "minutes": remaining_minutes
                    }
                }), 429
        
        user.username = new_username
        user.username_changed_at = utc_now()
    
    try:
        db.session.commit()
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@users_bp.route("/<username>", methods=["GET"])
@jwt_required(optional=True)
def get_user_by_username(username):
    """Get user by username (public endpoint with privacy checks)."""
    user = User.query.filter_by(username=username).first()
    
    if not user:
        print(f"❌ User not found: {username}")
        # Return 404 to avoid leaking existence
        return jsonify({"error": "User not found"}), 404
    
    print(f"✅ Found user: {user.id} ({user.username}), privacy_opt_in: {user.privacy_opt_in}")
    
    # Check privacy - use same logic as stats endpoints
    requester_id = None
    try:
        from flask_jwt_extended import get_jwt_identity
        requester_id_str = get_jwt_identity()
        if requester_id_str:
            requester_id = int(requester_id_str)
            print(f"🔐 Requester ID: {requester_id}")
    except Exception as e:
        # Not authenticated or token invalid
        print(f"🔓 Not authenticated: {e}")
        requester_id = None
    
    # Privacy check - same logic as get_target_user in stats.py
    if requester_id == user.id:
        print(f"✅ Requester is the user, allowing access")
        return jsonify(user.to_dict()), 200
    
    if not user.privacy_opt_in:
        # User is private, check if they're friends
        print(f"🔒 User is private, checking friendship...")
        if requester_id:
            from app.models import Friend
            is_friend = Friend.query.filter(
                Friend.status == "accepted",
                ((Friend.requester_id == requester_id) & (Friend.addressee_id == user.id)) |
                ((Friend.requester_id == user.id) & (Friend.addressee_id == requester_id))
            ).first()
            if is_friend:
                print(f"✅ Users are friends, allowing access")
                return jsonify(user.to_dict()), 200
            else:
                print(f"❌ Users are not friends, denying access")
                return jsonify({"error": "User not found"}), 404
        else:
            # Not authenticated and user is private
            print(f"❌ Not authenticated and user is private, denying access")
            return jsonify({"error": "User not found"}), 404
    else:
        # User is public
        print(f"✅ User is public, allowing access")
        return jsonify(user.to_dict()), 200

@users_bp.route("/search", methods=["GET"])
@jwt_required()
def search_users():
    """Search users by username or display_name."""
    current_user = get_current_user()
    query = request.args.get("q", "").strip()
    
    if not query:
        return jsonify([]), 200
    
    print(f"🔍 User search: '{query}' by user {current_user.id} ({current_user.username})")
    
    # Search by username ONLY (case-insensitive)
    # NO privacy or domain restrictions - anyone can search for anyone
    # Privacy only affects viewing profiles, not searching
    results = User.query.filter(
        User.id != current_user.id,
        User.username.ilike(f"%{query}%")
    ).limit(50).all()
    
    print(f"✅ Found {len(results)} users matching username '{query}'")
    for u in results:
        print(f"   - {u.username} (id={u.id})")
    
    return jsonify([{
        "id": u.id,
        "display_name": u.display_name,
        "username": u.username,
        "email_domain": u.email_domain
    } for u in results]), 200

@users_bp.route("/count", methods=["GET"])
def get_user_count():
    """Get total number of users (public endpoint)."""
    count = User.query.count()
    print(f"📊 Total users in database: {count}")
    return jsonify({"count": count}), 200

@users_bp.route("/stats", methods=["GET"])
def get_global_stats():
    """Get global stats: total users and total hours studied (public endpoint)."""
    user_count = User.query.count()
    
    # Get total minutes studied across all users
    total_ms = db.session.query(func.sum(FocusSession.duration_ms)).scalar() or 0
    total_minutes = int(total_ms / 60000)
    total_hours = round(total_minutes / 60, 1)
    
    print(f"📊 Global stats: {user_count} users, {total_hours} hours ({total_minutes} minutes)")
    
    return jsonify({
        "userCount": user_count,
        "totalHours": total_hours,
        "totalMinutes": total_minutes
    }), 200

