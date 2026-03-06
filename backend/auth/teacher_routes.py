"""
Teacher Routes — class management, problem CRUD, analytics heatmap.
"""
from fastapi import APIRouter, HTTPException, Header
from datetime import datetime
from bson import ObjectId
import random
import string

from mongo import (
    users_collection,
    classes_collection,
    problems_collection,
    progress_collection,
    sessions_collection,
)
from auth_utils import decode_access_token
from schemas import CreateProblemRequest, CreateClassRequest, JoinClassRequest, UpdateProblemRequest

router = APIRouter(prefix="/teacher", tags=["Teacher"])


# ── Auth helper ──────────────────────────────────────────────

def _get_teacher(authorization: str | None):
    """Decode JWT, verify teacher role, return user dict."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_collection.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user


# ═══════════════════════════════════════════════════════════════
#  Classes
# ═══════════════════════════════════════════════════════════════

@router.post("/classes")
def create_class(
    body: CreateClassRequest,
    authorization: str | None = Header(None),
):
    teacher = _get_teacher(authorization)

    # Generate unique cohort code (retry on collision)
    for _ in range(5):
        cohort_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not classes_collection.find_one({"cohort_code": cohort_code}):
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique class code")

    new_class = {
        "name": body.name,
        "instructor_id": str(teacher["_id"]),
        "cohort_code": cohort_code,
        "students": [],
        "topics_assigned": [],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = classes_collection.insert_one(new_class)

    return {
        "message": "Class created",
        "id": str(result.inserted_id),
        "class_id": str(result.inserted_id),
        "cohort_code": cohort_code,
        "name": body.name,
        "student_ids": [],
        "student_count": 0,
        "problem_count": 0,
        "is_active": True,
        "created_at": new_class["created_at"],
    }


@router.get("/classes")
def list_classes(authorization: str | None = Header(None)):
    teacher = _get_teacher(authorization)
    classes = list(
        classes_collection.find({"instructor_id": str(teacher["_id"])})
    )
    result = []
    for c in classes:
        result.append({
            "id": str(c["_id"]),
            "name": c["name"],
            "cohort_code": c["cohort_code"],
            "student_ids": c.get("students", []),
            "student_count": len(c.get("students", [])),
            "problem_count": len(c.get("topics_assigned", [])),
            "is_active": c.get("is_active", True),
            "created_at": c.get("created_at"),
        })
    return result


@router.get("/classes/{class_id}")
def get_class(class_id: str, authorization: str | None = Header(None)):
    teacher = _get_teacher(authorization)
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    # Resolve student info
    students = []
    for sid in cls.get("students", []):
        u = users_collection.find_one({"_id": ObjectId(sid)})
        if u:
            students.append({
                "id": str(u["_id"]),
                "full_name": u["full_name"],
                "email": u["email"],
            })

    # Resolve assigned problems
    problem_ids = [ObjectId(pid) for pid in cls.get("topics_assigned", []) if ObjectId.is_valid(pid)]
    problems_cursor = problems_collection.find({"_id": {"$in": problem_ids}}) if problem_ids else []
    problems = []
    for p in problems_cursor:
        problems.append({
            "id": str(p["_id"]),
            "title": p["title"],
            "difficulty": p["difficulty"],
            "topic": p.get("topic", ""),
            "status": p.get("status", "draft"),
        })

    return {
        "id": str(cls["_id"]),
        "name": cls["name"],
        "cohort_code": cls["cohort_code"],
        "students": students,
        "problems": problems,
        "is_active": cls.get("is_active", True),
        "created_at": cls.get("created_at"),
    }


# ═══════════════════════════════════════════════════════════════
#  POST /classes/{class_id}/problems — save & assign a problem
# ═══════════════════════════════════════════════════════════════

@router.post("/classes/{class_id}/problems")
def create_problem(
    class_id: str,
    body: CreateProblemRequest,
    authorization: str | None = Header(None),
):
    teacher = _get_teacher(authorization)

    # Validate class ownership
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    # Normalize starter_code: accept str (legacy) or dict (multi-language)
    raw_starter = body.starter_code
    if isinstance(raw_starter, dict):
        starter_code = raw_starter
    elif isinstance(raw_starter, str) and raw_starter:
        starter_code = {"python3": raw_starter, "java": "", "cpp17": "", "nodejs": ""}
    else:
        starter_code = {"python3": "", "java": "", "cpp17": "", "nodejs": ""}

    # Build problem document
    problem_doc = {
        "title": body.title,
        "description": body.description,
        "difficulty": body.difficulty,
        "topic": body.topic,
        "target_concepts": body.target_concepts,
        "test_cases": [tc.model_dump() for tc in body.test_cases],
        "viva_questions": [vq.model_dump() for vq in body.viva_questions],
        "status": body.status,
        "starter_code": starter_code,
        "created_by": str(teacher["_id"]),
        "class_id": class_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = problems_collection.insert_one(problem_doc)
    problem_id = str(result.inserted_id)

    # Push into the class's topics_assigned
    classes_collection.update_one(
        {"_id": ObjectId(class_id)},
        {
            "$push": {"topics_assigned": problem_id},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    return {
        "message": "Problem created and assigned",
        "problem_id": problem_id,
    }


@router.get("/classes/{class_id}/problems")
def list_problems(class_id: str, authorization: str | None = Header(None)):
    teacher = _get_teacher(authorization)
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    problem_ids = [ObjectId(pid) for pid in cls.get("topics_assigned", []) if ObjectId.is_valid(pid)]
    problems = list(problems_collection.find({"_id": {"$in": problem_ids}})) if problem_ids else []

    result = []
    for p in problems:
        result.append({
            "id": str(p["_id"]),
            "title": p["title"],
            "description": p["description"],
            "difficulty": p["difficulty"],
            "topic": p.get("topic", ""),
            "target_concepts": p.get("target_concepts", []),
            "test_cases": p.get("test_cases", []),
            "viva_questions": p.get("viva_questions", []),
            "status": p.get("status", "draft"),
            "starter_code": p.get("starter_code", ""),
            "created_at": p.get("created_at"),
        })
    return result


# ═══════════════════════════════════════════════════════════════
#  PUT /classes/{class_id}/problems/{problem_id} — update
# ═══════════════════════════════════════════════════════════════

@router.put("/classes/{class_id}/problems/{problem_id}")
def update_problem(
    class_id: str,
    problem_id: str,
    body: UpdateProblemRequest,
    authorization: str | None = Header(None),
):
    teacher = _get_teacher(authorization)
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    if not ObjectId.is_valid(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem ID")

    update_fields = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "test_cases" and value is not None:
            update_fields[field] = [tc if isinstance(tc, dict) else tc for tc in value]
        elif field == "viva_questions" and value is not None:
            update_fields[field] = [vq if isinstance(vq, dict) else vq for vq in value]
        elif value is not None:
            update_fields[field] = value

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.utcnow()

    result = problems_collection.update_one(
        {"_id": ObjectId(problem_id), "class_id": class_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Problem not found")

    return {"message": "Problem updated", "problem_id": problem_id}


# ═══════════════════════════════════════════════════════════════
#  DELETE /classes/{class_id}/problems/{problem_id} — delete
# ═══════════════════════════════════════════════════════════════

@router.delete("/classes/{class_id}/problems/{problem_id}")
def delete_problem(
    class_id: str,
    problem_id: str,
    authorization: str | None = Header(None),
):
    teacher = _get_teacher(authorization)
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    if not ObjectId.is_valid(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem ID")

    result = problems_collection.delete_one({"_id": ObjectId(problem_id), "class_id": class_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Remove from class topics_assigned
    classes_collection.update_one(
        {"_id": ObjectId(class_id)},
        {
            "$pull": {"topics_assigned": problem_id},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    return {"message": "Problem deleted", "problem_id": problem_id}


# ═══════════════════════════════════════════════════════════════
#  GET /classes/{class_id}/analytics — Heatmap matrix
#  Rows = students, Columns = problems, Cells = status
# ═══════════════════════════════════════════════════════════════

@router.get("/classes/{class_id}/analytics")
def class_analytics(class_id: str, authorization: str | None = Header(None)):
    teacher = _get_teacher(authorization)
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Invalid class ID")
    cls = classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls or cls["instructor_id"] != str(teacher["_id"]):
        raise HTTPException(status_code=404, detail="Class not found")

    student_ids = cls.get("students", [])
    problem_ids = [pid for pid in cls.get("topics_assigned", []) if ObjectId.is_valid(pid)]

    # Batch-fetch all problems in one query (avoids N+1)
    problems_map = {}
    if problem_ids:
        for p in problems_collection.find({"_id": {"$in": [ObjectId(pid) for pid in problem_ids]}}):
            problems_map[str(p["_id"])] = p

    columns = []
    for pid in problem_ids:
        p = problems_map.get(pid)
        columns.append({
            "problem_id": pid,
            "title": p["title"] if p else "Unknown",
            "difficulty": p.get("difficulty", "") if p else "",
        })

    # Build rows
    rows = []
    for sid in student_ids:
        u = users_collection.find_one({"_id": ObjectId(sid)})
        if not u:
            continue

        # Fetch all progress records for this student
        student_progress = list(progress_collection.find({"user_id": sid}))
        progress_map = {sp["question_id"]: sp for sp in student_progress}

        cells = []
        for pid in problem_ids:
            p = progress_map.get(pid)
            if p:
                cells.append({
                    "status": p["status"],
                    "viva_score": p.get("viva_score", 0),
                    "attempts": p.get("attempts", 0),
                })
            else:
                cells.append({
                    "status": "not_started",
                    "viva_score": 0,
                    "attempts": 0,
                })

        mastered = sum(1 for c in cells if c["status"] == "mastered")
        rows.append({
            "student_id": sid,
            "student_name": u["full_name"],
            "email": u["email"],
            "cells": cells,
            "mastered_count": mastered,
            "total_problems": len(problem_ids),
        })

    return {
        "class_id": class_id,
        "class_name": cls["name"],
        "columns": columns,
        "rows": rows,
        "student_count": len(rows),
        "problem_count": len(columns),
    }


# ═══════════════════════════════════════════════════════════════
#  Student join via cohort code
# ═══════════════════════════════════════════════════════════════

@router.post("/join")
def join_class(
    body: JoinClassRequest,
    authorization: str | None = Header(None),
):
    """Student joins a class using a cohort code. Uses JWT to identify student."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    student_id = payload["sub"]
    cls = classes_collection.find_one({"cohort_code": body.cohort_code, "is_active": True})
    if not cls:
        raise HTTPException(status_code=404, detail="Invalid class code")

    if student_id in cls.get("students", []):
        return {"message": "Already enrolled", "class_id": str(cls["_id"]), "class_name": cls["name"]}

    classes_collection.update_one(
        {"_id": cls["_id"]},
        {"$addToSet": {"students": student_id}, "$set": {"updated_at": datetime.utcnow()}},
    )

    return {"message": "Joined class", "class_id": str(cls["_id"]), "class_name": cls["name"]}


# ═══════════════════════════════════════════════════════════════
#  GET /problems/{problem_id} — public fetch for workbench
# ═══════════════════════════════════════════════════════════════

@router.get("/problems/{problem_id}")
def get_problem(problem_id: str):
    """Fetch a single problem by ID (used by student workbench)."""
    if not ObjectId.is_valid(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem ID")

    p = problems_collection.find_one({"_id": ObjectId(problem_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Strip hidden test cases and viva answer keywords (student-facing endpoint)
    test_cases = p.get("test_cases", [])
    safe_test_cases = [
        {
            "input": tc.get("input", ""),
            "expected_output": tc.get("expected_output", ""),
            "explanation": tc.get("explanation", ""),
        }
        for tc in test_cases
        if not tc.get("is_hidden", False)
    ]

    safe_viva = [
        {"id": vq.get("id", ""), "question": vq.get("question", "")}
        for vq in p.get("viva_questions", [])
    ]

    return {
        "id": str(p["_id"]),
        "title": p["title"],
        "description": p.get("description", ""),
        "difficulty": p.get("difficulty", "beginner"),
        "topic": p.get("topic", ""),
        "target_concepts": p.get("target_concepts", []),
        "test_cases": safe_test_cases,
        "viva_questions": safe_viva,
        "starter_code": p.get("starter_code", ""),
        "status": p.get("status", "draft"),
    }


# ═══════════════════════════════════════════════════════════════
#  GET /students/{student_id}/transcript — chat history for analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/students/{student_id}/transcript")
def get_student_transcript(
    student_id: str,
    authorization: str | None = Header(None),
):
    """Fetch a student's Socratic chat transcript (teacher only)."""
    teacher = _get_teacher(authorization)

    session = sessions_collection.find_one({"user_id": student_id})
    if not session:
        return {"student_id": student_id, "history": []}

    return {
        "student_id": student_id,
        "history": session.get("conversation_history", []),
        "current_question_id": session.get("current_question_id"),
    }
