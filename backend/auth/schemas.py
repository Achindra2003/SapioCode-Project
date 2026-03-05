from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Any, Dict, Optional, List, Literal, Union
from datetime import datetime
import re


# ═══════════════════════════════════════════════════════════════
#  Auth schemas
# ═══════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: Literal["student", "teacher"] = "student"

    @field_validator("full_name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z\u00C0-\u024F\s\.\-']+$", v.strip()):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v.strip()


class JoinClassRequest(BaseModel):
    cohort_code: str = Field(..., min_length=4, max_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserResponse


# ═══════════════════════════════════════════════════════════════
#  Progress schemas
# ═══════════════════════════════════════════════════════════════

class ProgressCompleteRequest(BaseModel):
    user_id: str
    question_id: str
    topic_id: str = ""
    viva_score: float = Field(..., ge=0, le=1)
    viva_verdict: Literal["pass", "weak", "fail"]
    time_spent_seconds: int = Field(..., ge=0)
    test_cases_passed: int = Field(..., ge=0)
    test_cases_total: int = Field(..., ge=0)
    code_snapshot: str = ""


class UserProgressResponse(BaseModel):
    user_id: str
    question_id: str
    topic_id: str
    status: str
    viva_score: float
    viva_verdict: str
    attempts: int
    time_spent_seconds: int
    test_cases_passed: int
    test_cases_total: int
    completed_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════
#  Session schemas
# ═══════════════════════════════════════════════════════════════

class SessionCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)


class SessionMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


# ═══════════════════════════════════════════════════════════════
#  Teacher / Problem schemas
# ═══════════════════════════════════════════════════════════════

class TestCaseSchema(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class VivaQuestionSchema(BaseModel):
    question: str = Field(..., min_length=3)
    expected_answer_keywords: List[str] = []


class CreateProblemRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    topic: str = ""
    target_concepts: List[str] = []
    test_cases: List[TestCaseSchema] = []
    viva_questions: List[VivaQuestionSchema] = []
    status: Literal["draft", "published"] = "draft"
    starter_code: Optional[Union[str, Dict[str, Any]]] = None


class UpdateProblemRequest(BaseModel):
    """Partial update — only supplied fields are changed."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    difficulty: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    topic: Optional[str] = None
    target_concepts: Optional[List[str]] = None
    test_cases: Optional[List[TestCaseSchema]] = None
    viva_questions: Optional[List[VivaQuestionSchema]] = None
    status: Optional[Literal["draft", "published"]] = None
    starter_code: Optional[Union[str, Dict[str, Any]]] = None


class CreateClassRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
