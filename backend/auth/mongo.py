import os
import logging
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("sapiocode.mongo")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/sapiocode")

client = MongoClient(MONGODB_URI)

db = client.sapiocode

users_collection = db.users
progress_collection = db.user_progress
sessions_collection = db.user_sessions
classes_collection = db.classes
problems_collection = db.problems

# ── Indexes (idempotent — safe to run on every startup) ─────
def ensure_indexes():
    """Create indexes for common query patterns."""
    try:
        users_collection.create_index([("email", ASCENDING)], unique=True)
        progress_collection.create_index([("user_id", ASCENDING), ("question_id", ASCENDING)])
        sessions_collection.create_index([("user_id", ASCENDING)], unique=True)
        classes_collection.create_index([("cohort_code", ASCENDING)], unique=True)
        classes_collection.create_index([("instructor_id", ASCENDING)])
        problems_collection.create_index([("class_id", ASCENDING)])
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning("Index creation warning (non-fatal): %s", e)

ensure_indexes()
