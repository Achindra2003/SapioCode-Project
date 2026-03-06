from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from mongo import sessions_collection
from schemas import SessionCreateRequest, SessionMessageRequest

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/create")
def create_session(data: SessionCreateRequest):
    existing = sessions_collection.find_one({"user_id": data.user_id})
    
    if existing:
        return {"thread_id": existing["thread_id"]}
    
    thread_id = f"thread_{data.user_id}_{uuid.uuid4().hex[:8]}"
    
    try:
        sessions_collection.insert_one({
            "user_id": data.user_id,
            "thread_id": thread_id,
            "conversation_history": [],
            "current_question_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    except Exception:
        # Race condition: another request already created it
        existing = sessions_collection.find_one({"user_id": data.user_id})
        if existing:
            return {"thread_id": existing["thread_id"]}
        raise
    
    return {"thread_id": thread_id}


@router.get("/{user_id}")
def get_session(user_id: str):
    session = sessions_collection.find_one({"user_id": user_id})
    
    if not session:
        thread_id = f"thread_{user_id}_{uuid.uuid4().hex[:8]}"
        try:
            sessions_collection.insert_one({
                "user_id": user_id,
                "thread_id": thread_id,
                "conversation_history": [],
                "current_question_id": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })
        except Exception:
            session = sessions_collection.find_one({"user_id": user_id})
            if session:
                return {"thread_id": session["thread_id"], "conversation_history": session.get("conversation_history", [])}
            raise
        return {"thread_id": thread_id, "conversation_history": []}
    
    return {
        "thread_id": session["thread_id"],
        "conversation_history": session.get("conversation_history", [])
    }


@router.put("/{user_id}/message")
def add_message(user_id: str, data: SessionMessageRequest):
    message = {
        "role": data.role,
        "content": data.content,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Upsert: create session if it doesn't exist, append message either way
    result = sessions_collection.update_one(
        {"user_id": user_id},
        {
            "$push": {"conversation_history": message},
            "$set": {"updated_at": datetime.utcnow()},
            "$setOnInsert": {
                "user_id": user_id,
                "thread_id": f"thread_{user_id}_{uuid.uuid4().hex[:8]}",
                "current_question_id": None,
                "created_at": datetime.utcnow(),
            },
        },
        upsert=True,
    )
    
    return {"status": "recorded"}


@router.get("/{user_id}/history")
def get_history(user_id: str):
    session = sessions_collection.find_one({"user_id": user_id})
    
    if not session:
        return {"history": []}
    
    return {"history": session.get("conversation_history", [])}


@router.delete("/{user_id}/clear")
def clear_session(user_id: str):
    """Clear conversation history for a user session (preserves thread_id)."""
    result = sessions_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "conversation_history": [],
                "updated_at": datetime.utcnow(),
            }
        },
    )
    if result.matched_count == 0:
        return {"status": "no_session"}
    return {"status": "cleared"}


@router.put("/{user_id}/question/{question_id}")
def set_current_question(user_id: str, question_id: str):
    sessions_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "current_question_id": question_id,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"status": "updated"}
