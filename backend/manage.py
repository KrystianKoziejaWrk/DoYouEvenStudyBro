from app import create_app
import os

app = create_app()

# For Heroku: use PORT environment variable if available
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(debug=True, port=port)