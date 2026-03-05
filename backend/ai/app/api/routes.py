"""API Routes — CogniCode Intelligence Microservice  (v3.0.0).

All endpoints are prefixed with /api (set in main.py).

Active routes:
  POST /analyze                  Raw AST analysis  (utility)
  POST /agent/chat               Unified agentic orchestration  (primary)
  POST /problems/generate-tests  Teacher: LLM-generated test cases  (via orchestrator)
  POST /problems/generate        Teacher: full AI problem gen  (via orchestrator)
"""
import logging
import uuid
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form

from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    ChatRequest, ChatResponse,
    TestCaseGenerateRequest, TestCaseGenerateResponse,
)
from app.services.groq_client import get_groq_client
from app.services.ast_parser import ASTParser, SecurityException
from app.services.orchestrator import run_turn

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
        language=req.language,
        viva_session_id=req.viva_session_id,
        starter_code=req.starter_code,
        generate_difficulty=req.generate_difficulty,
        sample_solution=req.sample_solution,
        num_cases=req.num_cases,
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
        generate_data=result.get("generate_data"),
    )


# ═══════════════════════════════════════════════════════════════
#  /viva/transcribe — Groq Whisper Speech-to-Text
# ═══════════════════════════════════════════════════════════════

@router.post("/viva/transcribe", summary="Transcribe audio via Groq Whisper")
async def post_viva_transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    """
    Accepts an audio file (webm/wav/mp3) and returns the transcription.
    Uses Groq Whisper (whisper-large-v3-turbo).
    """
    audio_bytes = await audio.read()

    if len(audio_bytes) < 500:
        raise HTTPException(status_code=400, detail="Audio too short — please speak for at least 2 seconds.")

    try:
        client = get_groq_client()
        result = await client.transcribe(
            audio_bytes=audio_bytes,
            filename=audio.filename or "recording.webm",
            language=language,
        )

        if not result.get("text"):
            raise HTTPException(status_code=422, detail="Could not transcribe audio. Try speaking louder or clearer.")

        return {
            "success": True,
            "text": result["text"],
            "duration_seconds": result.get("duration", 0.0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Whisper transcription failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  /problems/generate-tests — Teacher Test-Case Generation
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/problems/generate-tests",
    response_model=TestCaseGenerateResponse,
    summary="Generate diverse test cases for a coding problem (teacher tool — via orchestrator)",
)
async def post_generate_tests(req: TestCaseGenerateRequest, request: Request):
    """
    Teacher endpoint: given a problem description (and optional reference solution),
    route through the LangGraph orchestrator (mode=generate_tests) to produce
    a diverse suite of test cases (happy path, edge cases, adversarial, large inputs).

    The orchestrator delegates to the test_case_generator tool node.
    """
    rid = getattr(request.state, "request_id", "?")
    logger.info("req=%s | generate-tests (orchestrated) | lang=%s n=%d", rid, req.language, req.num_cases)

    thread_id = f"gen-tests-{uuid.uuid4().hex[:8]}"
    result = await run_turn(
        thread_id=thread_id,
        mode="generate_tests",
        user_message=req.problem_description,
        problem_description=req.problem_description,
        sample_solution=req.sample_solution,
        language=req.language,
        num_cases=req.num_cases,
    )

    gen_data = result.get("generate_data")
    if not gen_data or "generate_tests_error" in result.get("tool_used", ""):
        raise HTTPException(status_code=500, detail=result.get("response", "Test generation failed"))

    return TestCaseGenerateResponse(**gen_data)


# ═══════════════════════════════════════════════════════════════
#  /problems/generate — Full AI Problem Generation (teacher tool)
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/problems/generate",
    summary="Generate a complete coding problem from a topic prompt (teacher tool — via orchestrator)",
)
async def post_generate_problem(request: Request, prompt: str = "", difficulty: str = "intermediate", language: str = "python"):
    """
    Teacher endpoint: given a topic / prompt, route through the LangGraph
    orchestrator (mode=generate_problem) to generate a complete problem
    with title, description, test cases, viva questions, and starter code.

    Accepts JSON body: { "prompt": "...", "difficulty": "...", "language": "..." }
    """
    # Support both query params and JSON body
    if not prompt:
        try:
            body = await request.json()
            prompt = body.get("prompt", body.get("problem_description", ""))
            difficulty = body.get("difficulty", difficulty)
            language = body.get("language", language)
        except Exception:
            pass

    if not prompt or len(prompt) < 5:
        raise HTTPException(status_code=400, detail="Prompt must be at least 5 characters")

    rid = getattr(request.state, "request_id", "?")
    logger.info("req=%s | generate-problem (orchestrated) | difficulty=%s lang=%s", rid, difficulty, language)

    thread_id = f"gen-prob-{uuid.uuid4().hex[:8]}"
    result = await run_turn(
        thread_id=thread_id,
        mode="generate_problem",
        user_message=prompt,
        generate_difficulty=difficulty,
        language=language,
    )

    gen_data = result.get("generate_data")
    if not gen_data or "generate_problem_error" in result.get("tool_used", ""):
        raise HTTPException(status_code=500, detail=result.get("response", "Problem generation failed"))

    return gen_data
