"""
Problem Generator — CogniCode Intelligence Engine.

Teacher-facing service: given a topic/prompt, uses the LLM to generate
a complete problem including:
  • title, description, difficulty
  • target_concepts
  • test_cases (with hidden flags)
  • viva_questions (with expected keywords)
  • starter_code

Returns a dict ready to be serialized by FastAPI.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

from app.services.groq_client import get_groq_client

logger = logging.getLogger("cognicode.problem_generator")

_SYSTEM_PROMPT = """\
You are an expert computer science educator who designs coding problems.
Given a topic description, generate a COMPLETE coding problem suitable
for a university-level introductory programming course.

RULES:
1. Return ONLY valid JSON — no markdown fences, no prose outside the JSON.
2. The JSON must have exactly these keys:
{
  "title": "concise problem title",
  "description": "full markdown problem statement with examples",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topic": "category name (e.g. arrays, recursion, OOP)",
  "target_concepts": ["concept1", "concept2"],
  "test_cases": [
    {"input": "function_name(arg1, arg2)", "expected_output": "...", "is_hidden": false},
    ...
  ],
  "viva_questions": [
    {"question": "...", "expected_answer_keywords": ["kw1", "kw2"]},
    ...
  ],
  "starter_code": {
    "python3": "def solution(...):\\n    pass",
    "java": "import java.util.*;\\n\\npublic class Main {\\n    // solution method\\n    public static void main(String[] args) { }\\n}",
    "cpp17": "#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n    // solution\\n    return 0;\\n}",
    "nodejs": "function solution(...) {\\n    // Write your code here\\n    return null;\\n}\\n\\nconsole.log(solution());"
  }
}
3. Generate at least 4 test cases (mix of visible and hidden).
   IMPORTANT: Each test_case "input" must be a COMPLETE function call expression
   that can be eval'd directly, e.g. "two_sum([2,7,11,15], 9)" — NOT just the
   arguments like "[2,7,11,15], 9". The function name must match the function
   defined in the starter_code.
4. Generate at least 3 viva questions that test conceptual understanding.
5. starter_code MUST be an object with keys "python3", "java", "cpp17", "nodejs".
   Each value is the idiomatic starter/boilerplate for that language.
   - Python: function with pass body and a __main__ test block.
   - Java: full class with main method, imports, and empty solution method.
   - C++17: full program with includes, using namespace, main, and empty solution.
   - JavaScript (Node.js): function with null return and console.log test.
   The function signatures and I/O should match across all languages.
6. The description should include input/output format and at least 2 examples.
7. Make the problem original and engaging.
"""


def _build_user_prompt(prompt: str, difficulty: str, language: str) -> str:
    return (
        f"TOPIC / PROMPT: {prompt}\n"
        f"PREFERRED DIFFICULTY: {difficulty}\n"
        f"PROGRAMMING LANGUAGE: {language}\n\n"
        "Generate the complete problem as JSON."
    )


def _extract_json(raw: str) -> str:
    """Extract a JSON object from the LLM response.
    
    Priority:
    1. If the raw string is already a JSON object/array, return as-is.
    2. Find the outermost { ... } or [ ... ] brace pair.
    3. Fall back to stripping markdown fences.
    """
    raw = raw.strip()
    
    # Fast path: starts with { or [ — likely already valid JSON
    if raw.startswith("{") or raw.startswith("["):
        return raw
    
    # Try to find the outermost braces (handles prose before/after JSON)
    brace_start = raw.find("{")
    if brace_start != -1:
        # Find matching closing brace by counting depth
        depth = 0
        in_string = False
        escape_next = False
        for i in range(brace_start, len(raw)):
            ch = raw[i]
            if escape_next:
                escape_next = False
                continue
            if ch == "\\":
                escape_next = True
                continue
            if ch == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return raw[brace_start:i + 1]
    
    # Fallback: strip markdown fences
    match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()
    return raw


async def generate_problem(
    prompt: str,
    difficulty: str = "intermediate",
    language: str = "python",
) -> Dict[str, Any]:
    """
    Generate a complete coding problem from a topic prompt.

    Returns:
        Dict matching the GeneratedProblemResponse schema.
    """
    client = get_groq_client()
    user_prompt = _build_user_prompt(prompt, difficulty, language)

    # Try up to 3 attempts: first with json_mode, then without, then a correction prompt
    raw = await client.chat(
        [{"role": "system", "content": _SYSTEM_PROMPT},
         {"role": "user",   "content": user_prompt}],
        temperature=0.6,
        max_tokens=3000,
        json_mode=True,
    )
    logger.debug("generate_problem raw (attempt 1, json_mode): %s", raw[:300] if raw else "<empty>")

    # If json_mode returned empty, retry without it (some models don't support it)
    if not raw or not raw.strip():
        logger.warning("json_mode returned empty — retrying without json_mode")
        raw = await client.chat(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user",   "content": user_prompt}],
            temperature=0.6,
            max_tokens=3000,
            json_mode=False,
        )
        logger.debug("generate_problem raw (attempt 2, no json_mode): %s", raw[:300] if raw else "<empty>")

    try:
        data: Dict[str, Any] = json.loads(_extract_json(raw))
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("JSON parse failed on first attempt: %s — retrying with correction", exc)
        correction_prompt = (
            f"The following is not valid JSON. Fix it and return ONLY the JSON object:\n\n{raw}"
        )
        raw2 = await client.chat(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user",   "content": correction_prompt}],
            temperature=0.1,
            max_tokens=3000,
        )
        logger.debug("generate_problem raw (correction attempt): %s", raw2[:300] if raw2 else "<empty>")
        try:
            data = json.loads(_extract_json(raw2))
        except (json.JSONDecodeError, ValueError) as exc2:
            logger.error("JSON parse failed on retry: %s", exc2)
            raise RuntimeError(
                "The LLM returned malformed JSON after two attempts. "
                "Please retry or simplify the prompt."
            ) from exc2

    # Normalize and provide defaults
    # Handle starter_code as either a dict (multi-lang) or string (legacy single-lang)
    raw_starter = data.get("starter_code", "")
    if isinstance(raw_starter, dict):
        starter_code = {
            "python3": str(raw_starter.get("python3", "")),
            "java": str(raw_starter.get("java", "")),
            "cpp17": str(raw_starter.get("cpp17", "")),
            "nodejs": str(raw_starter.get("nodejs", "")),
        }
    else:
        # Legacy: single string → treat as python3
        starter_code = {
            "python3": str(raw_starter),
            "java": "",
            "cpp17": "",
            "nodejs": "",
        }

    return {
        "title": str(data.get("title", "Untitled Problem")),
        "description": str(data.get("description", "")),
        "difficulty": str(data.get("difficulty", difficulty)),
        "topic": str(data.get("topic", "")),
        "target_concepts": data.get("target_concepts", []),
        "test_cases": [
            {
                "input": str(tc.get("input", "")),
                "expected_output": str(tc.get("expected_output", "")),
                "is_hidden": bool(tc.get("is_hidden", False)),
            }
            for tc in data.get("test_cases", [])
        ],
        "viva_questions": [
            {
                "question": str(vq.get("question", "")),
                "expected_answer_keywords": vq.get("expected_answer_keywords", []),
            }
            for vq in data.get("viva_questions", [])
        ],
        "starter_code": starter_code,
    }
