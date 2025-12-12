from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import func
from app import db
from app.models import User, FocusSession
from app.models import utc_now

sessions_bp = Blueprint("sessions", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

@sessions_bp.route("/", methods=["POST"])
@jwt_required()
def create_session():
    """Create a new study session."""
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    duration_ms = data.get("duration_ms")
    subject_id = data.get("subject_id")  # optional, can be null
    started_at_str = data.get("started_at")
    ended_at_str = data.get("ended_at")
    
    if not duration_ms:
        return jsonify({"error": "duration_ms is required"}), 400
    
    # Validate duration (at least 30 seconds = 30000 ms)
    if duration_ms < 30000:
        return jsonify({"error": "I am not paying for this short ahh session in my database 💀"}), 400
    
    # Max 10 hours = 36,000,000 ms
    if duration_ms > 36000000:
        return jsonify({"error": "Session cannot exceed 10 hours"}), 400
    
    # Parse timestamps (UTC-aware)
    if started_at_str and ended_at_str:
        try:
            started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
            ended_at = datetime.fromisoformat(ended_at_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid datetime format"}), 400
        
        # Validate ended_at after started_at
        if ended_at <= started_at:
            return jsonify({"error": "ended_at must be after started_at"}), 400
    else:
        # Default: use current time
        ended_at = utc_now()
        started_at = ended_at - timedelta(milliseconds=duration_ms)
    
    # Ensure user has "All Subjects" (for existing users who might not have it)
    from app.models import Subject
    all_subjects = Subject.query.filter_by(user_id=user.id, name="All Subjects").first()
    if not all_subjects:
        print(f"⚠️ User {user.id} missing 'All Subjects', creating it now...")
        all_subjects = Subject(
            user_id=user.id,
            name="All Subjects",
            color="#f59f0a",
            created_at=utc_now()
        )
        db.session.add(all_subjects)
        db.session.commit()
        print(f"✅ Created 'All Subjects' (id={all_subjects.id}) for user {user.id}")
    
    # Verify subject belongs to user if provided
    if subject_id:
        subject = Subject.query.get(subject_id)
        if not subject:
            print(f"❌ Subject {subject_id} not found in database")
            return jsonify({"error": f"Subject {subject_id} not found"}), 400
        if subject.user_id != user.id:
            print(f"❌ Subject {subject_id} belongs to user {subject.user_id}, but current user is {user.id}")
            return jsonify({"error": "Invalid subject_id - subject does not belong to you"}), 400
        print(f"✅ Subject {subject_id} ({subject.name}) validated for user {user.id}")
    
    # Create session
    session = FocusSession(
        user_id=user.id,
        subject_id=subject_id,
        started_at=started_at,
        ended_at=ended_at,
        duration_ms=duration_ms
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({
        "ok": True,
        "session": session.to_dict()
    }), 201

@sessions_bp.route("/", methods=["GET"])
@jwt_required()
def get_sessions():
    """Get sessions for current user with optional filters."""
    user = get_current_user()
    
    # Parse query params
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    subject_id = request.args.get("subject_id", type=int)
    
    # Build query
    query = FocusSession.query.filter_by(user_id=user.id)
    
    # Apply date filters
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str + "T00:00:00+00:00").date()
            query = query.filter(func.date(FocusSession.started_at) >= start_date)
        except ValueError:
            return jsonify({"error": "Invalid start_date format"}), 400
    
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str + "T23:59:59+00:00").date()
            query = query.filter(func.date(FocusSession.started_at) <= end_date)
        except ValueError:
            return jsonify({"error": "Invalid end_date format"}), 400
    
    # Apply subject filter
    if subject_id is not None:
        query = query.filter_by(subject_id=subject_id)
    
    # Order by most recent first
    sessions = query.order_by(FocusSession.started_at.desc()).all()
    
    return jsonify([s.to_dict() for s in sessions]), 200

