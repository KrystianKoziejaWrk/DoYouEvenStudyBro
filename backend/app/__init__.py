from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    # Disable strict slashes to prevent redirects that break CORS preflight
    app.url_map.strict_slashes = False
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    
    # JWT error handlers for better debugging
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"❌ Invalid JWT token: {error}")
        return jsonify({"error": f"Invalid token: {str(error)}"}), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"❌ Missing JWT token: {error}")
        return jsonify({"error": "Authorization token is missing"}), 401
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.sessions import sessions_bp
    from .routes.subjects import subjects_bp
    from .routes.friends import friends_bp
    from .routes.leaderboard import leaderboard_bp
    from .routes.stats import stats_bp
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(subjects_bp, url_prefix="/api/subjects")
    app.register_blueprint(friends_bp, url_prefix="/api/friends")
    app.register_blueprint(leaderboard_bp, url_prefix="/api/leaderboard")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    
    # Health check route
    @app.get("/api/ping")
    def ping():
        return {"msg": "pong"}
    
    # Simple homepage
    @app.route("/")
    def home():
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>DoYouEvenStudyBro API</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                h1 { color: #333; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
                .get { background: #4CAF50; color: white; }
                .post { background: #2196F3; color: white; }
                .patch { background: #FF9800; color: white; }
                .delete { background: #f44336; color: white; }
                code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h1>🎓 DoYouEvenStudyBro API</h1>
            <p>Backend API server is running!</p>
            <p><strong>Base URL:</strong> <code>http://127.0.0.1:5001/api</code></p>
            
            <h2>Available Endpoints:</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/ping</code> - Health check
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/auth/google</code> - OAuth redirect (dev stub)
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/api/auth/google</code> - Direct auth (dev stub)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/users/me</code> - Get current user (requires JWT)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/subjects</code> - List subjects (requires JWT)
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/api/sessions</code> - Create session (requires JWT)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/stats/summary</code> - Get summary stats (requires JWT)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/leaderboard/global</code> - Global leaderboard
            </div>
            
            <h2>Quick Test:</h2>
            <p>Try visiting: <a href="/api/ping"><code>/api/ping</code></a></p>
            
            <h2>Frontend:</h2>
            <p>Connect your frontend to: <code>http://127.0.0.1:5001/api</code></p>
        </body>
        </html>
        """
    
    return app
