import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_TOKEN_LOCATION = ["headers"]
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///focus.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
