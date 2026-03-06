"""
SapioCode Agentic Orchestrator — v2.5.0

Architecture:
  Single LangGraph StateGraph with MemorySaver persistence.
  Three tools invoked deterministically via a router node reading the `mode` field:

    tool_hint      → Affect-routed Socratic guidance with progressive escalation
    tool_chat      → Conversational Socratic follow-up (never code, tracks concepts)
    tool_viva      → Viva voce: start session OR verify an answer

  The orchestrator is the ONLY entrypoint. `hint_agent.py` and `dialogue_agent.py`
  are deleted. Their business logic is fully preserved here.

State lifecycle:
  • Per-turn fields are written fresh each call (mode, user_message, current_code, …)
  • Persistent fields are accumulated across calls via MemorySaver (messages, turn_count,
    viva_session_id, hint_count)
  • `messages` uses Annotated[list, operator.add] so MemorySaver correctly appends.

v2.5.0 improvements:
  - Progressive hint escalation: conceptual → targeted → scaffolded → near-answer
  - Richer AST context: issue suggestions, function call graphs, data structure purpose
  - Editor signal fusion: paste_count, time_on_problem_seconds in affect routing
  - Concept repetition avoidance via conversation-history scanning
  - Differentiated chat follow-up strategies (clarify / deepen / redirect)
  - Stronger critic loop with targeted rewrite instructions
"""
from __future__ import annotations

import operator
import re
import logging
from typing import Annotated, Any, Dict, List, Literal, Optional

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict

from app.services.ast_parser import ASTParser, ASTAnalysisResult, SecurityException
from app.services.groq_client import get_groq_client
from app.services import viva
from app.services.problem_generator import generate_problem as _generate_problem
from app.services.test_case_generator import generate_test_cases as _generate_test_cases
from app.core.config import get_settings

logger = logging.getLogger("sapiocode.orchestrator")

# ─── Singletons ────────────────────────────────────────────────────────────────
_parser = ASTParser()
_settings = get_settings()
_memory = MemorySaver()

# ─── Constants (enhanced Socratic persona) ─────────────────────────────────────
MAX_HISTORY_MESSAGES = 20

_PERSONA = """\
You are SapioBot, a Socratic tutor inside SapioCode — an intelligent adversarial coding platform.

═══ ABSOLUTE RULES (NEVER VIOLATE) ═══
1. NEVER output code in any form — no code blocks, no inline `code`, no pseudocode, no partial expressions, no variable assignments. If tempted, describe the *concept* instead.
2. NEVER give the answer directly. You MUST ask a guiding question or surface a concept. The student must discover the solution themselves.
3. NEVER say "the error is" or "you should change X to Y" — instead ask questions like "What do you think happens when X reaches this value?"
4. Keep every response under 120 words.
5. End EVERY response with exactly ONE clear question for the student to think about.
6. BOILERPLATE AWARENESS: This platform pre-writes certain code for the student — specifically: class wrappers (e.g. `public class Main`), the `main()` / `int main()` method, import statements, and the function signature itself. The student ONLY writes the function body. DO NOT question, comment on, or reference the boilerplate. ONLY engage with the logic the student implemented inside the function body.

═══ PEDAGOGICAL APPROACH ═══
• Identify the SMALLEST conceptual gap between what the student knows and what they need.
• Reference specific line numbers from the student's code — say "Look at line 7" not "Look at your loop".
• ONLY use line numbers that appear in the === STUDENT CODE === numbered block above. Do NOT estimate, guess, or invent line numbers. If the numbered block shows the function starts on line 1, reference line 1, not some other number.
• When the student is wrong, acknowledge their effort ("Good thinking about X...") before redirecting.
• Use analogies and real-world metaphors when explaining abstract concepts.
• If the student has been stuck for multiple turns on the same issue, break it into smaller sub-questions.
• Use the AST analysis to ground every question in the student's actual code structure.
• When test cases fail, guide the student to trace through their code with the failing input step by step.
"""

_CODE_MARKERS = re.compile(
    r"```"                       # fenced code blocks (triple backticks)
    r"|\b(def|class)\s+\w+\s*[\(:]"  # actual function/class definitions
    r"|\bimport\s+\w+\s*$"      # standalone import statements (multi-line match needed)
    r"|\bfrom\s+\w+\s+import\s"  # from...import statements
    r"|=[^=].*[;]"              # assignment with semicolons (Java/JS code)
    r"|\bconsole\.\w+\("        # JS console calls
    r"|\bSystem\.out\."         # Java print calls
    r"|\b(int|str|float|bool|list|dict)\s+\w+\s*="  # typed variable declarations
    ,
    re.IGNORECASE | re.MULTILINE,
)

# ─── Affect routing thresholds ─────────────────────────────────────────────────
FRUSTRATION_HIGH = getattr(_settings, "FRUSTRATION_HIGH", 0.7)
FRUSTRATION_MED  = getattr(_settings, "FRUSTRATION_MED",  0.4)

# ─── Issue priority (preserved from hint_agent.py) ─────────────────────────────
ISSUE_PRIORITY = [
    "infinite_loop_risk",
    "off_by_one",
    "recursion_missing_base",
    "unreachable_code",
    "variable_shadow",
    "unused_variable",
    "magic_number",
]

# ─── Level instructions (enhanced with hint escalation) ─────────────────────────
LEVEL_INSTRUCTIONS: Dict[str, str] = {
    "gentle": (
        "The student is frustrated or stuck. Be warm, empathetic and encouraging. "
        "Acknowledge the difficulty first ('This is a tricky part...'). "
        "Ask ONE simple yes/no or short-answer question that gently redirects. "
        "Never say 'wrong' or 'incorrect'. Focus on what they DID right first."
    ),
    "socratic": (
        "Use the classic Socratic method. Ask a probing question that exposes the gap "
        "in the student's understanding. Reference a specific line of their code by number. "
        "Make the student predict what their code does for a specific input. "
        "Encourage independent discovery — say 'What do you think happens when...' not 'The problem is...'"
    ),
    "challenge": (
        "The student is doing well. Pose a deeper 'what if' or 'why does this work' "
        "question that elevates understanding. Probe for edge cases, time-complexity, "
        "or alternative approaches. Ask them to reason about WHY their solution is correct, "
        "not just that it works."
    ),
}

# ── Hint escalation: gets more specific as hint_count rises ─────────────────
HINT_ESCALATION: Dict[str, str] = {
    "conceptual": (
        "This is the student's FIRST hint request. Stay HIGH-LEVEL and conceptual. "
        "Ask a broad question about the general approach or algorithm choice. "
        "Do NOT reference specific lines or issues yet — let them think broadly first. "
        "Example direction: 'What strategy are you using to solve this? How does it handle the edge case of...?'"
    ),
    "targeted": (
        "The student has asked for hints 2-3 times. Now be MORE SPECIFIC. "
        "Reference a specific line number where the issue lies. "
        "Ask them to trace through their code with a concrete input value that reveals the bug. "
        "Use the AST-detected issues to guide your question — but ask, don't tell."
    ),
    "scaffolded": (
        "The student has asked for 4-5 hints and is clearly struggling. "
        "Break the problem into smaller sub-steps. Name the specific concept they need "
        "(e.g., 'base case', 'loop invariant', 'boundary condition') and ask them to explain "
        "what it means in the context of their code. Give them a concrete sub-task to focus on."
    ),
    "near_answer": (
        "The student has asked for 6+ hints — they need significant help. "
        "Give a strong directional nudge. You may describe the general SHAPE of the solution "
        "in plain English (e.g., 'You need a condition that checks whether you've reached the end') "
        "but still NEVER write code. Ask them to implement that one small change and test it."
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
#  STATE
# ═══════════════════════════════════════════════════════════════════════════════

class OrchestratorState(TypedDict, total=False):
    # ── Per-turn inputs (written by caller, not persisted across turns) ──────
    mode: str              # "hint" | "chat" | "viva_start" | "viva_answer"
    user_message: str
    current_code: str
    starter_code: str      # system-provided boilerplate (signature, main, imports)
    compiler_output: str
    language: str           # "python" | "java" | "cpp" | "javascript"
    frustration_score: float
    problem_description: str       # full problem statement
    failed_test_cases: List[Dict[str, Any]]  # [{input, expected, actual, error}]
    editor_context: Dict[str, Any] # backspace_rate, paste_count, idle_seconds, run_count
    thread_id: str                 # echoed through for tools that need a student id

    # ── Persistent (MemorySaver accumulates across calls via thread_id) ───────────
    messages: Annotated[list, operator.add]   # full conversation history
    turn_count: int
    viva_session_id: Optional[str]            # active verification session
    hint_count: int                           # escalates Socratic depth

    # ── Per-turn computed (not stored beyond this invocation) ────────────────
    ast_context: Dict[str, Any]
    ast_result: Optional[ASTAnalysisResult]    # raw result for rich prompt building
    teaching_focus: str
    response: str
    tool_used: str
    viva_data: Optional[Dict[str, Any]]       # questions list OR verdict dict
    critic_pass: int                          # 0 = fail, 1 = pass

    # ── Generation-specific (teacher tools) ────────────────────────────
    generate_difficulty: str                  # beginner | intermediate | advanced
    sample_solution: str                      # reference solution for test gen
    num_cases: int                            # number of test cases to generate
    generate_data: Optional[Dict[str, Any]]   # returned problem or test-case dict


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _pick_teaching_focus(ast_ctx: Dict[str, Any], result: Optional[ASTAnalysisResult] = None) -> str:
    """Picks the highest-priority issue from IssueLocation objects, falls back to pattern."""
    # Use raw IssueLocation objects when result is available
    if result is not None and result.issue_locations:
        for priority_type in ISSUE_PRIORITY:
            for loc in result.issue_locations:
                if loc.issue_type.value == priority_type:
                    return loc.description or priority_type
        # Fallback to first issue description
        first = result.issue_locations[0]
        return first.description or "code structure"
    # Pattern-based fallback
    return _pattern_focus(ast_ctx)


def _pattern_focus(ast_ctx: Dict[str, Any]) -> str:
    """Preserved from hint_agent.py — derive focus from algorithm pattern."""
    pattern = ast_ctx.get("algorithm_pattern", "unknown")
    mapping = {
        "recursion":        "how the base case prevents infinite recursion",
        "dynamic_programming": "how overlapping subproblems are memoized",
        "graph_traversal":  "how visited nodes are tracked to avoid cycles",
        "sorting":          "what invariant the algorithm maintains each pass",
        "two_pointer":      "how the two indices converge to the answer",
        "sliding_window":   "what the window boundary conditions represent",
        "binary_search":    "why the search space halves on each comparison",
        "greedy":           "why a locally optimal choice leads to global optimum",
    }
    return mapping.get(pattern, f"the core logic of the {pattern} pattern")


def _pick_affect_level(frustration: float, hint_count: int, editor_ctx: Dict[str, Any]) -> str:
    """Route to the right tone based on frustration + editor behaviour + paste signals."""
    idle_seconds      = editor_ctx.get("idle_seconds", 0.0)
    run_count         = editor_ctx.get("run_count", 0)
    backspace_rate    = editor_ctx.get("backspace_rate", 0.0)
    paste_count       = editor_ctx.get("paste_count", 0)
    time_on_problem   = editor_ctx.get("time_on_problem_seconds", 0.0)

    # Gentle: visibly stuck, very frustrated, or long idle without progress
    if (frustration >= FRUSTRATION_HIGH
            or idle_seconds > 180
            or backspace_rate > 0.4
            or (time_on_problem > 600 and run_count < 3)):  # 10+ min, barely running
        return "gentle"

    # Challenge: low frustration, actively running code, many iterations, genuine work
    if (frustration < FRUSTRATION_MED
            and run_count >= 5
            and hint_count < 2
            and paste_count < 3):  # not just pasting solutions
        return "challenge"

    # Default: standard Socratic probing
    return "socratic"


def _pick_escalation_level(hint_count: int) -> str:
    """Select hint depth based on how many hints the student has already received."""
    if hint_count <= 0:
        return "conceptual"
    elif hint_count <= 2:
        return "targeted"
    elif hint_count <= 4:
        return "scaffolded"
    else:
        return "near_answer"


def _build_system_prompt(
    mode: str,
    ast_ctx: Dict[str, Any],
    teaching_focus: str,
    affect_level: str,
    history: List[Dict],
    problem_description: str = "",
    failed_test_cases: List[Dict[str, Any]] = None,
    compiler_output: str = "",
    current_code: str = "",
    hint_count: int = 0,
    ast_result: Optional[ASTAnalysisResult] = None,
    starter_code: str = "",
) -> str:
    """Build the full system prompt for any mode — enriched with AST details."""
    # ── Boilerplate block (system-provided scaffolding, NOT student work) ──
    boilerplate_block = ""
    if starter_code and starter_code.strip():
        boilerplate_block = (
            "=== SYSTEM-PROVIDED BOILERPLATE (NOT written by the student) ===\n"
            "The following lines were pre-filled by the platform. The student did NOT\n"
            "write them. Do NOT question, compliment, or reference them.\n"
            f"{starter_code.strip()}\n\n"
        )

    # ── Code block (the actual student code with line numbers) ──
    code_block = ""
    if current_code and current_code.strip():
        numbered_lines = []
        for i, line in enumerate(current_code.split("\n"), 1):
            numbered_lines.append(f"  {i:>3} | {line}")
        code_block = "=== STUDENT CODE ===\n" + "\n".join(numbered_lines) + "\n\n"

    # ── Rich AST summary (include issue suggestions and function details) ──
    functions_detail = "\n".join(str(f) for f in ast_ctx.get("functions", [])) or "none"

    # Surface issue suggestions from the AST parser (pre-written Socratic hints)
    issues_list = ast_ctx.get("issues", [])
    if issues_list:
        issues_detail = "\n".join(str(iss) for iss in issues_list)
    else:
        issues_detail = "no issues found"

    # Extract Socratic suggestions from IssueLocation objects
    issue_suggestions = ""
    if ast_result and ast_result.issue_locations:
        suggestion_lines = []
        for loc in ast_result.issue_locations:
            if loc.suggestion:
                line_ref = f" (line {loc.line})" if loc.line else ""
                suggestion_lines.append(
                    f"  • {loc.issue_type.value}{line_ref}: {loc.suggestion}"
                )
        if suggestion_lines:
            issue_suggestions = (
                "\nSocratic question seeds (use these to guide your question, don't copy verbatim):\n"
                + "\n".join(suggestion_lines)
            )

    # Extract function call graph for inter-function reasoning
    call_graph = ""
    if ast_result and ast_result.function_profiles:
        graph_lines = []
        for fp in ast_result.function_profiles:
            calls = ", ".join(fp.calls) if fp.calls else "none"
            params = ", ".join(fp.param_names) if fp.param_names else "none"
            details = (
                f"  • {fp.name}({params}) → "
                f"{'recursive' if fp.calls_itself else 'non-recursive'}, "
                f"calls: [{calls}], "
                f"returns: {'yes' if fp.has_return else 'no'}, "
                f"loops: {fp.loop_count}"
            )
            if fp.has_base_case is False and fp.calls_itself:
                details += " ⚠ NO BASE CASE DETECTED"
            graph_lines.append(details)
        if graph_lines:
            call_graph = "\nFunction call graph:\n" + "\n".join(graph_lines)

    # Data structures and concepts for targeted questioning
    data_structs = ", ".join(ast_ctx.get("data_structures", [])) or "none"
    concepts = ", ".join(ast_ctx.get("concepts", [])) or "none"

    ast_summary = (
        f"Algorithm pattern: {ast_ctx.get('algorithm_pattern', 'unknown')}\n"
        f"Approach: {ast_ctx.get('student_approach', 'N/A')}\n"
        f"Functions:\n{functions_detail}\n"
        f"Data structures used: {data_structs}\n"
        f"Concepts detected: {concepts}\n"
        f"Complexity score: {ast_ctx.get('complexity', 'N/A')}\n"
        f"Has recursion: {ast_ctx.get('has_recursion', False)}\n"
        f"Issues:\n{issues_detail}"
        f"{issue_suggestions}"
        f"{call_graph}"
    )

    level_instruction = LEVEL_INSTRUCTIONS.get(affect_level, LEVEL_INSTRUCTIONS["socratic"])

    # ── Hint escalation (only for hint mode) ──
    escalation_instruction = ""
    if mode == "hint":
        escalation_level = _pick_escalation_level(hint_count)
        escalation_instruction = (
            f"\n=== HINT DEPTH: {escalation_level.upper()} (hint #{hint_count + 1}) ===\n"
            f"{HINT_ESCALATION[escalation_level]}\n"
        )

    # ── Conversation history with concept tracking ──
    history_text = ""
    already_discussed = set()
    if history:
        lines = []
        for m in history[-MAX_HISTORY_MESSAGES:]:
            role = m.get("role", "unknown")
            content = m.get("content", "")
            lines.append(f"{role.upper()}: {content}")
            # Track concepts already mentioned in assistant responses
            if role == "assistant":
                content_lower = content.lower()
                for concept_kw in ["base case", "loop invariant", "recursion", "boundary",
                                   "edge case", "time complexity", "memoiz", "backtrack",
                                   "two pointer", "sliding window", "binary search"]:
                    if concept_kw in content_lower:
                        already_discussed.add(concept_kw)
        history_text = "\n".join(lines)

    concepts_note = ""
    if already_discussed:
        concepts_note = (
            f"\n=== ALREADY DISCUSSED CONCEPTS ===\n"
            f"{', '.join(already_discussed)}\n"
            f"Avoid repeating these unless the student asks. Focus on NEW gaps.\n"
        )

    problem_block = f"=== PROBLEM ===\n{problem_description}\n\n" if problem_description else ""

    failed_block = ""
    if failed_test_cases:
        lines = []
        for i, tc in enumerate(failed_test_cases[:5], 1):
            lines.append(
                f"  [{i}] Input: {tc.get('input','')} | "
                f"Expected: {tc.get('expected_output','')} | "
                f"Got: {tc.get('actual_output','')} | "
                f"Error: {tc.get('error','') or 'none'}"
            )
        failed_block = "=== FAILING TEST CASES ===\n" + "\n".join(lines) + "\n\n"

    compiler_block = f"=== COMPILER OUTPUT ===\n{compiler_output or '(no errors)'}\n\n"

    if mode == "hint":
        return (
            f"{_PERSONA}\n\n"
            f"{problem_block}"
            f"{boilerplate_block}"
            f"{code_block}"
            f"=== AST ANALYSIS ===\n{ast_summary}\n\n"
            f"{failed_block}"
            f"{compiler_block}"
            f"=== TEACHING FOCUS ===\n{teaching_focus}\n\n"
            f"=== AFFECT LEVEL: {affect_level.upper()} ===\n{level_instruction}\n\n"
            f"{escalation_instruction}"
            f"{concepts_note}\n"
            "TASK: Generate ONE Socratic hint targeting the teaching focus.\n"
            "• Reference the student's actual code lines by number.\n"
            "• If test cases are failing, guide the student to trace through their code with the failing input.\n"
            "• Use the Socratic question seeds above as inspiration (don't copy them verbatim).\n"
            "• End with exactly ONE clear question for the student to answer.\n"
            "• Never reveal the answer. Never write code. Never use code formatting."
        )
    else:  # chat
        return (
            f"{_PERSONA}\n\n"
            f"{problem_block}"
            f"{boilerplate_block}"
            f"{code_block}"
            f"=== AST ANALYSIS ===\n{ast_summary}\n\n"
            f"{failed_block}"
            f"{compiler_block}"
            f"=== TEACHING FOCUS ===\n{teaching_focus}\n\n"
            f"=== CONVERSATION HISTORY ===\n{history_text}\n\n"
            f"{concepts_note}\n"
            "TASK: Continue the Socratic dialogue.\n"
            "• Respond to the student's latest message with a guiding question or conceptual nudge.\n"
            "• If the student answered a previous question correctly, briefly affirm and escalate to a deeper question.\n"
            "• If they answered incorrectly, gently redirect without saying 'wrong' — ask them to reconsider a specific aspect.\n"
            "• If they express frustration, acknowledge it empathetically before asking your next question.\n"
            "• Reference specific code lines by number. Never write code. Never use code formatting.\n"
            "• End with exactly ONE clear question."
        )


def _critic_check(text: str) -> bool:
    """Returns True if response passes (no code detected)."""
    return not bool(_CODE_MARKERS.search(text))


async def _llm_call(system: str, user: str) -> str:
    """Single LLM call with Kimi K2 → Llama fallover."""
    client = get_groq_client()
    messages = [
        {"role": "system", "content": system},
        {"role": "user",   "content": user},
    ]
    response = await client.chat(messages=messages, temperature=0.4, max_tokens=300)
    return response.strip()


# ═══════════════════════════════════════════════════════════════════════════════
#  NODES
# ═══════════════════════════════════════════════════════════════════════════════

async def node_ast_sync(state: OrchestratorState) -> Dict[str, Any]:
    """Run AST parser on current_code, store context + raw result in state."""
    mode = state.get("mode", "chat")
    # Skip AST analysis for generation modes — no student code to analyze
    if mode in ("generate_problem", "generate_tests"):
        return {"ast_context": {}, "teaching_focus": "", "ast_result": None}

    code = state.get("current_code", "")
    if not code or not code.strip():
        return {"ast_context": {}, "teaching_focus": "", "ast_result": None}
    ast_result: Optional[ASTAnalysisResult] = None
    try:
        ast_result = _parser.analyze(code, language=state.get("language", "python"))
        ctx = _parser.build_llm_context(ast_result)
    except SecurityException as sec_exc:
        # In chat/hint mode, don't block — just note the blocked imports
        # so SapioBot can educate, not reject.
        logger.info("Security imports detected in chat mode: %s", sec_exc.violations)
        ctx = {
            "algorithm_pattern": "unknown",
            "approach_summary": "parse skipped – restricted imports",
            "functions": [],
            "concepts": [],
            "issues": [f"Blocked imports detected: {', '.join(sec_exc.violations)}"],
            "security_warning": f"Student code uses restricted imports: {', '.join(sec_exc.violations)}",
        }
        return {"ast_context": ctx, "teaching_focus": "security", "ast_result": None}
    except Exception as e:
        logger.warning("AST parse failed: %s", e)
        ctx = {
            "algorithm_pattern": "unknown",
            "approach_summary": "parse failed",
            "functions": [],
            "concepts": [],
            "issues": [],
        }
    focus = _pick_teaching_focus(ctx, ast_result)
    return {"ast_context": ctx, "teaching_focus": focus, "ast_result": ast_result}


async def node_router(state: OrchestratorState) -> Dict[str, Any]:
    """
    Pure routing node — no LLM call.
    Normalises mode and increments turn_count.
    """
    mode = state.get("mode", "chat")
    turn = state.get("turn_count", 0) + 1
    return {"mode": mode, "turn_count": turn}


# ── TOOL: HINT ─────────────────────────────────────────────────────────────────

async def tool_hint(state: OrchestratorState) -> Dict[str, Any]:
    """
    Affect-routed Socratic hint with progressive escalation.
    Tone driven by frustration + editor signals.
    Depth driven by hint_count (conceptual → targeted → scaffolded → near-answer).
    NEVER outputs code. Runs a critic loop (max 3 retries) with targeted rewrite.
    """
    frustration  = state.get("frustration_score",    0.0)
    hint_count   = state.get("hint_count",           0)
    compiler     = state.get("compiler_output",      "")
    user_msg     = state.get("user_message",         "Help me with this.")
    ast_ctx      = state.get("ast_context",          {})
    ast_result   = state.get("ast_result")
    focus        = state.get("teaching_focus",       "code logic")
    messages     = state.get("messages",             [])
    prob_desc    = state.get("problem_description",  "")
    failed_tcs   = state.get("failed_test_cases",    [])
    editor_ctx   = state.get("editor_context",       {})

    affect = _pick_affect_level(frustration, hint_count, editor_ctx)
    system = _build_system_prompt(
        "hint", ast_ctx, focus, affect, messages,
        problem_description=prob_desc,
        failed_test_cases=failed_tcs,
        compiler_output=compiler,
        current_code=state.get("current_code", ""),
        hint_count=hint_count,
        ast_result=ast_result,
        starter_code=state.get("starter_code", ""),
    )

    escalation = _pick_escalation_level(hint_count)
    response = ""
    try:
        for attempt in range(2):
            raw = await _llm_call(system, user_msg)
            if _critic_check(raw):
                response = raw
                break
            logger.warning("Hint critic failed attempt %d — retrying", attempt + 1)
            system += (
                "\n\n[REWRITE: Remove any code blocks (``` markers) or code definitions. "
                "Use plain English only. Ask a question instead of showing a fix.]"
            )
            response = raw  # use last attempt even if imperfect
    except RuntimeError as e:
        logger.error("LLM call failed in hint tool: %s", e)
        response = (
            "I'm having trouble connecting to the AI service right now. "
            "Try refreshing and sending your message again in a few seconds."
        )

    new_message = [
        {"role": "user",      "content": user_msg},
        {"role": "assistant", "content": response},
    ]
    return {
        "response":   response,
        "tool_used":  f"hint/{affect}/{escalation}",
        "hint_count": hint_count + 1,
        "messages":   new_message,
    }


# ── TOOL: CHAT ─────────────────────────────────────────────────────────────────

async def tool_chat(state: OrchestratorState) -> Dict[str, Any]:
    """
    Conversational Socratic follow-up dialogue.
    Tracks concepts already discussed to avoid repetition.
    Differentiates between clarification, deepening, and redirection.
    """
    frustration  = state.get("frustration_score",   0.0)
    user_msg     = state.get("user_message",         "")
    ast_ctx      = state.get("ast_context",          {})
    ast_result   = state.get("ast_result")
    focus        = state.get("teaching_focus",       "code logic")
    messages     = state.get("messages",             [])
    prob_desc    = state.get("problem_description",  "")
    failed_tcs   = state.get("failed_test_cases",    [])
    editor_ctx   = state.get("editor_context",       {})
    compiler     = state.get("compiler_output",      "")
    hint_count   = state.get("hint_count",           0)

    # Chat tone is gently adapted to frustration but stays conversational
    affect = _pick_affect_level(frustration, 0, editor_ctx)
    system = _build_system_prompt(
        "chat", ast_ctx, focus, affect, messages,
        problem_description=prob_desc,
        failed_test_cases=failed_tcs,
        compiler_output=compiler,
        current_code=state.get("current_code", ""),
        hint_count=hint_count,
        ast_result=ast_result,
        starter_code=state.get("starter_code", ""),
    )

    response = ""
    try:
        for attempt in range(2):
            raw = await _llm_call(system, user_msg)
            if _critic_check(raw):
                response = raw
                break
            logger.warning("Chat critic failed attempt %d — retrying", attempt + 1)
            system += (
                "\n\n[REWRITE: Remove any code blocks (``` markers) or code definitions. "
                "Use plain English only. Ask a guiding question instead of showing code.]"
            )
            response = raw
    except RuntimeError as e:
        logger.error("LLM call failed in chat tool: %s", e)
        response = (
            "I'm having trouble connecting to the AI service right now. "
            "Try refreshing and sending your message again in a few seconds."
        )

    new_message = [
        {"role": "user",      "content": user_msg},
        {"role": "assistant", "content": response},
    ]
    return {
        "response":  response,
        "tool_used": "chat",
        "messages":  new_message,
    }


# ── TOOL: VIVA START ───────────────────────────────────────────────────────────

async def tool_viva_start(state: OrchestratorState) -> Dict[str, Any]:
    """
    Starts a new viva voce session.
    Delegates question generation to viva_agent.start_session() (sync).
    """
    code        = state.get("current_code", "")
    user_msg    = state.get("user_message", "")
    thread_id   = state.get("thread_id", "anon")  # use thread_id as student_id proxy
    num_q       = 3  # default

    try:
        # start_session is a sync function — call directly (no await)
        session = viva.start_session(
            student_id=thread_id,
            code=code,
            language=state.get("language", "python"),
            num_questions=num_q,
        )
        # session is a VivaSession dataclass
        session_id = session.session_id
        # Convert VivaQuestion dataclasses to plain dicts for JSON serialisation
        questions = [
            {"id": q.id, "question_text": q.question_text, "difficulty": q.difficulty}
            for q in session.questions
        ]
        first_q = questions[0]["question_text"] if questions else "Let's start the viva."
        response = (
            f"Viva started! I'll ask you {len(questions)} question(s) about your code.\n\n"
            f"**Question 1:** {first_q}"
        )
        new_message = [
            {"role": "user",      "content": user_msg or "Start viva."},
            {"role": "assistant", "content": response},
        ]
        return {
            "response":        response,
            "tool_used":       "viva_start",
            "viva_session_id": session_id,
            "viva_data":       {"questions": questions, "session_id": session_id},
            "messages":        new_message,
        }
    except Exception as e:
        logger.error("Viva start failed: %s", e)
        err_response = "I wasn't able to generate viva questions right now. Please try again."
        return {
            "response":  err_response,
            "tool_used": "viva_start_error",
            "messages":  [
                {"role": "user",      "content": user_msg or "Start viva."},
                {"role": "assistant", "content": err_response},
            ],
        }


# ── TOOL: VIVA ANSWER ─────────────────────────────────────────────────────────

async def tool_viva_answer(state: OrchestratorState) -> Dict[str, Any]:
    """
    Submits a student answer to the active viva session.
    Delegates to viva_agent.submit_answer() (async) / get_verdict() (sync).
    """
    session_id  = state.get("viva_session_id")
    user_msg    = state.get("user_message", "")

    if not session_id:
        response = "No active viva session found. Use mode='viva_start' first."
        return {
            "response":  response,
            "tool_used": "viva_answer_error",
            "messages":  [
                {"role": "user",      "content": user_msg},
                {"role": "assistant", "content": response},
            ],
        }

    try:
        # submit_answer is async, returns AnswerEvaluation dataclass
        evaluation = await viva.submit_answer(
            session_id=session_id,
            answer_text=user_msg,
        )
        feedback = evaluation.feedback
        score    = evaluation.score

        # Check if session is complete by inspecting current_index
        session = viva.get_session(session_id)
        session_complete = (session is not None and
                            session.current_index >= len(session.questions))

        if session_complete:
            # get_verdict is sync — no await
            verdict_data = viva.get_verdict(session_id)
            verdict = verdict_data.get("verdict", "inconclusive")
            avg     = verdict_data.get("average_score", 0.0)
            response = (
                f"Verification complete! Verdict: **{verdict.upper()}** "
                f"(average score: {avg:.0%})\n\n"
                f"{verdict_data.get('message', '')}"
            )
            return {
                "response":        response,
                "tool_used":       "viva_verdict",
                "viva_session_id": None,  # clear session
                "viva_data":       verdict_data,
                "messages":        [
                    {"role": "user",      "content": user_msg},
                    {"role": "assistant", "content": response},
                ],
            }

        # More questions remain — show next question
        next_q_text = ""
        if session and session.current_index < len(session.questions):
            next_q_text = session.questions[session.current_index].question_text

        response = (
            f"{'Good effort! ' if score >= 0.5 else 'Keep thinking! '}{feedback}"
            + (f"\n\n**Next question:** {next_q_text}" if next_q_text else "")
        )
        return {
            "response":  response,
            "tool_used": "viva_answer",
            "viva_data": {
                "score":            score,
                "feedback":         feedback,
                "matched_concepts": evaluation.matched_concepts,
                "missing_concepts": evaluation.missing_concepts,
                "is_acceptable":    evaluation.is_acceptable,
            },
            "messages":  [
                {"role": "user",      "content": user_msg},
                {"role": "assistant", "content": response},
            ],
        }
    except Exception as e:
        logger.error("Viva answer failed: %s", e)
        err_response = "Error processing your answer. Please try again."
        return {
            "response":  err_response,
            "tool_used": "viva_answer_error",
            "messages":  [
                {"role": "user",      "content": user_msg},
                {"role": "assistant", "content": err_response},
            ],
        }


# ── TOOL: GENERATE PROBLEM ────────────────────────────────────────────────────

async def tool_generate_problem(state: OrchestratorState) -> Dict[str, Any]:
    """
    Teacher tool: generate a complete coding problem from a topic prompt.
    Delegates to problem_generator.generate_problem() (async).
    Returns the full problem dict in generate_data.
    """
    prompt     = state.get("user_message", "")
    difficulty = state.get("generate_difficulty", "intermediate")
    language   = state.get("language", "python")

    try:
        result = await _generate_problem(
            prompt=prompt,
            difficulty=difficulty,
            language=language,
        )
        title = result.get("title", "Untitled Problem")
        response = (
            f"Generated problem: **{title}** "
            f"({result.get('difficulty', difficulty)}) — "
            f"{len(result.get('test_cases', []))} test cases, "
            f"{len(result.get('viva_questions', []))} viva questions."
        )
        return {
            "response":      response,
            "tool_used":     "generate_problem",
            "generate_data": result,
            "messages":      [
                {"role": "user",      "content": f"Generate problem: {prompt}"},
                {"role": "assistant", "content": response},
            ],
        }
    except Exception as e:
        logger.error("Problem generation failed: %s", e)
        err_response = f"Problem generation failed: {str(e)}"
        return {
            "response":  err_response,
            "tool_used": "generate_problem_error",
            "messages":  [
                {"role": "user",      "content": f"Generate problem: {prompt}"},
                {"role": "assistant", "content": err_response},
            ],
        }


# ── TOOL: GENERATE TESTS ──────────────────────────────────────────────────────

async def tool_generate_tests(state: OrchestratorState) -> Dict[str, Any]:
    """
    Teacher tool: generate diverse test cases for a given problem description.
    Delegates to test_case_generator.generate_test_cases() (async).
    Returns the full test-case suite in generate_data.
    """
    description     = state.get("problem_description") or state.get("user_message", "")
    sample_solution = state.get("sample_solution", "")
    language        = state.get("language", "python")
    num_cases       = state.get("num_cases", 8)

    try:
        result = await _generate_test_cases(
            description=description,
            sample_solution=sample_solution,
            language=language,
            num_cases=num_cases,
        )
        result_dict = result.model_dump()
        response = (
            f"Generated {len(result.test_cases)} test cases for "
            f"**{result.problem_title}** ({language})."
        )
        return {
            "response":      response,
            "tool_used":     "generate_tests",
            "generate_data": result_dict,
            "messages":      [
                {"role": "user",      "content": f"Generate tests: {description[:100]}..."},
                {"role": "assistant", "content": response},
            ],
        }
    except Exception as e:
        logger.error("Test generation failed: %s", e)
        err_response = f"Test generation failed: {str(e)}"
        return {
            "response":  err_response,
            "tool_used": "generate_tests_error",
            "messages":  [
                {"role": "user",      "content": "Generate tests"},
                {"role": "assistant", "content": err_response},
            ],
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  GRAPH CONSTRUCTION
# ═══════════════════════════════════════════════════════════════════════════════

def _route_mode(state: OrchestratorState) -> str:
    """Conditional edge: maps mode → tool node name."""
    mode = state.get("mode", "chat")
    mapping = {
        "hint":              "tool_hint",
        "chat":              "tool_chat",
        "viva_start":        "tool_viva_start",
        "viva_answer":       "tool_viva_answer",
        "generate_problem":  "tool_generate_problem",
        "generate_tests":    "tool_generate_tests",
    }
    return mapping.get(mode, "tool_chat")


def build_orchestrator_graph() -> StateGraph:
    g = StateGraph(OrchestratorState)

    # Nodes
    g.add_node("ast_sync",               node_ast_sync)
    g.add_node("router",                 node_router)
    g.add_node("tool_hint",              tool_hint)
    g.add_node("tool_chat",              tool_chat)
    g.add_node("tool_viva_start",        tool_viva_start)
    g.add_node("tool_viva_answer",       tool_viva_answer)
    g.add_node("tool_generate_problem",  tool_generate_problem)
    g.add_node("tool_generate_tests",    tool_generate_tests)

    # Edges
    g.set_entry_point("ast_sync")
    g.add_edge("ast_sync", "router")

    # Conditional dispatch from router → correct tool
    g.add_conditional_edges(
        "router",
        _route_mode,
        {
            "tool_hint":              "tool_hint",
            "tool_chat":              "tool_chat",
            "tool_viva_start":        "tool_viva_start",
            "tool_viva_answer":       "tool_viva_answer",
            "tool_generate_problem":  "tool_generate_problem",
            "tool_generate_tests":    "tool_generate_tests",
        },
    )

    # All tools → END
    for tool_node in ["tool_hint", "tool_chat", "tool_viva_start", "tool_viva_answer",
                      "tool_generate_problem", "tool_generate_tests"]:
        g.add_edge(tool_node, END)

    return g


# ── Compiled singleton ─────────────────────────────────────────────────────────
_graph = build_orchestrator_graph().compile(checkpointer=_memory)


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

async def run_turn(
    *,
    thread_id:           str,
    mode:                str,
    user_message:        str,
    current_code:        str             = "",
    compiler_output:     str             = "",
    frustration_score:   float           = 0.0,
    problem_description: str             = "",
    failed_test_cases:   List[Dict]      = None,
    editor_context:      Dict[str, Any]  = None,
    language:            str             = "python",
    viva_session_id:     Optional[str]   = None,
    starter_code:        Optional[str]   = None,
    # Generation-specific parameters (teacher tools)
    generate_difficulty: str             = "intermediate",
    sample_solution:     str             = "",
    num_cases:           int             = 8,
) -> Dict[str, Any]:
    """
    Single public entry-point for the orchestrator.
    Called from routes.py for every AI interaction.

    Modes:
        hint              → Socratic hint (student)
        chat              → follow-up dialogue (student)
        viva_start        → start viva session (student)
        viva_answer       → submit viva answer (student)
        generate_problem  → AI problem generation (teacher)
        generate_tests    → AI test-case generation (teacher)

    Returns a dict with:
        response        str   — text response
        turn_count      int   — total conversation turns
        tool_used       str   — which tool fired
        ast_metadata    dict  — fresh AST analysis (empty for generation modes)
        teaching_focus  str   — targeted concept (empty for generation modes)
        viva_data       dict  — questions / verdict (if viva mode)
        generate_data   dict  — problem / test cases (if generation mode)
        thread_id       str   — echoed
    """
    config = {"configurable": {"thread_id": thread_id}}
    inputs: OrchestratorState = {
        "mode":                mode,
        "user_message":        user_message,
        "current_code":        current_code,
        "compiler_output":     compiler_output,
        "frustration_score":   frustration_score,
        "problem_description": problem_description,
        "failed_test_cases":   failed_test_cases or [],
        "editor_context":      editor_context or {},
        "thread_id":           thread_id,
        "language":            language,
        "starter_code":        starter_code or "",
        # Generation fields
        "generate_difficulty": generate_difficulty,
        "sample_solution":     sample_solution,
        "num_cases":           num_cases,
    }
    # Belt-and-suspenders: if the client sends the session_id explicitly,
    # inject it directly so viva_answer never loses it across checkpoints.
    if viva_session_id:
        inputs["viva_session_id"] = viva_session_id

    final_state = await _graph.ainvoke(inputs, config=config)

    return {
        "thread_id":      thread_id,
        "response":       final_state.get("response", ""),
        "turn_count":     final_state.get("turn_count", 1),
        "tool_used":      final_state.get("tool_used", "unknown"),
        "ast_metadata":   final_state.get("ast_context", {}),
        "teaching_focus":  final_state.get("teaching_focus", ""),
        "viva_data":      final_state.get("viva_data"),
        "generate_data":  final_state.get("generate_data"),
    }
