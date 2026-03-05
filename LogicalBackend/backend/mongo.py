import os
from pymongo import MongoClient

# Use environment variable or default to local MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "sapiocode")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
classes_collection = db["classes"]
topics_collection = db["topics"]
problems_collection = db["problems"]
student_topic_progress_collection = db["student_topic_progress"]
problem_attempts_collection = db["problem_attempts"]
editor_snapshots_collection = db["editor_snapshots"]
ai_chat_threads_collection = db["ai_chat_threads"]
viva_sessions_collection = db["viva_sessions"]