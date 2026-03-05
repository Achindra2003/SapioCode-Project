# backend/schemas.py

from pydantic import BaseModel, Field
from typing import Optional, List


class SubmissionRequest(BaseModel):
    """Request schema for BKT submission endpoint.
    
    Matches the contract expected by the team's integration bridge:
    POST /submit with {sid, sub_id, correct, cognitive_state}
    """
    sid: str = Field(..., description="Student ID")
    sub_id: str = Field(..., description="Submission ID")
    correct: bool = Field(..., description="Whether the submission was correct")
    cognitive_state: Optional[dict] = Field(
        default=None,
        description="Cognitive state from perception engine: {engagement, frustration, confusion, boredom}"
    )


class MasteryUpdate(BaseModel):
    """Single concept mastery update result."""
    concept: str
    old_mastery: float
    new_mastery: float
    mastery_delta: float
    is_mastered: bool = False
    explanation: str = ""


class SubmitResponse(BaseModel):
    """Response schema for BKT submission endpoint."""
    status: str
    message: str
    mastery_updates: List[MasteryUpdate] = []


class StudentMasteryResponse(BaseModel):
    """Response schema for student mastery snapshot."""
    student_id: str
    concepts: dict = {}
    weakest_concepts: List[str] = []
    overall_mastery: float = 0.0


class NavigationResponse(BaseModel):
    """Response schema for navigation recommendation."""
    student_id: str
    recommended_concept: Optional[dict] = None
    curriculum: List[dict] = []
