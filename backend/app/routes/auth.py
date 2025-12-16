from flask import Blueprint, request, jsonify, redirect, url_for
from flask_jwt_extended import create_access_token
from flask import current_app
from app import db
from app.models import User
from app.models import utc_now

# Try to import google-auth at module level
try:
    from google.oauth2 import id_token as verify_id_token
    from google.auth.transport import requests as google_requests
    import requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    verify_id_token = None
    google_requests = None

# Try to import better-profanity for content filtering
try:
    from better_profanity import profanity
    PROFANITY_AVAILABLE = True
    # Customize profanity filter - make it stricter
    profanity.load_censor_words()
except ImportError:
    PROFANITY_AVAILABLE = False
    profanity = None

def contains_profanity(text):
    """Check if text contains profanity. Returns (has_profanity, error_message)."""
    if not PROFANITY_AVAILABLE:
        # If library not available, skip check (shouldn't happen in production)
        return False, None
    
    if not text:
        return False, None
    
    # Check for profanity
    if profanity.contains_profanity(text):
        return True, "This username or display name contains inappropriate language. Please choose something else."
    
    return False, None

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/check-username", methods=["GET"])
def check_username():
    """Check if username is available."""
    username = request.args.get("username", "").strip().lower()
    
    if not username:
        return jsonify({"available": False, "error": "Username is required"}), 400
    
    # Validate format
    if len(username) < 3 or len(username) > 32:
        return jsonify({"available": False, "error": "Username must be between 3 and 32 characters"}), 400
    
    if not username.replace("_", "").isalnum():
        return jsonify({"available": False, "error": "Username can only contain letters, numbers, and underscores"}), 400
    
    # Check for profanity
    has_profanity, profanity_error = contains_profanity(username)
    if has_profanity:
        return jsonify({"available": False, "error": profanity_error}), 400
    
    # Check if taken
    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({"available": False, "error": "Username already taken"}), 200
    
    return jsonify({"available": True}), 200

@auth_bp.route("/signup", methods=["POST"])
def signup():
    """
    Sign up a new user with Google OAuth.
    Requires display_name and username to be provided.
    Email comes from Google OAuth.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    # Get Google OAuth data (in production, verify Google token here)
    # Support both "sub" and "google_sub" for compatibility
    google_sub = data.get("google_sub") or data.get("sub")
    email = data.get("email")
    name = data.get("name", "")  # From Google profile
    
    # Get user-provided data
    display_name = data.get("display_name", "").strip()
    username = data.get("username", "").strip().lower()
    
    # Validate required fields
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    if not display_name:
        return jsonify({"error": "Display name is required"}), 400
    
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    # Validate username format
    if len(username) < 3 or len(username) > 32:
        return jsonify({"error": "Username must be between 3 and 32 characters"}), 400
    
    if not username.replace("_", "").isalnum():
        return jsonify({"error": "Username can only contain letters, numbers, and underscores"}), 400
    
    # Check for profanity in username
    has_profanity, profanity_error = contains_profanity(username)
    if has_profanity:
        return jsonify({"error": profanity_error}), 400
    
    # Check for profanity in display_name
    has_profanity, profanity_error = contains_profanity(display_name)
    if has_profanity:
        return jsonify({"error": profanity_error}), 400
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "An account with this email already exists. Please log in instead."}), 400
    
    # Check if username is taken
    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        return jsonify({"error": "Username already taken"}), 400
    
    # Parse email domain - just the part after @
    if "@" not in email:
        return jsonify({"error": "Invalid email format"}), 400
    email_domain = email.split("@")[1].lower()
    
    # Create new user
    user = User(
        email=email,
        email_domain=email_domain,
        google_sub=google_sub,
        display_name=display_name,
        username=username,
        created_at=utc_now()
    )
    
    try:
        db.session.add(user)
        db.session.flush()  # Flush to get user.id
        
        # Create default "All Subjects" subject for new user
        from app.models import Subject
        default_subject = Subject(
            user_id=user.id,
            name="All Subjects",
            color="#f59f0a",  # Orange color as specified
            created_at=utc_now()
        )
        db.session.add(default_subject)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"❌ Signup exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create user: {str(e)}"}), 500
    
    # Generate JWT (7 days expiration)
    from datetime import timedelta
    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Log in an existing user with Google OAuth.
    Email comes from Google OAuth, finds existing user.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    # Get Google OAuth data (in production, verify Google token here)
    google_sub = data.get("sub")
    email = data.get("email")
    name = data.get("name", "")
    
    # If credential is provided, verify Google ID token
    credential = data.get("credential")
    if credential:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests
            import os
            
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            if client_id:
                # Verify the token
                request_obj = requests.Request()
                idinfo = id_token.verify_oauth2_token(credential, request_obj, client_id)
                
                google_sub = idinfo.get("sub")
                email = idinfo.get("email")
                name = idinfo.get("name", "")
        except ImportError:
            # google-auth not installed, fall back to dev mode
            pass
        except Exception as e:
            return jsonify({"error": f"Invalid Google token: {str(e)}"}), 401
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Find existing user
    user = None
    if google_sub:
        user = User.query.filter_by(google_sub=google_sub).first()
    
    if not user:
        user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "No account found with this email. Please sign up first."}), 404
    
        # Update google_sub if missing
        if google_sub and not user.google_sub:
            user.google_sub = google_sub
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            # Continue anyway, not critical
    
    # Generate JWT (7 days expiration)
    from datetime import timedelta
    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/google/callback", methods=["GET"])
def google_oauth_callback():
    """
    OAuth callback handler - exchanges authorization code for user info.
    Can handle both login (existing user) and signup (new user with pending_signup data).
    """
    code = request.args.get("code")
    error = request.args.get("error")
    pending_signup_json = request.args.get("pending_signup")
    
    if error:
        return jsonify({"error": error}), 400
    
    if not code:
        return jsonify({"error": "No authorization code provided"}), 400
    
    # Parse pending signup data if provided (from signup page)
    pending_signup = None
    if pending_signup_json:
        try:
            import json
            pending_signup = json.loads(pending_signup_json)
        except:
            print(f"⚠️ Failed to parse pending_signup: {pending_signup_json}")
    
    if not GOOGLE_AUTH_AVAILABLE:
        return jsonify({"error": "Google OAuth libraries not installed. Please contact support."}), 500
    
    try:
        import os
        
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/api/auth/google/callback"
        
        if not client_id:
            return jsonify({"error": "Google OAuth client ID not configured"}), 500
        
        # Check if secret is placeholder
        if not client_secret or client_secret.startswith("GOCSPX-placeholder") or "placeholder" in client_secret.lower():
            return jsonify({
                "error": "Google OAuth client secret not configured. Please add your real client secret.",
                "hint": "Get it from: https://console.cloud.google.com/apis/credentials → Your OAuth Client → Client secret"
            }), 500
        
        # Exchange code for token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        
        print(f"🔍 OAuth Debug - Redirect URI: {redirect_uri}")
        print(f"🔍 OAuth Debug - Client ID: {client_id[:20]}...")
        
        token_response = requests.post(token_url, data=token_data)
        
        if not token_response.ok:
            error_text = token_response.text
            print(f"❌ Google OAuth Error: {error_text}")
            return jsonify({
                "error": "Google OAuth token exchange failed",
                "details": error_text,
                "redirect_uri": redirect_uri
            }), 400
        
        tokens = token_response.json()
        
        id_token = tokens.get("id_token")
        if not id_token:
            return jsonify({"error": "No ID token received"}), 400
        
        # Verify ID token
        request_obj = google_requests.Request()
        idinfo = verify_id_token.verify_oauth2_token(id_token, request_obj, client_id)
        
        google_sub = idinfo.get("sub")
        email = idinfo.get("email")
        name = idinfo.get("name", "")
        
        if not email:
            return jsonify({"error": "Email not provided by Google"}), 400
        
        # Track whether this is a brand new user or an existing one
        user_was_created = False

        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user and google_sub:
            user = User.query.filter_by(google_sub=google_sub).first()
        
        if not user:
            # User doesn't exist - check if we have pending signup data
            if pending_signup:
                # Create new user with provided username and display_name
                display_name = pending_signup.get("display_name", "").strip()
                username = pending_signup.get("username", "").strip().lower()
                
                if not display_name or not username:
                    return jsonify({
                        "error": "Display name and username are required for signup.",
                        "email": email,
                        "name": name,
                        "google_sub": google_sub
                    }), 400
                
                # Validate username format
                if len(username) < 3 or len(username) > 32:
                    return jsonify({
                        "error": "Username must be between 3 and 32 characters",
                        "email": email
                    }), 400
                
                if not username.replace("_", "").isalnum():
                    return jsonify({
                        "error": "Username can only contain letters, numbers, and underscores",
                        "email": email
                    }), 400
                
                # Check for profanity in username
                has_profanity, profanity_error = contains_profanity(username)
                if has_profanity:
                    return jsonify({
                        "error": profanity_error,
                        "email": email
                    }), 400
                
                # Check for profanity in display_name
                has_profanity, profanity_error = contains_profanity(display_name)
                if has_profanity:
                    return jsonify({
                        "error": profanity_error,
                        "email": email
                    }), 400
                
                # Check if username is taken
                existing_username = User.query.filter_by(username=username).first()
                if existing_username:
                    return jsonify({
                        "error": "Username already taken",
                        "email": email
                    }), 400
                
                # Parse email domain - just the part after @
                if "@" not in email:
                    return jsonify({"error": "Invalid email format"}), 400
                email_domain = email.split("@")[1].lower()
                
                # Create new user
        user = User(
            email=email,
            email_domain=email_domain,
            google_sub=google_sub,
                    display_name=display_name,
            username=username,
            created_at=utc_now()
        )
                
                try:
        db.session.add(user)
                    db.session.flush()  # Flush to get user.id
                    
                    # Create default "All Subjects" subject for new user
                    from app.models import Subject
                    default_subject = Subject(
                        user_id=user.id,
                        name="All Subjects",
                        color="#f59f0a",  # Orange color
                        created_at=utc_now()
                    )
                    db.session.add(default_subject)
        db.session.commit()
                    print(f"✅ Created new user: {user.id} ({user.email}) with username: {user.username}")
                    user_was_created = True
                except Exception as e:
                    db.session.rollback()
                    print(f"❌ Signup exception: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    return jsonify({"error": f"Failed to create user: {str(e)}"}), 500
    else:
                # No pending signup data - user needs to signup first
                return jsonify({
                    "error": "Account not found. Please sign up first.",
                    "email": email,
                    "name": name,
                    "google_sub": google_sub
                }), 404
        
        # Update google_sub if missing
        if google_sub and not user.google_sub:
            user.google_sub = google_sub
            db.session.commit()
    
        # Generate JWT
        from datetime import timedelta
        access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
        
        print(f"✅ Generated JWT for user {user.id} ({user.email})")
        print(f"🔑 Token preview: {access_token[:50]}...")
        
        return jsonify({
            "access_token": access_token,
            "user": user.to_dict(),
            # Expose whether this Google flow created a new account or used an existing one.
            # Frontend can use this to show a small popup/toast like:
            # - "Account created" (status = "created")
            # - "You're already registered, logging you in" (status = "existing")
            "status": "created" if user_was_created else "existing"
        }), 200
        
    except Exception as e:
        import traceback
        print(f"❌ OAuth callback exception: {str(e)}")
        print(f"❌ Traceback:")
        traceback.print_exc()
        return jsonify({
            "error": f"OAuth callback failed: {str(e)}",
            "type": type(e).__name__
        }), 500
    
# Legacy endpoints for backwards compatibility (can be removed later)
@auth_bp.route("/google", methods=["POST"])
def google_login_post():
    """
    Legacy endpoint - redirects to login or signup based on user existence.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    google_sub = data.get("sub")
    email = data.get("email")
    name = data.get("name", "")
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Check if user exists
    user = None
    if google_sub:
        user = User.query.filter_by(google_sub=google_sub).first()
    
    if not user:
        user = User.query.filter_by(email=email).first()
    
    # If user exists, treat as login; otherwise, they need to signup
    if user:
        # Login flow
        if google_sub and not user.google_sub:
            user.google_sub = google_sub
            db.session.commit()
        
        from datetime import timedelta
        access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), 200
    else:
        # User doesn't exist - they need to signup
        return jsonify({"error": "Account not found. Please sign up first."}), 404
