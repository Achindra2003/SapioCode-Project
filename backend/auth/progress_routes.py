from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime
from bson import ObjectId
import uuid
import asyncio
import json

from mongo import progress_collection, sessions_collection, classes_collection, problems_collection, users_collection
from schemas import ProgressCompleteRequest

router = APIRouter(prefix="/progress", tags=["Progress"])

# ── SSE live-update infrastructure ───────────────────────────
# Simple in-process pub/sub.  Each teacher that opens the SSE
# stream registers a queue; progress writes push events to all.
_sse_subscribers: list[asyncio.Queue] = []


def _broadcast_progress_event(event: dict):
    """Push a progress-update event to every connected SSE client."""
    dead: list[asyncio.Queue] = []
    for q in _sse_subscribers:
        try:
            q.put_nowait(event)
        except Exception:
            dead.append(q)
    for q in dead:
        _sse_subscribers.remove(q)


@router.post("/complete")
async def complete_question(data: ProgressCompleteRequest):
    existing = progress_collection.find_one({
        "user_id": data.user_id,
        "question_id": data.question_id
    })

    if existing:
        progress_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "status": "mastered" if data.viva_verdict == "pass" else "in_progress",
                    "viva_score": data.viva_score,
                    "viva_verdict": data.viva_verdict,
                    "time_spent_seconds": data.time_spent_seconds,
                    "test_cases_passed": data.test_cases_passed,
                    "test_cases_total": data.test_cases_total,
                    "code_snapshot": data.code_snapshot,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
                "$inc": {"attempts": 1}
            }
        )
    else:
        progress_collection.insert_one({
            "user_id": data.user_id,
            "question_id": data.question_id,
            "topic_id": data.topic_id,
            "status": "mastered" if data.viva_verdict == "pass" else "in_progress",
            "viva_score": data.viva_score,
            "viva_verdict": data.viva_verdict,
            "attempts": 1,
            "time_spent_seconds": data.time_spent_seconds,
            "test_cases_passed": data.test_cases_passed,
            "test_cases_total": data.test_cases_total,
            "code_snapshot": data.code_snapshot,
            "completed_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })

    # Broadcast SSE event so teacher dashboards update live
    _broadcast_progress_event({
        "type": "progress_update",
        "user_id": data.user_id,
        "question_id": data.question_id,
        "status": "mastered" if data.viva_verdict == "pass" else "in_progress",
        "viva_score": data.viva_score,
        "viva_verdict": data.viva_verdict,
        "attempts": (existing.get("attempts", 0) + 1) if existing else 1,
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {"status": "recorded"}


# ═══════════════════════════════════════════════════════════════
#  SSE endpoint — teacher subscribes for live progress updates
# ═══════════════════════════════════════════════════════════════

@router.get("/stream/live")
async def live_progress_stream(request: Request):
    """Server-Sent Events stream for real-time progress updates.
    Teachers open this and receive events whenever any student
    completes/submits a question."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=256)
    _sse_subscribers.append(queue)

    async def event_generator():
        try:
            # Send heartbeat immediately so the connection is established
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive every 30s to prevent timeout
                    yield ": keepalive\n\n"
        finally:
            if queue in _sse_subscribers:
                _sse_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/{user_id}")
def get_user_progress(user_id: str):
    progress = list(progress_collection.find({"user_id": user_id}))

    result = []
    for p in progress:
        result.append({
            "user_id": p["user_id"],
            "question_id": p["question_id"],
            "topic_id": p["topic_id"],
            "status": p["status"],
            "viva_score": p["viva_score"],
            "viva_verdict": p["viva_verdict"],
            "attempts": p["attempts"],
            "time_spent_seconds": p["time_spent_seconds"],
            "test_cases_passed": p["test_cases_passed"],
            "test_cases_total": p["test_cases_total"],
            "completed_at": p.get("completed_at"),
        })

    return result


@router.get("/{user_id}/topic/{topic_id}")
def get_topic_progress(user_id: str, topic_id: str):
    progress = list(progress_collection.find({
        "user_id": user_id,
        "topic_id": topic_id
    }))

    result = []
    for p in progress:
        result.append({
            "user_id": p["user_id"],
            "question_id": p["question_id"],
            "topic_id": p["topic_id"],
            "status": p["status"],
            "viva_score": p["viva_score"],
            "viva_verdict": p["viva_verdict"],
            "attempts": p["attempts"],
            "time_spent_seconds": p["time_spent_seconds"],
            "test_cases_passed": p["test_cases_passed"],
            "test_cases_total": p["test_cases_total"],
            "completed_at": p.get("completed_at"),
        })

    return result


# ═══════════════════════════════════════════════════════════════
#  GET /student/{user_id}/classes
#  Returns all classes the student is enrolled in, with problem counts.
# ═══════════════════════════════════════════════════════════════

@router.get("/student/{user_id}/classes")
def get_student_classes(user_id: str):
    """
    Returns a list of classes the student is enrolled in.
    Each entry has: id, name, cohort_code, problem_count, teacher_name.
    """
    student_classes = list(classes_collection.find({"students": user_id}))

    result = []
    for cls in student_classes:
        # Count assigned problems
        assigned = cls.get("topics_assigned", [])
        # Try to get teacher name — field is "instructor_id" (set in teacher_routes)
        teacher_id = cls.get("instructor_id", "")
        teacher_name = "Teacher"
        if teacher_id:
            teacher_doc = users_collection.find_one({"_id": teacher_id})
            if not teacher_doc and ObjectId.is_valid(teacher_id):
                teacher_doc = users_collection.find_one({"_id": ObjectId(teacher_id)})
            if teacher_doc:
                teacher_name = teacher_doc.get("full_name", teacher_doc.get("email", "Teacher"))

        result.append({
            "id": str(cls["_id"]),
            "name": cls.get("name", "Unnamed Class"),
            "cohort_code": cls.get("cohort_code", ""),
            "problem_count": len(assigned),
            "teacher_name": teacher_name,
        })

    return {"classes": result}


# ═══════════════════════════════════════════════════════════════
#  GET /student/{user_id}/skill-tree
#  Finds the student's class(es), merges assigned problems with
#  the student's progress to return nodes for the Game Map.
# ═══════════════════════════════════════════════════════════════

@router.get("/student/{user_id}/skill-tree")
def get_skill_tree(user_id: str, class_id: str = None):
    """
    Returns a list of skill-tree nodes combining:
      - problems assigned to the student's class
      - the student's current progress on each problem
    Each node has: id, title, description, difficulty, topic, order,
    status (locked | in_progress | mastered), viva_score, attempts

    Optional query param `class_id` filters to a specific class.
    """
    # Find all classes the student belongs to
    if class_id:
        # Filter to a specific class
        student_classes = list(classes_collection.find({"_id": ObjectId(class_id), "students": user_id}))
    else:
        student_classes = list(classes_collection.find({"students": user_id}))

    # Collect all unique problem IDs assigned across classes
    all_problem_ids = []
    for cls in student_classes:
        for pid in cls.get("topics_assigned", []):
            if pid not in all_problem_ids and ObjectId.is_valid(pid):
                all_problem_ids.append(pid)

    # Fetch all problems
    problems = []
    if all_problem_ids:
        oid_list = [ObjectId(pid) for pid in all_problem_ids]
        problems = list(problems_collection.find({"_id": {"$in": oid_list}}))

    # Fetch student's progress
    student_progress = list(progress_collection.find({"user_id": user_id}))
    progress_map = {sp["question_id"]: sp for sp in student_progress}

    # Build ordered nodes — problems come in creation order
    nodes = []
    prev_mastered = True  # first node is always unlocked
    for idx, prob in enumerate(problems):
        pid = str(prob["_id"])
        prog = progress_map.get(pid)

        if prog:
            status = prog["status"]  # "mastered" or "in_progress"
        elif prev_mastered:
            status = "in_progress"  # next available
        else:
            status = "locked"

        node = {
            "id": pid,
            "title": prob["title"],
            "description": prob.get("description", "")[:200],
            "difficulty": prob.get("difficulty", "beginner"),
            "topic": prob.get("topic", ""),
            "order": idx + 1,
            "status": status,
            "viva_score": prog.get("viva_score", 0) if prog else 0,
            "attempts": prog.get("attempts", 0) if prog else 0,
            "test_cases_passed": prog.get("test_cases_passed", 0) if prog else 0,
            "test_cases_total": prog.get("test_cases_total", 0) if prog else 0,
        }
        nodes.append(node)

        # Only unlock next if current is mastered
        prev_mastered = (status == "mastered")

    # Class info
    class_info = None
    if student_classes:
        c = student_classes[0]
        class_info = {
            "id": str(c["_id"]),
            "name": c["name"],
            "cohort_code": c["cohort_code"],
        }

    return {
        "user_id": user_id,
        "class": class_info,
        "nodes": nodes,
        "total_problems": len(nodes),
        "mastered_count": sum(1 for n in nodes if n["status"] == "mastered"),
    }
