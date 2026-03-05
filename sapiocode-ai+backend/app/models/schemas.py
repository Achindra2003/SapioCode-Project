"""
Pydantic Schemas — API Request / Response models  (v2.4.0).

Endpoints:
  POST /api/analyze                  — raw AST analysis (utility)
  POST /api/agent/chat               — unified agentic orchestration (primary)
  POST /api/problems/generate-tests  — teacher: LLM-generated test cases
"""
from __future__ import annotations

from typing import List, Optional, Dict, Any, Literal, Annotated
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
#  Error models
# ═══════════════════════════════════════════════════════════════

class SecurityErrorResponse(BaseModel):
    """Returned when student code contains blocked imports."""
    error: str = "security_violation"
    detail: str
    blocked_imports: List[str]


# ═══════════════════════════════════════════════════════════════
#  Structured Viva Verdict (used by viva_agent internally)
# ═══════════════════════════════════════════════════════════════

class VivaVerdictStructured(BaseModel):
    """Deterministic structured output for viva verification."""
    status: Literal["PASS", "FAIL", "NEEDS_DETAIL"] = Field(
        ..., description="Overall verdict: PASS, FAIL, or NEEDS_DETAIL"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="LLM confidence in this verdict"
    )
    feedback: str = Field(
        ..., description="Constructive feedback for the student"
    )
    matched_concepts: List[str] = Field(default_factory=list)
    missing_concepts: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════
#  /analyze  — Raw AST analysis (utility endpoint)
# ═══════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field("python")


class AnalyzeResponse(BaseModel):
    is_valid: bool
    algorithm_pattern: str
    approach_summary: str
    functions: List[str]
    data_structures: List[str]
    concepts: List[str]
    issues: List[Dict[str, Any]]
    complexity_score: int
    max_nesting_depth: int = 0
    has_recursion: bool
    loop_count: int


# ═══════════════════════════════════════════════════════════════
#  /api/agent/chat — Unified Agentic Orchestration
# ═══════════════════════════════════════════════════════════════

class EditorContext(BaseModel):
    """Behavioural signals captured by the frontend editor."""
    backspace_rate:          float = Field(0.0, ge=0.0, le=1.0,
        description="Fraction of keystrokes that are backspaces (0–1)")
    paste_count:             int   = Field(0, ge=0,
        description="Number of paste events since session start")
    idle_seconds:            float = Field(0.0, ge=0.0,
        description="Cumulative idle time in seconds")
    run_count:               int   = Field(0, ge=0,
        description="How many times the student has run/tested their code")
    time_on_problem_seconds: float = Field(0.0, ge=0.0,
        description="Total time spent on this problem in seconds")


class FailedTestCase(BaseModel):
    """A single test case that the student's code failed."""
    input:           str
    expected_output: str
    actual_output:   str = ""
    error:           str = ""   # exception message / traceback snippet
    test_case_id:    str = ""


class ChatRequest(BaseModel):
    """
    Payload for the unified agentic orchestration endpoint.

    mode controls which tool the orchestrator invokes:
      "hint"        → affect-routed Socratic hint (gentle / socratic / challenge)
      "chat"        → free-form Socratic follow-up dialogue  (default)
      "viva_start"  → start a post-submission verification session
      "viva_answer" → submit an answer to the active verification question

    Every call requires thread_id for MemorySaver session persistence.
    """
    thread_id: str = Field(
        ..., description="Conversation thread ID for MemorySaver persistence"
    )
    user_message: str = Field(
        ..., min_length=1, description="The student's message or answer"
    )
    current_code: str = Field(
        ..., min_length=1, description="Latest snapshot of the student's code"
    )
    compiler_output: str = Field(
        "", description="stdout + stderr from the code runner"
    )
    problem_description: str = Field(
        "", description="Full problem statement shown to the student"
    )
    failed_test_cases: List[FailedTestCase] = Field(
        default_factory=list,
        description="Test cases the student's code currently fails"
    )
    editor_context: EditorContext = Field(
        default_factory=EditorContext,
        description="Behavioural editor signals (backspace rate, idle time, run count, …)"
    )
    frustration_score: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Composite frustration metric computed by the frontend (0–1)"
    )
    mode: Literal["hint", "chat", "viva_start", "viva_answer"] = Field(
        "chat",
        description=(
            "hint=Socratic hint, chat=follow-up dialogue, "
            "viva_start=begin verification, viva_answer=submit answer"
        ),
    )


class ChatResponse(BaseModel):
    """Response from the unified agentic orchestration endpoint."""
    thread_id: str = Field(..., description="Echo of the conversation thread ID")
    response: str = Field(
        ..., description="The Socratic response (never contains code)"
    )
    turn_count: int = Field(
        ..., description="Total turns in this conversation so far"
    )
    tool_used: str = Field(
        ..., description="Which tool fired: hint/<affect> | chat | viva_start | viva_answer | viva_verdict"
    )
    ast_metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Fresh AST analysis of current code"
    )
    teaching_focus: str = Field(
        "", description="The specific concept targeted this turn"
    )
    viva_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Verification questions list or verdict dict (only populated for viva modes)"
    )


# ═══════════════════════════════════════════════════════════════
#  /api/problems/generate-tests — Teacher test-case generation
# ═══════════════════════════════════════════════════════════════

class TestCaseGenerateRequest(BaseModel):
    """
    Teacher provides a problem description; AI generates diverse test cases.
    Optionally supply a reference solution so the AI can verify expected outputs.
    """
    problem_description: str = Field(..., min_length=20,
        description="Full problem statement (markdown OK)")
    sample_solution:     str = Field("",
        description="Optional reference solution in `language`")
    language:            str = Field("python")
    num_cases:           int = Field(8, ge=2, le=20,
        description="Number of test cases to generate")
    difficulty_spread:   bool = Field(True,
        description="Include edge cases, large inputs, and adversarial inputs")


class GeneratedTestCase(BaseModel):
    input:           str
    expected_output: str
    explanation:     str = ""   # why this case is interesting
    category:        str = ""   # 'happy_path' | 'edge_case' | 'adversarial' | 'large_input'


class TestCaseGenerateResponse(BaseModel):
    problem_title: str
    language:      str
    test_cases:    List[GeneratedTestCase]
    notes:         str = ""   # AI commentary on coverage


# ═══════════════════════════════════════════════════════════════
#  /api/problems/generate-tests — Teacher test-case generation
# ═══════════════════════════════════════════════════════════════

class TestCaseGenerateRequest(BaseModel):
    """
    Teacher provides a problem description; AI generates diverse test cases.
    Optionally supply a reference solution so the AI can verify expected outputs.
    """
    problem_description: str = Field(..., min_length=20,
        description="Full problem statement (markdown OK)")
    sample_solution:     str = Field("",
        description="Optional reference solution in `language`")
    language:            str = Field("python")
    num_cases:           int = Field(8, ge=2, le=20,
        description="Number of test cases to generate")
    difficulty_spread:   bool = Field(True,
        description="Include edge cases, large inputs, and adversarial inputs")


class GeneratedTestCase(BaseModel):
    input:           str
    expected_output: str
    explanation:     str   = ""   # why this case is interesting
    category:        str   = ""   # 'happy_path' | 'edge_case' | 'adversarial' | 'large_input'


class TestCaseGenerateResponse(BaseModel):
    problem_title: str
    language:      str
    test_cases:    List[GeneratedTestCase]
    notes:         str = ""   # AI commentary on coverage
