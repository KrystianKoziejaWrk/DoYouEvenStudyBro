#!/usr/bin/env python3
"""
Simple script to view SQLite database contents.
Usage: python view_db.py
"""
import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).parent / "instance" / "focus.db"

if not db_path.exists():
    print(f"Database not found at {db_path}")
    sys.exit(1)

conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=" * 60)
print("DATABASE CONTENTS")
print("=" * 60)

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"\nTables: {[t[0] for t in tables]}\n")

# Show users
print("\n" + "=" * 60)
print("USERS")
print("=" * 60)
cursor.execute("SELECT * FROM users")
users = cursor.fetchall()
if users:
    for user in users:
        print(f"ID: {user['id']}, Email: {user['email']}, Username: {user['username']}, Display: {user['display_name']}")
else:
    print("No users found")

# Show subjects
print("\n" + "=" * 60)
print("SUBJECTS")
print("=" * 60)
cursor.execute("SELECT * FROM subjects")
subjects = cursor.fetchall()
if subjects:
    for subj in subjects:
        print(f"ID: {subj['id']}, User: {subj['user_id']}, Name: {subj['name']}, Color: {subj['color']}")
else:
    print("No subjects found")

# Show sessions
print("\n" + "=" * 60)
print("FOCUS SESSIONS")
print("=" * 60)
cursor.execute("SELECT * FROM focus_sessions ORDER BY started_at DESC LIMIT 10")
sessions = cursor.fetchall()
if sessions:
    for sess in sessions:
        print(f"ID: {sess['id']}, User: {sess['user_id']}, Subject: {sess['subject_id']}, Duration: {sess['duration_ms']}ms, Started: {sess['started_at']}")
else:
    print("No sessions found")

# Show friends
print("\n" + "=" * 60)
print("FRIENDS")
print("=" * 60)
cursor.execute("SELECT * FROM friends")
friends = cursor.fetchall()
if friends:
    for friend in friends:
        print(f"ID: {friend['id']}, Requester: {friend['requester_id']}, Addressee: {friend['addressee_id']}, Status: {friend['status']}")
else:
    print("No friends found")

conn.close()
print("\n" + "=" * 60)

