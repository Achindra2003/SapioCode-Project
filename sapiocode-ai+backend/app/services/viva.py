"""
Viva Voce Verification Agent — LangGraph workflow.

Validates that the student ACTUALLY understands their submitted code
by generating targeted questions from the AST and verifying answers
against AST ground truth using the LLM.

Two modes:
  1. Full session: /viva/start → /viva/answer (×N) → /viva/verdict
  2. Single-shot:  /verify  (one question + answer → score)

Architecture:
  ┌────────┐     ┌──────────────┐     ┌─────────────┐
  │ PARSE  │ ──▶ │ GENERATE Qs  │ ──▶ │ (session)   │
  │  AST   │     │ from profile │     │  stored     │
  └────────┘     └──────────────┘     └─────────────┘

  Single-shot verify:
  ┌────────┐     ┌──────────────┐     ┌─────────────┐
  │ PARSE  │ ──▶ │ LLM VERIFY   │ ──▶ │ SCORE +     │
  │  AST   │     │ vs ground    │     │ VERDICT     │
  └────────┘     └──────────────┘     └─────────────┘
"""
from __future__ import annotations

import json
import random
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum

from app.services.ast_parser import ASTParser, ASTAnalysisResult, AlgorithmPattern, FunctionProfile
from app.services.groq_client import get_groq_client
from app.core.config import get_settings


# ═══════════════════════════════════════════════════════════════
#  DATA MODELS
# ═══════════════════════════════════════════════════════════════

class VivaVerdict(Enum):
    PASS = "pass"
    WEAK = "weak"
    FAIL = "fail"
    INCONCLUSIVE = "inconclusive"


class QuestionType(Enum):
    FUNCTION_PURPOSE = "function_purpose"
    LINE_EXPLANATION = "line_explanation"
    LOGIC_FLOW = "logic_flow"
    VARIABLE_ROLE = "variable_role"
    EDGE_CASE = "edge_case"
    WHY_CHOICE = "why_choice"


@dataclass
class VivaQuestion:
    id: str
    question_type: QuestionType
    question_text: str
    target_code: str
    target_line: Optional[int]
    expected_concepts: List[str]
    difficulty: int = 1


@dataclass
class AnswerEvaluation:
    question_id: str
    score: float
    matched_concepts: List[str]
    missing_concepts: List[str]
    feedback: str
    is_acceptable: bool
    red_flags: List[str] = field(default_factory=list)


@dataclass
class VivaSession:
    session_id: str
    student_id: str
    code: str
    analysis: ASTAnalysisResult
    questions: List[VivaQuestion] = field(default_factory=list)
    evaluations: List[AnswerEvaluation] = field(default_factory=list)
    current_index: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    verdict: Optional[VivaVerdict] = None


# ═══════════════════════════════════════════════════════════════
#  QUESTION GENERATOR  (pure symbolic — no LLM)
# ═══════════════════════════════════════════════════════════════

TEMPLATES = {
    QuestionType.FUNCTION_PURPOSE: [
        "Can you explain what the function '{name}' does?",
        "What is the purpose of your '{name}' function?",
        "Walk me through what '{name}' accomplishes.",
    ],
    QuestionType.LINE_EXPLANATION: [
        "Looking at line {line}, can you explain what this code does?",
        "What happens when line {line} executes?",
    ],
    QuestionType.VARIABLE_ROLE: [
        "What is the purpose of the variable '{name}'?",
        "Explain what '{name}' stores and how it changes.",
    ],
    QuestionType.EDGE_CASE: [
        "What happens if the input is empty?",
        "How does your code handle negative numbers?",
        "What if someone passes None to your function?",
    ],
    QuestionType.WHY_CHOICE: [
        "Why did you choose this approach over alternatives?",
        "Could you have solved this differently? Why this way?",
    ],
}


def generate_questions(code: str, analysis: ASTAnalysisResult, num: int = 3) -> List[VivaQuestion]:
    """Generate targeted Viva questions from AST analysis."""
    qs: List[VivaQuestion] = []
    code_lines = code.split("\n")

    # Function-profile questions
    for fp in analysis.function_profiles[:2]:
        q = _question_from_profile(fp, code)
        if q:
            qs.append(q)

    # Algorithm-pattern question
    q = _algorithm_question(analysis)
    if q:
        qs.append(q)

    # Issue-focused question
    if analysis.issue_locations:
        loc = analysis.issue_locations[0]
        snippet = code_lines[loc.line - 1].strip() if loc.line and loc.line <= len(code_lines) else loc.code_snippet
        qs.append(VivaQuestion(
            id="", question_type=QuestionType.LINE_EXPLANATION,
            question_text=f"I noticed something on line {loc.line}: `{snippet}`. {loc.description} Can you explain?",
            target_code=snippet, target_line=loc.line,
            expected_concepts=[loc.issue_type.value.replace("_", " "), "correctness"],
            difficulty=3,
        ))

    # Variable question
    import re
    for line in code_lines:
        m = re.match(r'^\s*([a-z_][a-z0-9_]*)\s*=', line, re.I)
        if m and m.group(1) not in ('i', 'j', 'k', 'x', 'y', '_', 'self'):
            tmpl = random.choice(TEMPLATES[QuestionType.VARIABLE_ROLE])
            qs.append(VivaQuestion(
                id="", question_type=QuestionType.VARIABLE_ROLE,
                question_text=tmpl.format(name=m.group(1)),
                target_code=line.strip(), target_line=None,
                expected_concepts=["purpose", "stores", "type"],
                difficulty=1,
            ))
            break

    # Edge case
    tmpl = random.choice(TEMPLATES[QuestionType.EDGE_CASE])
    qs.append(VivaQuestion(
        id="", question_type=QuestionType.EDGE_CASE,
        question_text=tmpl, target_code="", target_line=None,
        expected_concepts=["edge case", "error handling"],
        difficulty=3,
    ))

    random.shuffle(qs)
    qs = qs[:num]
    for i, q in enumerate(qs):
        q.id = f"q{i+1}"
    return qs


def _question_from_profile(fp: FunctionProfile, code: str) -> Optional[VivaQuestion]:
    params = ", ".join(fp.param_names) if fp.param_names else "..."
    if fp.calls_itself and not fp.has_base_case:
        text = f"Your function `{fp.name}` calls itself but has no clear base case. What stops the recursion?"
        concepts = ["recursion", "base_case", "termination"]
        diff = 3
    elif fp.calls_itself:
        text = f"Walk me through how `{fp.name}({params})` works on a small example."
        concepts = ["recursion", "base_case", "call_stack"]
        diff = 2
    elif fp.loop_count > 0:
        text = f"Explain the loop inside `{fp.name}`. What does it iterate over?"
        concepts = ["iteration", "loop_body", "accumulation"]
        diff = 2
    elif not fp.has_return:
        text = f"Your function `{fp.name}` doesn't return a value. How does the caller get the result?"
        concepts = ["return_value", "side_effects"]
        diff = 2
    else:
        text = random.choice(TEMPLATES[QuestionType.FUNCTION_PURPOSE]).format(name=fp.name)
        concepts = ["purpose", "input", "output"]
        diff = 1

    return VivaQuestion(
        id="", question_type=QuestionType.FUNCTION_PURPOSE,
        question_text=text, target_code=f"def {fp.name}({params}): ...",
        target_line=fp.start_line, expected_concepts=concepts,
        difficulty=diff,
    )


def _algorithm_question(analysis: AnalysisResult) -> Optional[VivaQuestion]:
    PATTERN_QS = {
        AlgorithmPattern.RECURSIVE: ("You chose recursion. What are the advantages/risks?", ["recursion", "stack_overflow", "efficiency"]),
        AlgorithmPattern.DYNAMIC_PROG: ("Your solution uses DP. What sub-problem are you memoising?", ["memoization", "subproblem", "optimal_substructure"]),
        AlgorithmPattern.TWO_POINTER: ("You're using two pointers. What invariant do they maintain?", ["invariant", "convergence", "two_pointers"]),
        AlgorithmPattern.BRUTE_FORCE: ("Your solution uses nested loops. What is the time complexity?", ["time_complexity", "nested_loops", "optimization"]),
        AlgorithmPattern.SLIDING_WINDOW: ("You use a sliding window. When do you expand vs shrink?", ["window", "expand", "shrink"]),
    }
    if analysis.algorithm_pattern not in PATTERN_QS:
        return None
    text, concepts = PATTERN_QS[analysis.algorithm_pattern]
    return VivaQuestion(
        id="", question_type=QuestionType.WHY_CHOICE,
        question_text=text, target_code="", target_line=None,
        expected_concepts=concepts, difficulty=2,
    )


# ═══════════════════════════════════════════════════════════════
#  SEMANTIC VERIFIER  (LLM-based)
# ═══════════════════════════════════════════════════════════════

VERIFY_PROMPT = """You are evaluating a student's verbal explanation of their code.
You must compare the INTENT of the student's explanation against the STRUCTURAL
INTENT revealed by the AST analysis. Do not just match keywords — determine
whether the student understands WHY the code works, not just WHAT it does.

FULL CODE:
```python
{full_code}
```

CODE SEGMENT BEING DISCUSSED:
```python
{segment}
```

AST ANALYSIS (ground truth — structural intent):
  Algorithm pattern : {algorithm_pattern}
  Concepts present  : {ast_concepts}
  Functions         : {function_summary}
  Detected issues   : {issues}
  Nesting depth     : {nesting_depth}

QUESTION ASKED: {question}

STUDENT'S RESPONSE: "{response}"

EXPECTED CONCEPTS: {expected}

Evaluate semantic intent alignment:
1. Does their explanation align with the STRUCTURAL INTENT the AST reveals?
   (e.g., if the AST shows recursion with a base case, does the student
    articulate WHY the base case is needed, not just that it exists?)
2. Do they demonstrate causal reasoning about the code's behaviour?
3. Can they articulate the ALGORITHMIC INTENT — not just read lines?
4. Any red flags suggesting they did NOT write this code?

You MUST respond in this exact JSON format:
{{
    "status": "PASS" or "FAIL" or "NEEDS_DETAIL",
    "confidence_score": 0.0,
    "feedback": "Brief constructive feedback",
    "matched_concepts": [],
    "missing_concepts": [],
    "red_flags": []
}}

Where status is:
- "PASS"         — student clearly understands the code's intent
- "NEEDS_DETAIL" — partial understanding, needs to explain more
- "FAIL"         — student cannot explain the code's purpose"""


async def verify_answer(
    question: VivaQuestion,
    answer_text: str,
    full_code: str,
    analysis: ASTAnalysisResult,
) -> AnswerEvaluation:
    """Verify a single answer against AST ground truth using structured LLM output."""
    from app.models.schemas import VivaVerdictStructured

    ap = analysis.algorithm_pattern.value if analysis.algorithm_pattern else "unknown"
    concepts = ", ".join(analysis.concepts_detected) if analysis.concepts_detected else "N/A"
    fn_sum = "; ".join(
        f"{fp.name}({'recursive' if fp.calls_itself else 'iterative'})"
        for fp in analysis.function_profiles
    ) or "N/A"
    issues_str = "; ".join(
        f"{loc.issue_type.value} line {loc.line}" for loc in analysis.issue_locations
    ) or "none"

    prompt = VERIFY_PROMPT.format(
        full_code=full_code,
        segment=question.target_code or full_code[:500],
        algorithm_pattern=ap,
        ast_concepts=concepts,
        function_summary=fn_sum,
        issues=issues_str,
        nesting_depth=analysis.max_nesting_depth,
        question=question.question_text,
        response=answer_text,
        expected=", ".join(question.expected_concepts),
    )

    try:
        client = get_groq_client()
        raw = await client.chat_json(
            [
                {"role": "system", "content": "You are an expert instructor evaluating student understanding. Compare semantic intent of the answer against AST structural intent. Respond in strict JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )

        # Parse into structured VivaVerdictStructured model
        verdict = VivaVerdictStructured(**raw)

        # Map structured status → numeric score
        score_map = {"PASS": 0.9, "NEEDS_DETAIL": 0.5, "FAIL": 0.2}
        score = verdict.confidence_score if verdict.confidence_score > 0 else score_map.get(verdict.status, 0.5)

        return AnswerEvaluation(
            question_id=question.id,
            score=score,
            matched_concepts=verdict.matched_concepts,
            missing_concepts=verdict.missing_concepts,
            feedback=verdict.feedback,
            is_acceptable=verdict.status != "FAIL",
            red_flags=verdict.red_flags,
        )
    except Exception:
        return _fallback_verify(question, answer_text)


def _fallback_verify(question: VivaQuestion, answer: str) -> AnswerEvaluation:
    """Keyword-matching fallback if LLM fails."""
    lower = answer.lower()
    matched = [c for c in question.expected_concepts if c.lower() in lower]
    missing = [c for c in question.expected_concepts if c.lower() not in lower]
    score = len(matched) / max(len(question.expected_concepts), 1)
    return AnswerEvaluation(
        question_id=question.id, score=score,
        matched_concepts=matched, missing_concepts=missing,
        feedback="Basic keyword evaluation (LLM unavailable).",
        is_acceptable=score >= 0.5,
    )


# ═══════════════════════════════════════════════════════════════
#  CONCEPT OVERLAP  (deterministic, no LLM)
# ═══════════════════════════════════════════════════════════════

SYNONYMS = {
    "recursion": ["recursion", "recursive", "calls itself"],
    "base case": ["base case", "base-case", "stopping condition", "termination"],
    "iteration": ["loop", "iterate", "for loop", "while loop"],
    "loops": ["loop", "for", "while", "iterate"],
    "functions": ["function", "method", "def"],
    "conditionals": ["if", "else", "condition", "branch"],
    "list": ["list", "array", "elements"],
    "dict": ["dictionary", "dict", "hash map", "mapping"],
    "dynamic_programming": ["dynamic programming", "dp", "memoization", "memo"],
    "two_pointers": ["two pointer", "two-pointer", "left right"],
    "time_complexity": ["time complexity", "big o", "o(n)", "efficiency"],
    "brute_force": ["brute force", "nested loop", "n squared"],
}


def compute_concept_overlap(analysis: ASTAnalysisResult, transcript: str) -> dict:
    """Deterministic AST-vs-transcript concept comparison."""
    ast_concepts: set = set()
    if analysis.concepts_detected:
        ast_concepts.update(c.lower() for c in analysis.concepts_detected)
    if analysis.algorithm_pattern:
        ast_concepts.add(analysis.algorithm_pattern.value.lower())
    for fp in analysis.function_profiles:
        if fp.calls_itself: ast_concepts.add("recursion")
        if fp.has_base_case: ast_concepts.add("base case")
        if fp.loop_count > 0: ast_concepts.add("iteration")
    for ds in analysis.data_structures_used:
        ast_concepts.add(ds.lower())
    if not ast_concepts:
        ast_concepts = {"general programming"}

    lower = transcript.lower()
    claimed: set = set()
    for concept in ast_concepts:
        syns = SYNONYMS.get(concept, [concept])
        for s in syns:
            if s in lower:
                claimed.add(concept)
                break
        if concept not in claimed and concept in lower:
            claimed.add(concept)

    matched = ast_concepts & claimed
    missed = ast_concepts - claimed
    score = len(matched) / max(len(ast_concepts), 1)
    words = len(lower.split())
    confidence = "high" if score >= 0.6 and words >= 30 else "medium" if score >= 0.3 else "low"

    return {
        "ast_concepts": sorted(ast_concepts),
        "claimed_concepts": sorted(claimed),
        "matched": sorted(matched),
        "missed": sorted(missed),
        "overlap_score": round(score, 3),
        "confidence": confidence,
    }


# ═══════════════════════════════════════════════════════════════
#  SESSION MANAGER  (in-memory; Redis in production)
# ═══════════════════════════════════════════════════════════════

_sessions: Dict[str, VivaSession] = {}
_parser = ASTParser()


def start_session(student_id: str, code: str, language: str = "python", num_questions: int = 3) -> VivaSession:
    """Create a new Viva session with auto-generated questions."""
    analysis = _parser.analyze(code, language)
    questions = generate_questions(code, analysis, num_questions)
    sid = f"viva-{uuid.uuid4().hex[:12]}"
    session = VivaSession(
        session_id=sid, student_id=student_id,
        code=code, analysis=analysis, questions=questions,
    )
    _sessions[sid] = session
    return session


def get_session(session_id: str) -> Optional[VivaSession]:
    return _sessions.get(session_id)


async def submit_answer(session_id: str, answer_text: str) -> AnswerEvaluation:
    """Evaluate the current question's answer and advance."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session not found: {session_id}")
    if session.current_index >= len(session.questions):
        raise ValueError("No more questions")

    question = session.questions[session.current_index]
    evaluation = await verify_answer(question, answer_text, session.code, session.analysis)
    session.evaluations.append(evaluation)
    session.current_index += 1
    return evaluation


def get_verdict(session_id: str) -> Dict[str, Any]:
    """Calculate final verdict for a completed session."""
    settings = get_settings()
    session = _sessions.get(session_id)
    if not session:
        return {"error": "Session not found"}

    if len(session.evaluations) < settings.VIVA_MIN_QUESTIONS:
        return {
            "verdict": VivaVerdict.INCONCLUSIVE.value,
            "message": f"Need at least {settings.VIVA_MIN_QUESTIONS} answers",
            "questions_answered": len(session.evaluations),
        }

    avg = sum(e.score for e in session.evaluations) / len(session.evaluations)

    if avg >= settings.VIVA_PASS_THRESHOLD:
        verdict = VivaVerdict.PASS
        msg = "Excellent! You demonstrated clear understanding."
    elif avg >= settings.VIVA_WEAK_THRESHOLD:
        verdict = VivaVerdict.WEAK
        msg = "Partial understanding — review the highlighted concepts."
    else:
        verdict = VivaVerdict.FAIL
        msg = "You struggled to explain your code. Please review and resubmit."

    session.verdict = verdict

    # Aggregate all answer text for concept overlap
    all_answers = " ".join(
        session.evaluations[i].feedback for i in range(len(session.evaluations))
    )

    return {
        "verdict": verdict.value,
        "average_score": round(avg, 2),
        "message": msg,
        "questions_answered": len(session.evaluations),
        "concept_overlap": compute_concept_overlap(session.analysis, all_answers),
        "question_breakdown": [
            {
                "question": session.questions[i].question_text,
                "score": session.evaluations[i].score,
                "feedback": session.evaluations[i].feedback,
                "red_flags": session.evaluations[i].red_flags,
            }
            for i in range(len(session.evaluations))
        ],
        "improvement_areas": _improvement_areas(session),
    }


def _improvement_areas(session: VivaSession) -> List[str]:
    from collections import Counter
    missing = []
    for e in session.evaluations:
        missing.extend(e.missing_concepts)
    return [f"Review: {c}" for c, _ in Counter(missing).most_common(3)]
