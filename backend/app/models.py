from datetime import datetime, timezone
from . import db

def utc_now():
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    email_domain = db.Column(db.String(255), nullable=False)
    google_sub = db.Column(db.String(255), unique=True, nullable=True)
    display_name = db.Column(db.String(80), nullable=True)
    username = db.Column(db.String(32), unique=True, nullable=False)
    username_changed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    timezone = db.Column(db.String(50), default="UTC")
    privacy_opt_in = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    sessions = db.relationship(
        "FocusSession",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    outgoing_friends = db.relationship(
        "Friend",
        foreign_keys="Friend.requester_id",
        back_populates="requester",
        lazy="dynamic"
    )
    incoming_friends = db.relationship(
        "Friend",
        foreign_keys="Friend.addressee_id",
        back_populates="addressee",
        lazy="dynamic"
    )
    
    def to_dict(self):
        """Convert user to dictionary for JSON responses."""
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "username": self.username,
            "email_domain": self.email_domain,
            "privacy_opt_in": self.privacy_opt_in,
            "timezone": self.timezone,
            "username_changed_at": self.username_changed_at.isoformat() if self.username_changed_at else None
        }

class Subject(db.Model):
    __tablename__ = "subjects"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    color = db.Column(db.String(16), nullable=True)  # hex string like "#00FFAA"
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    
    user = db.relationship("User", backref="subjects")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "createdAt": self.created_at.isoformat()
        }

class FocusSession(db.Model):
    __tablename__ = "focus_sessions"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=True)  # null means "All Subjects"/general
    started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ended_at = db.Column(db.DateTime(timezone=True), nullable=False)
    duration_ms = db.Column(db.Integer, nullable=False)  # store milliseconds
    
    # Relationships
    user = db.relationship("User", back_populates="sessions")
    subject = db.relationship("Subject", backref="sessions")
    
    def to_dict(self):
        # Get subject name if available
        subject_name = None
        if self.subject_id:
            subject = Subject.query.get(self.subject_id)
            if subject:
                subject_name = subject.name
        
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "subject": subject_name or "All Subjects",
            "duration_ms": self.duration_ms,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat()
        }

class Friend(db.Model):
    __tablename__ = "friends"
    
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    addressee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(16), default="pending", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    requester = db.relationship(
        "User",
        foreign_keys=[requester_id],
        back_populates="outgoing_friends"
    )
    addressee = db.relationship(
        "User",
        foreign_keys=[addressee_id],
        back_populates="incoming_friends"
    )
    
    __table_args__ = (
        db.UniqueConstraint("requester_id", "addressee_id", name="unique_friend_pair"),
    )
