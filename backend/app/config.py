import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_TOKEN_LOCATION = ["headers"]
    # Use DATABASE_URL from Heroku if available, otherwise use SQLite
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        # Heroku uses postgres:// but SQLAlchemy needs postgresql://
        # For psycopg3, use postgresql+psycopg:// instead
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
        elif DATABASE_URL.startswith("postgresql://"):
            DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
        SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///focus.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
