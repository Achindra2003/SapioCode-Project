# backend/main.py
"""
SapioCode BKT Cognitive Engine — Role 3 Backend
Serves on port 8001 as expected by the team's integration bridge.

Endpoints:
  GET  /                          → Health check
  POST /submit                    → BKT submission (core)
  GET  /mastery/{student_id}      → Student mastery snapshot
  GET  /mastery/{student_id}/history → Mastery history timeline
  GET  /navigation/{student_id}   → Recommended next concept
  GET  /curriculum/{student_id}   → Full curriculum with states
  POST /analytics/class           → Class-level mastery heatmap
  POST /analytics/at-risk         → At-risk students
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from backend.schemas import SubmissionRequest, SubmitResponse
from db.neo4j import get_session
from bkt.pipeline import process_submission_bkt
from bkt.config import MASTERY_THRESHOLD
from backend.auth_routes import router as auth_router


# ─── App Setup ────────────────────────────────────
app = FastAPI(
    title="SapioCode BKT Cognitive Engine",
    description="Role 3: Bayesian Knowledge Tracing with affect-aware modulation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# ─── Health Check ─────────────────────────────────
@app.get("/")
def health_check():
    """Health check endpoint — probed by integration bridge."""
    return {
        "service": "SapioCode BKT Engine",
        "status": "running",
        "role": 3,
        "port": 8001,
        "mastery_threshold": MASTERY_THRESHOLD,
    }


# ─── Core Submission ──────────────────────────────
@app.post("/submit")
def submit(request: SubmissionRequest):
    """
    Process a student submission through the BKT pipeline.
    
    Accepts cognitive state from the perception engine for
    affect-aware parameter modulation.
    """
    try:
        with get_session() as session:
            updates = process_submission_bkt(
                neo4j_session=session,
                sid=request.sid,
                sub_id=request.sub_id,
                correct=request.correct,
                cognitive_state=request.cognitive_state,
            )

        return {
            "status": "success",
            "message": "Submission processed with affect-aware BKT.",
            "mastery_updates": updates,
        }
    except Exception as e:
        print(f"[ERROR] Submit endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )


# ─── Mastery Snapshot ─────────────────────────────
@app.get("/mastery/{student_id}")
def get_mastery(student_id: str):
    """Get current mastery for all concepts a student has attempted."""
    try:
        with get_session() as session:
            results = session.run(
                """
                MATCH (s:Student {sid: $sid})-[m:MASTERY]->(c:Concept)
                RETURN c.name AS concept, m.p AS mastery
                ORDER BY m.p ASC
                """,
                sid=student_id,
            )
            concepts = {}
            for record in results:
                concepts[record["concept"]] = {
                    "mastery": record["mastery"],
                    "is_mastered": record["mastery"] >= MASTERY_THRESHOLD,
                }

        weakest = sorted(concepts.keys(), key=lambda c: concepts[c]["mastery"])[:3]
        total = sum(v["mastery"] for v in concepts.values())
        avg = total / len(concepts) if concepts else 0.0

        return {
            "student_id": student_id,
            "concepts": concepts,
            "weakest_concepts": weakest,
            "overall_mastery": round(avg, 4),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Mastery History ──────────────────────────────
@app.get("/mastery/{student_id}/history")
def get_mastery_history(student_id: str, concept: Optional[str] = None):
    """
    Get timestamped mastery history for a student.
    Optionally filter by concept.
    """
    from analytics.mastery_history import get_history_store
    store = get_history_store()
    if concept:
        history = store.get_concept_history(student_id, concept)
    else:
        history = store.get_all_history(student_id)
    return {
        "student_id": student_id,
        "concept_filter": concept,
        "snapshots": history,
    }


# ─── Navigation ──────────────────────────────────
@app.get("/navigation/{student_id}")
def get_navigation(student_id: str):
    """Get recommended next concept based on ZPD."""
    from navigation.recommend import get_recommendation_engine
    engine = get_recommendation_engine()
    recommendation = engine.get_next_recommended(student_id)
    weakest = engine.get_weakest_concepts(student_id)
    return {
        "student_id": student_id,
        "recommended": recommendation,
        "weakest_concepts": weakest,
    }


@app.get("/curriculum/{student_id}")
def get_curriculum(student_id: str):
    """Get full curriculum with lock/unlock states for a student."""
    from navigation.recommend import get_recommendation_engine
    engine = get_recommendation_engine()
    curriculum = engine.get_curriculum(student_id)
    return {
        "student_id": student_id,
        "curriculum": curriculum,
    }


# ─── Class Analytics ──────────────────────────────
class ClassAnalyticsRequest(BaseModel):
    student_ids: List[str] = Field(..., description="List of student IDs")


class AtRiskRequest(BaseModel):
    student_ids: List[str] = Field(..., description="List of student IDs")
    threshold: float = Field(default=0.4, description="Mastery threshold for at-risk")


@app.post("/analytics/class")
def get_class_analytics(request: ClassAnalyticsRequest):
    """Class-level mastery heatmap for teacher dashboard."""
    from analytics.class_analytics import get_analytics_engine
    engine = get_analytics_engine()
    heatmap = engine.get_class_heatmap(request.student_ids)
    return heatmap


@app.post("/analytics/at-risk")
def get_at_risk(request: AtRiskRequest):
    """Identify students below mastery threshold."""
    from analytics.class_analytics import get_analytics_engine
    engine = get_analytics_engine()
    at_risk = engine.get_at_risk_students(request.student_ids, request.threshold)
    return {"threshold": request.threshold, "at_risk_students": at_risk}
