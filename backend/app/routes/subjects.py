from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Subject
from app.models import utc_now

subjects_bp = Blueprint("subjects", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

def ensure_all_subjects_exists(user):
    """Ensure user has 'All Subjects' - create if missing."""
    existing = Subject.query.filter_by(user_id=user.id, name="All Subjects").first()
    if not existing:
        default_subject = Subject(
            user_id=user.id,
            name="All Subjects",
            color="#f59f0a",
            created_at=utc_now()
        )
        db.session.add(default_subject)
        db.session.commit()
        print(f"✅ Created 'All Subjects' for user {user.id}")
        return default_subject
    return existing

@subjects_bp.route("/", methods=["GET"])
@jwt_required()
def get_subjects():
    """Get current user's subjects, or another user's subjects if username is provided."""
    current_user = get_current_user()
    username = request.args.get("username")
    
    # If username is provided, get that user's subjects (with privacy check)
    if username:
        from app.routes.stats import get_target_user
        target_user = get_target_user(current_user, username, None)
        if not target_user:
            return jsonify({"error": "User not found or not accessible"}), 404
        user = target_user
    else:
        user = current_user
    
    # Ensure "All Subjects" exists for this user
    ensure_all_subjects_exists(user)
    subjects = Subject.query.filter_by(user_id=user.id).all()
    return jsonify([s.to_dict() for s in subjects]), 200

@subjects_bp.route("/", methods=["POST"])
@jwt_required()
def create_subject():
    """Create a new subject for current user."""
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    name = data.get("name", "").strip()
    color = data.get("color")
    
    if not name:
        return jsonify({"error": "Subject name is required"}), 400
    
    # Check for duplicate name per user (optional but nice)
    existing = Subject.query.filter_by(user_id=user.id, name=name).first()
    if existing:
        return jsonify({"error": "Subject with this name already exists"}), 400
    
    subject = Subject(
        user_id=user.id,
        name=name,
        color=color,
        created_at=utc_now()
    )
    
    db.session.add(subject)
    db.session.commit()
    
    print(f"✅ Created subject '{name}' (id={subject.id}) for user {user.id}")
    
    return jsonify(subject.to_dict()), 201

@subjects_bp.route("/<int:id>", methods=["PATCH"])
@jwt_required()
def update_subject(id):
    """Update a subject (only if owned by current user)."""
    user = get_current_user()
    subject = Subject.query.get_or_404(id)
    
    if subject.user_id != user.id:
        return jsonify({"error": "Not authorized"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    if "name" in data:
        new_name = data["name"].strip()
        if not new_name:
            return jsonify({"error": "Subject name cannot be empty"}), 400
        # Check for duplicate (excluding current subject)
        existing = Subject.query.filter_by(user_id=user.id, name=new_name).first()
        if existing and existing.id != subject.id:
            return jsonify({"error": "Subject with this name already exists"}), 400
        subject.name = new_name
    
    if "color" in data:
        old_color = subject.color
        subject.color = data["color"]
        print(f"🎨 Updated subject {subject.id} ({subject.name}) color from '{old_color}' to '{subject.color}'")
    
    db.session.commit()
    print(f"✅ Subject {subject.id} updated successfully")
    return jsonify(subject.to_dict()), 200

@subjects_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_subject(id):
    """Delete a subject (only if owned by current user)."""
    user = get_current_user()
    subject = Subject.query.get_or_404(id)
    
    if subject.user_id != user.id:
        return jsonify({"error": "Not authorized"}), 403
    
    # Prevent deleting "All Subjects"
    if subject.name == "All Subjects":
        return jsonify({"error": "Cannot delete 'All Subjects'"}), 400
    
    # Set sessions' subject_id to null (cascade to "All Subjects")
    from app.models import FocusSession
    sessions_updated = FocusSession.query.filter_by(subject_id=subject.id).update({"subject_id": None})
    
    db.session.delete(subject)
    db.session.commit()
    
    print(f"🗑️ Deleted subject '{subject.name}' (id={subject.id}) for user {user.id}, updated {sessions_updated} sessions")
    
    return jsonify({"ok": True}), 200

