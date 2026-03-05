"""API Routes — CogniCode Intelligence Microservice  (v2.4.0).

All endpoints are prefixed with /api (set in main.py).

Active routes:
  POST /analyze                  Raw AST analysis  (utility)
  POST /agent/chat               Unified agentic orchestration  (primary)
  POST /problems/generate-tests  Teacher: LLM-generated test cases
"""
import logging
from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    ChatRequest, ChatResponse,
    TestCaseGenerateRequest, TestCaseGenerateResponse,
)
from app.services.ast_parser import ASTParser, SecurityException
from app.services.orchestrator import run_turn
from app.services.test_case_generator import generate_test_cases

router = APIRouter()
logger = logging.getLogger("sapiocode.routes")
_parser = ASTParser()


# ═══════════════════════════════════════════════════════════════
#  /analyze — Raw AST Analysis  (utility)
# ═══════════════════════════════════════════════════════════════

@router.post("/analyze", response_model=AnalyzeResponse, summary="Analyze code structure via AST")
async def post_analyze(req: AnalyzeRequest):
    """
    Utility endpoint — returns raw AST analysis without LLM involvement.
    Useful for the frontend to display code structure insights.
    """
    result = _parser.analyze(req.code, req.language)
    return AnalyzeResponse(
        is_valid=result.is_valid,
        algorithm_pattern=result.algorithm_pattern.value,
        approach_summary=result.student_approach_summary,
        functions=[fp.name for fp in result.function_profiles],
        data_structures=result.data_structures_used,
        concepts=result.concepts_detected,
        issues=[
            {
                "type": loc.issue_type.value,
                "line": loc.line,
                "description": loc.description,
                "suggestion": loc.suggestion,
            }
            for loc in result.issue_locations
        ],
        complexity_score=result.complexity_score,
        max_nesting_depth=result.max_nesting_depth,
        has_recursion=result.has_recursion,
        loop_count=result.loop_count,
    )


# ═══════════════════════════════════════════════════════════════
#  /agent/chat — Unified Agentic Orchestration  (primary)
# ═══════════════════════════════════════════════════════════════

@router.post("/agent/chat", response_model=ChatResponse, summary="Unified agentic Socratic orchestration")
async def post_agent_chat(req: ChatRequest, request: Request):
    """
    The primary endpoint for all student interactions.

    Routes to one of four tools based on `mode`:
      hint        → affect-routed Socratic hint  (gentle / socratic / challenge)
      chat        → free-form Socratic follow-up dialogue
      viva_start  → generate viva voce questions from the student's code
      viva_answer → submit an answer and receive feedback / verdict

    Conversation history and viva session state are persisted across calls
    via MemorySaver using thread_id as the key.
    The AI NEVER outputs code — only Socratic guidance.
    """
    rid = getattr(request.state, "request_id", "?")

    result = await run_turn(
        thread_id=req.thread_id,
        mode=req.mode,
        user_message=req.user_message,
        current_code=req.current_code,
        compiler_output=req.compiler_output,
        frustration_score=req.frustration_score,
        problem_description=req.problem_description,
        failed_test_cases=[tc.model_dump() for tc in req.failed_test_cases],
        editor_context=req.editor_context.model_dump(),
    )

    logger.info(
        "req=%s | orchestrator | thread=%s mode=%s tool=%s turn=%d",
        rid, req.thread_id, req.mode,
        result.get("tool_used", "?"), result.get("turn_count", 0),
    )

    return ChatResponse(
        thread_id=result["thread_id"],
        response=result["response"],
        turn_count=result["turn_count"],
        tool_used=result["tool_used"],
        ast_metadata=result["ast_metadata"],
        teaching_focus=result["teaching_focus"],
        viva_data=result.get("viva_data"),
    )


# ═══════════════════════════════════════════════════════════════
#  /problems/generate-tests — Teacher Test-Case Generation
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/problems/generate-tests",
    response_model=TestCaseGenerateResponse,
    summary="Generate diverse test cases for a coding problem (teacher tool)",
)
async def post_generate_tests(req: TestCaseGenerateRequest, request: Request):
    """
    Teacher endpoint: given a problem description (and optional reference solution),
    use the LLM to generate a diverse suite of test cases (happy path, edge cases,
    adversarial, large inputs).

    The AI is instructed to return valid JSON that maps directly to
    `TestCaseGenerateResponse` — no student interaction required.
    """
    rid = getattr(request.state, "request_id", "?")
    logger.info("req=%s | generate-tests | lang=%s n=%d", rid, req.language, req.num_cases)

    result = await generate_test_cases(
        description=req.problem_description,
        sample_solution=req.sample_solution,
        language=req.language,
        num_cases=req.num_cases,
        difficulty_spread=req.difficulty_spread,
    )
    return result
