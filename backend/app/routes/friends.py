from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Friend
from app.models import utc_now

friends_bp = Blueprint("friends", __name__)

def get_current_user():
    """Helper to get current user from JWT."""
    user_id = get_jwt_identity()
    # Convert string identity back to int
    return User.query.get_or_404(int(user_id))

@friends_bp.route("/", methods=["GET"])
@jwt_required()
def get_friends():
    """Get list of all accepted friends for current user."""
    user = get_current_user()
    
    # Find all accepted friendships where user is either requester or addressee
    friendships = Friend.query.filter(
        Friend.status == "accepted",
        ((Friend.requester_id == user.id) | (Friend.addressee_id == user.id))
    ).all()
    
    print(f"👥 User {user.id} ({user.username}) has {len(friendships)} friends")
    
    # Format response
    friends = []
    for friendship in friendships:
        if friendship.requester_id == user.id:
            friend_user = friendship.addressee
        else:
            friend_user = friendship.requester
        
        friends.append({
            "id": friendship.id,
            "user": friend_user.to_dict()
        })
    
    return jsonify(friends), 200

@friends_bp.route("/request", methods=["POST"])
@jwt_required()
def request_friend():
    """Send a friend request."""
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    # Find target user (primarily by username)
    target = None
    if "username" in data:
        target = User.query.filter_by(username=data["username"]).first()
        print(f"🔍 Looking for user with username: {data['username']}")
    elif "user_id" in data:
        target = User.query.get(data["user_id"])
        print(f"🔍 Looking for user with id: {data['user_id']}")
    elif "email" in data:
        target = User.query.filter_by(email=data["email"]).first()
        print(f"🔍 Looking for user with email: {data['email']}")
    
    if not target:
        print(f"❌ User not found")
        return jsonify({"error": "User not found"}), 404
    
    print(f"✅ Found target user: {target.id} ({target.username})")
    
    # Disallow self-requests
    if target.id == user.id:
        return jsonify({"error": "Cannot friend yourself"}), 400
    
    # Check for existing relationship (both directions)
    existing = Friend.query.filter(
        ((Friend.requester_id == user.id) & (Friend.addressee_id == target.id)) |
        ((Friend.requester_id == target.id) & (Friend.addressee_id == user.id))
    ).first()
    
    if existing:
        if existing.status == "accepted":
            print(f"⚠️ Already friends with {target.username}")
            return jsonify({"error": "Already friends"}), 400
        elif existing.status == "pending":
            print(f"⚠️ Friend request already exists with {target.username}")
            return jsonify({"error": "Friend request already exists"}), 400
    
    # Create friend request
    friend = Friend(
        requester_id=user.id,
        addressee_id=target.id,
        status="pending",
        created_at=utc_now()
    )
    
    db.session.add(friend)
    db.session.commit()
    
    print(f"✅ Friend request sent: {user.username} -> {target.username} (id={friend.id})")
    
    return jsonify({
        "ok": True,
        "friend_id": friend.id
    }), 201

@friends_bp.route("/requests/incoming", methods=["GET"])
@jwt_required()
def get_incoming_requests():
    """List pending requests where current user is addressee."""
    user = get_current_user()
    
    requests = Friend.query.filter(
        Friend.addressee_id == user.id,
        Friend.status == "pending"
    ).all()
    
    return jsonify([{
        "id": req.id,
        "requester": req.requester.to_dict(),
        "created_at": req.created_at.isoformat()
    } for req in requests]), 200

@friends_bp.route("/requests/outgoing", methods=["GET"])
@jwt_required()
def get_outgoing_requests():
    """List pending requests where current user is requester."""
    user = get_current_user()
    
    requests = Friend.query.filter(
        Friend.requester_id == user.id,
        Friend.status == "pending"
    ).all()
    
    return jsonify([{
        "id": req.id,
        "addressee": req.addressee.to_dict(),
        "created_at": req.created_at.isoformat()
    } for req in requests]), 200

@friends_bp.route("/accept/<int:id>", methods=["POST"])
@jwt_required()
def accept_friend(id):
    """Accept a friend request (only addressee can accept)."""
    user = get_current_user()
    friend = Friend.query.get_or_404(id)
    
    if friend.addressee_id != user.id:
        return jsonify({"error": "Not authorized"}), 403
    
    if friend.status != "pending":
        return jsonify({"error": "Request is not pending"}), 400
    
    friend.status = "accepted"
    db.session.commit()
    
    return jsonify({"ok": True}), 200

@friends_bp.route("/decline/<int:id>", methods=["DELETE"])
@jwt_required()
def decline_friend(id):
    """Decline a friend request (only addressee can decline)."""
    user = get_current_user()
    friend = Friend.query.get_or_404(id)
    
    if friend.addressee_id != user.id:
        return jsonify({"error": "Not authorized"}), 403
    
    # Delete the request
    db.session.delete(friend)
    db.session.commit()
    
    return jsonify({"ok": True}), 200

@friends_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def remove_friend(id):
    """Remove friend relationship."""
    user = get_current_user()
    friend = Friend.query.get_or_404(id)
    
    # Only allow if user is part of the relationship
    if friend.requester_id != user.id and friend.addressee_id != user.id:
        return jsonify({"error": "Not authorized"}), 403
    
    db.session.delete(friend)
    db.session.commit()
    
    return jsonify({"ok": True}), 200

