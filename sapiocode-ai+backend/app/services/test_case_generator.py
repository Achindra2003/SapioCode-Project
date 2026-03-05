"""
Test Case Generator — CogniCode Intelligence Engine (v2.4.0).

Teacher-facing service: given a problem description (and optional reference
solution), uses the LLM to generate a diverse suite of test cases covering:
  • happy_path   — standard inputs that should work correctly
  • edge_case    — boundary values, empty inputs, single elements
  • adversarial  — inputs designed to expose common mistakes
  • large_input  — performance / stress test cases

Returns a `TestCaseGenerateResponse` dict that maps directly to the Pydantic
response model defined in schemas.py.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

from app.models.schemas import (
    GeneratedTestCase,
    TestCaseGenerateResponse,
)
from app.services.groq_client import get_groq_client

logger = logging.getLogger("cognicode.test_case_generator")

# ── Prompt fragments ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert software engineering educator specialising in test-case design.
Your task is to generate a diverse, thorough test suite for a coding problem.

RULES:
1. Return ONLY valid JSON — no markdown fences, no prose, no explanation outside the JSON.
2. The JSON must be an object with exactly these keys:
   { "problem_title": str, "language": str, "test_cases": [...], "notes": str }
3. Each test_case object must have:
   { "input": str, "expected_output": str, "explanation": str, "category": str }
4. category must be one of: happy_path, edge_case, adversarial, large_input.
5. input and expected_output must be concrete values (not pseudocode).
6. Do NOT include test cases that require file I/O or network access.
7. If a sample solution is provided, derive expected_output by mentally tracing it.
8. Cover all four categories unless difficulty_spread is false.
"""


def _build_user_prompt(
    description: str,
    sample_solution: str,
    language: str,
    num_cases: int,
    difficulty_spread: bool,
) -> str:
    parts = [
        f"PROBLEM STATEMENT:\n{description}\n",
        f"LANGUAGE: {language}",
        f"NUMBER OF TEST CASES: {num_cases}",
    ]
    if sample_solution.strip():
        parts.append(f"\nSAMPLE SOLUTION (use to verify expected outputs):\n```{language}\n{sample_solution}\n```")
    if difficulty_spread:
        parts.append(
            "\nDIFFICULTY SPREAD: include happy_path, edge_case, adversarial, AND large_input cases."
        )
    else:
        parts.append("\nDIFFICULTY SPREAD: happy_path and edge_case only.")
    parts.append("\nGenerate exactly the requested number of test cases as JSON.")
    return "\n".join(parts)


def _extract_json(raw: str) -> str:
    """Strip markdown code fences if the model wraps its output."""
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()
    return raw


# ── Public API ─────────────────────────────────────────────────────────────────

async def generate_test_cases(
    description: str,
    sample_solution: str = "",
    language: str = "python",
    num_cases: int = 8,
    difficulty_spread: bool = True,
) -> TestCaseGenerateResponse:
    """
    Generate a diverse suite of test cases for the given problem description.

    Args:
        description:       Full problem statement (markdown OK).
        sample_solution:   Optional reference solution (used to verify outputs).
        language:          Programming language (default "python").
        num_cases:         How many test cases to generate (2–20).
        difficulty_spread: Include edge / adversarial / large-input cases.

    Returns:
        A `TestCaseGenerateResponse` instance ready to be serialised by FastAPI.
    """
    client = get_groq_client()
    user_prompt = _build_user_prompt(
        description, sample_solution, language, num_cases, difficulty_spread
    )

    raw = await client.chat(
        system=_SYSTEM_PROMPT,
        user=user_prompt,
        temperature=0.4,   # lower temp → more reliable JSON output
        max_tokens=2048,
    )

    # ── Parse response ─────────────────────────────────────────────────────────
    try:
        data: Dict[str, Any] = json.loads(_extract_json(raw))
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("JSON parse failed on first attempt: %s — retrying", exc)
        # One retry with an explicit correction prompt
        correction_prompt = (
            f"The following is not valid JSON. Fix it and return ONLY the JSON object:\n\n{raw}"
        )
        raw2 = await client.chat(
            system=_SYSTEM_PROMPT,
            user=correction_prompt,
            temperature=0.1,
            max_tokens=2048,
        )
        try:
            data = json.loads(_extract_json(raw2))
        except (json.JSONDecodeError, ValueError) as exc2:
            logger.error("JSON parse failed on retry: %s", exc2)
            raise RuntimeError(
                "The LLM returned malformed JSON after two attempts. "
                "Please retry or simplify the problem description."
            ) from exc2

    # ── Map to Pydantic models ─────────────────────────────────────────────────
    raw_cases = data.get("test_cases", [])
    test_cases = []
    for tc in raw_cases:
        test_cases.append(
            GeneratedTestCase(
                input=str(tc.get("input", "")),
                expected_output=str(tc.get("expected_output", "")),
                explanation=str(tc.get("explanation", "")),
                category=str(tc.get("category", "happy_path")),
            )
        )

    return TestCaseGenerateResponse(
        problem_title=str(data.get("problem_title", "Untitled Problem")),
        language=str(data.get("language", language)),
        test_cases=test_cases,
        notes=str(data.get("notes", "")),
    )
