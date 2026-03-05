"""
Integration tests for SapioCode Intelligence Microservice  (v2.3.0).

Unit tests   : pytest tests/test_service.py -v
Live tests   : python tests/test_service.py --live
"""
import asyncio
import json
import sys
import os

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ═══════════════════════════════════════════════════════════════
#  UNIT TESTS — AST Parser (no LLM, no network)
# ═══════════════════════════════════════════════════════════════

def test_ast_parser_basic():
    """Test that AST parser detects functions, loops, variables."""
    from app.services.ast_parser import ASTParser

    parser = ASTParser()
    code = """
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
"""
    result = parser.analyze(code)
    assert result.is_valid, "Code should be valid"
    assert result.function_count == 1
    assert result.loop_count >= 1
    assert result.has_recursion is False
    assert "functions" in result.concepts_detected or "loops" in result.concepts_detected
    assert len(result.function_profiles) == 1
    assert result.function_profiles[0].name == "two_sum"
    print("✅ AST Parser — basic analysis")


def test_ast_parser_recursion():
    """Test recursion detection + base case."""
    from app.services.ast_parser import ASTParser, AlgorithmPattern

    parser = ASTParser()
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
    result = parser.analyze(code)
    assert result.is_valid
    assert result.has_recursion is True
    assert result.algorithm_pattern == AlgorithmPattern.RECURSIVE
    fp = result.function_profiles[0]
    assert fp.calls_itself is True
    assert fp.has_base_case is True
    assert "recursion" in result.concepts_detected
    print("✅ AST Parser — recursion detection")


def test_ast_parser_missing_base_case():
    """Test detection of recursive function without base case."""
    from app.services.ast_parser import ASTParser, CodeIssue

    parser = ASTParser()
    code = """
def bad_recurse(n):
    return bad_recurse(n-1) + bad_recurse(n-2)
"""
    result = parser.analyze(code)
    assert result.has_recursion is True
    assert CodeIssue.MISSING_BASE_CASE in result.issues
    assert len(result.issue_locations) > 0
    assert result.issue_locations[0].issue_type == CodeIssue.MISSING_BASE_CASE
    print("✅ AST Parser — missing base case detection")


def test_ast_parser_syntax_error():
    """Test handling of syntax errors."""
    from app.services.ast_parser import ASTParser, CodeIssue

    parser = ASTParser()
    result = parser.analyze("def foo(:\n    pass")
    assert result.is_valid is False
    assert CodeIssue.SYNTAX_ERROR in result.issues
    assert len(result.syntax_errors) > 0
    print("✅ AST Parser — syntax error handling")


def test_ast_parser_nested_loops():
    """Test brute force detection via nested loops."""
    from app.services.ast_parser import ASTParser, AlgorithmPattern

    parser = ASTParser()
    code = """
def brute(arr):
    for i in range(len(arr)):
        for j in range(i+1, len(arr)):
            if arr[i] + arr[j] == 0:
                return [i, j]
"""
    result = parser.analyze(code)
    assert result.algorithm_pattern == AlgorithmPattern.BRUTE_FORCE
    print("✅ AST Parser — brute force / nested loops")


def test_ast_parser_dp():
    """Test dynamic programming detection."""
    from app.services.ast_parser import ASTParser, AlgorithmPattern

    parser = ASTParser()
    code = """
def fib_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)
    return memo[n]
"""
    result = parser.analyze(code)
    assert result.algorithm_pattern == AlgorithmPattern.DYNAMIC_PROG
    assert "dynamic_programming" in result.concepts_detected
    print("✅ AST Parser — DP detection")


def test_ast_llm_context():
    """Test that build_llm_context returns structured data."""
    from app.services.ast_parser import ASTParser

    parser = ASTParser()
    code = """
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
"""
    result = parser.analyze(code)
    ctx = parser.build_llm_context(result)
    assert "algorithm_pattern" in ctx
    assert "student_approach" in ctx
    assert "functions" in ctx
    assert isinstance(ctx["functions"], list)
    print("✅ AST Parser — LLM context builder")


# ═══════════════════════════════════════════════════════════════
#  UNIT TESTS — Viva Question Generator (no LLM)
# ═══════════════════════════════════════════════════════════════

def test_viva_question_generation():
    """Test that questions are generated from AST analysis."""
    from app.services.ast_parser import ASTParser
    from app.services.viva_agent import generate_questions

    parser = ASTParser()
    code = """
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result
"""
    analysis = parser.analyze(code)
    questions = generate_questions(code, analysis, num=3)
    assert len(questions) > 0
    assert len(questions) <= 3
    for q in questions:
        assert q.id  # IDs assigned
        assert q.question_text
        assert q.expected_concepts
    print(f"✅ Viva — generated {len(questions)} questions")
    for q in questions:
        print(f"   Q: {q.question_text[:80]}...")


def test_concept_overlap():
    """Test deterministic concept overlap scoring."""
    from app.services.ast_parser import ASTParser
    from app.services.viva_agent import compute_concept_overlap

    parser = ASTParser()
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
    analysis = parser.analyze(code)

    # Good answer — mentions recursion and base case
    good = "The function uses recursion to compute fibonacci. The base case is when n is 0 or 1."
    result = compute_concept_overlap(analysis, good)
    assert result["overlap_score"] > 0.3
    assert len(result["matched"]) > 0
    print(f"✅ Concept overlap (good answer): score={result['overlap_score']}")

    # Bad answer — vague
    bad = "It does some math stuff."
    result2 = compute_concept_overlap(analysis, bad)
    assert result2["overlap_score"] < result["overlap_score"]
    print(f"✅ Concept overlap (bad answer): score={result2['overlap_score']}")


def test_ast_security_block():
    """Test that blocked imports (os, sys, subprocess) raise SecurityException."""
    from app.services.ast_parser import ASTParser, SecurityException

    parser = ASTParser()
    code = "import os\nimport subprocess\nsubprocess.call(['rm', '-rf', '/'])"
    try:
        parser.analyze(code)
        assert False, "Should have raised SecurityException"
    except SecurityException as e:
        assert "os" in e.violations or "subprocess" in e.violations
        print(f"✅ AST Security — blocked: {e.violations}")


def test_ast_nesting_depth():
    """Test max nesting depth tracking."""
    from app.services.ast_parser import ASTParser

    parser = ASTParser()
    code = """
def deep(arr):
    for i in arr:
        for j in arr:
            if i > j:
                for k in arr:
                    pass
"""
    result = parser.analyze(code)
    assert result.max_nesting_depth >= 3, f"Expected depth >= 3, got {result.max_nesting_depth}"
    print(f"✅ AST Nesting depth: {result.max_nesting_depth}")


def test_ast_pydantic_model():
    """Test that ASTAnalysisResult is a Pydantic model."""
    from app.services.ast_parser import ASTParser, ASTAnalysisResult
    from pydantic import BaseModel

    parser = ASTParser()
    result = parser.analyze("x = 1")
    assert isinstance(result, BaseModel), "ASTAnalysisResult should be a Pydantic BaseModel"
    d = result.model_dump()
    assert "max_nesting_depth" in d
    assert "algorithm_pattern" in d
    print("✅ ASTAnalysisResult is a Pydantic model")


# ═══════════════════════════════════════════════════════════════
#  UNIT TESTS — Orchestrator (no LLM, no network)
# ═══════════════════════════════════════════════════════════════

def test_orchestrator_ast_sync():
    """Test that node_ast_sync runs AST analysis and picks a teaching focus."""
    import asyncio
    from app.services.orchestrator import node_ast_sync

    state = {
        "current_code": "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)",
        "compiler_output": "",
        "language": "python",
    }
    result = asyncio.run(node_ast_sync(state))
    assert "ast_context" in result
    assert result["ast_context"].get("has_recursion") is True
    assert result["ast_context"].get("algorithm_pattern") == "recursive"
    assert "teaching_focus" in result
    print("✅ Orchestrator — node_ast_sync: fresh analysis per message")


def test_orchestrator_state_schema():
    """Test OrchestratorState annotations include all required keys."""
    from app.services.orchestrator import OrchestratorState

    ann = OrchestratorState.__annotations__
    for required in ["messages", "user_message", "current_code", "response",
                     "turn_count", "mode", "viva_session_id", "tool_used"]:
        assert required in ann, f"Missing: {required}"
    print("✅ OrchestratorState — schema validated")


def test_orchestrator_affect_routing():
    """Test _pick_affect_level routes correctly based on frustration/mastery."""
    from app.services.orchestrator import _pick_affect_level

    assert _pick_affect_level(0.9, 0.2, 0) == "gentle"    # high frustration
    assert _pick_affect_level(0.1, 0.9, 0) == "challenge"  # high mastery
    assert _pick_affect_level(0.3, 0.3, 0) == "socratic"   # baseline
    print("✅ Orchestrator — affect routing thresholds correct")


def test_orchestrator_route_mode():
    """Test _route_mode maps mode strings to correct tool node names."""
    from app.services.orchestrator import _route_mode

    assert _route_mode({"mode": "hint"})        == "tool_hint"
    assert _route_mode({"mode": "chat"})        == "tool_chat"
    assert _route_mode({"mode": "viva_start"})  == "tool_viva_start"
    assert _route_mode({"mode": "viva_answer"}) == "tool_viva_answer"
    assert _route_mode({"mode": "unknown"})     == "tool_chat"  # default
    assert _route_mode({})                      == "tool_chat"  # no mode
    print("✅ Orchestrator — _route_mode dispatch table correct")


def test_critic_check():
    """Test _critic_check detects code leakage."""
    from app.services.orchestrator import _critic_check

    assert _critic_check("Have you considered what happens when n is 0?") is True
    assert _critic_check("Try adding `if n <= 1: return n`") is False  # inline code
    assert _critic_check("```python\ndef fib(n):\n    pass\n```") is False  # code block
    assert _critic_check("def fib(n): return n") is False  # raw def
    print("✅ Orchestrator — _critic_check detects code markers")


# ═══════════════════════════════════════════════════════════════
#  INTEGRATION TESTS — Full endpoints (requires running server on :8002)
# ═══════════════════════════════════════════════════════════════

async def test_health():
    """Test /health endpoint."""
    import httpx

    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        resp = await c.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "2.3.0"
        assert "primary_model" in data
        assert "fallback_model" in data
        print(f"✅ /health — {data['service']} v{data['version']} | model={data['active_model']}")


async def test_security_block_endpoint():
    """Test that /api/analyze blocks dangerous imports with 422."""
    import httpx

    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        resp = await c.post("/api/analyze", json={
            "code": "import os\nos.system('rm -rf /')",
        })
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        data = resp.json()
        assert data["error"] == "security_violation"
        assert "os" in data["blocked_imports"]
        print(f"✅ /api/analyze security — blocked: {data['blocked_imports']}")


async def test_analyze_endpoint():
    """Test /api/analyze."""
    import httpx

    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        resp = await c.post("/api/analyze", json={
            "code": "def two_sum(nums, t):\n    d = {}\n    for i,n in enumerate(nums):\n        if t-n in d: return [d[t-n],i]\n        d[n]=i",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is True
        assert data["algorithm_pattern"] == "iterative"
        print(f"✅ /api/analyze — pattern={data['algorithm_pattern']}, concepts={data['concepts']}")


async def test_agent_chat_basic():
    """Test /api/agent/chat in default 'chat' mode."""
    import httpx
    from uuid import uuid4

    thread = f"test-basic-{uuid4().hex[:8]}"
    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        resp = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "chat",
            "user_message": "I'm stuck on my fibonacci function. It keeps crashing with a recursion error.",
            "current_code": "def fib(n):\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "RecursionError: maximum recursion depth exceeded",
            "frustration_score": 0.6,
        }, timeout=30.0)
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["thread_id"] == thread
        assert data["turn_count"] == 1
        assert data["tool_used"] == "chat"
        assert len(data["response"]) > 10
        assert "ast_metadata" in data
        assert data["ast_metadata"]["has_recursion"] is True
        print(f"✅ /api/agent/chat [chat] — turn={data['turn_count']}, focus={data['teaching_focus'][:60]}")
        print(f"   Response: {data['response'][:120]}...")


async def test_agent_chat_hint_mode():
    """Test /api/agent/chat in 'hint' mode with affect routing."""
    import httpx
    from uuid import uuid4

    thread = f"test-hint-{uuid4().hex[:8]}"
    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        # High frustration → should route to 'gentle'
        resp = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "hint",
            "user_message": "I don't understand what's wrong. Please help me.",
            "current_code": "def fib(n):\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "RecursionError: maximum recursion depth exceeded",
            "frustration_score": 0.9,
            "mastery_estimate": 0.2,
        }, timeout=30.0)
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["tool_used"] == "hint/gentle", f"Expected hint/gentle, got {data['tool_used']}"
        assert len(data["response"]) > 10
        print(f"✅ /api/agent/chat [hint/gentle] — frustration=0.9 → {data['tool_used']}")
        print(f"   Hint: {data['response'][:120]}...")

        # High mastery → should route to 'challenge'
        thread2 = f"test-hint-chall-{uuid4().hex[:8]}"
        resp2 = await c.post("/api/agent/chat", json={
            "thread_id": thread2,
            "mode": "hint",
            "user_message": "I think I've got it, but can you ask me something harder?",
            "current_code": "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "",
            "frustration_score": 0.1,
            "mastery_estimate": 0.9,
        }, timeout=30.0)
        assert resp2.status_code == 200
        d2 = resp2.json()
        assert d2["tool_used"] == "hint/challenge", f"Expected hint/challenge, got {d2['tool_used']}"
        print(f"✅ /api/agent/chat [hint/challenge] — mastery=0.9 → {d2['tool_used']}")


async def test_agent_chat_multi_turn():
    """Test conversation persistence — two turns on the same thread_id."""
    import httpx
    from uuid import uuid4

    thread = f"test-multi-{uuid4().hex[:8]}"
    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        # Turn 1
        r1 = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "chat",
            "user_message": "My recursion keeps crashing, what am I doing wrong?",
            "current_code": "def fib(n):\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "RecursionError: maximum recursion depth exceeded",
        }, timeout=30.0)
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["turn_count"] == 1

        # Turn 2: student updated code (same thread — agent remembers turn 1)
        r2 = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "chat",
            "user_message": "I added an if-statement, is this the base case you meant?",
            "current_code": "def fib(n):\n    if n == 0:\n        return 0\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "",
        }, timeout=30.0)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["turn_count"] == 2, f"Expected turn 2, got {d2['turn_count']}"
        print(f"✅ /api/agent/chat multi-turn — t1={d1['turn_count']}, t2={d2['turn_count']}")
        print(f"   Turn 1: {d1['response'][:80]}...")
        print(f"   Turn 2: {d2['response'][:80]}...")


async def test_agent_viva_flow():
    """Test full viva flow via /api/agent/chat: viva_start → viva_answer."""
    import httpx
    from uuid import uuid4

    thread = f"test-viva-{uuid4().hex[:8]}"
    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        # Start viva
        r1 = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "viva_start",
            "user_message": "Start my viva please.",
            "current_code": "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "",
        }, timeout=30.0)
        assert r1.status_code == 200, f"Got {r1.status_code}: {r1.text}"
        d1 = r1.json()
        assert d1["tool_used"] == "viva_start"
        assert d1["viva_data"] is not None
        assert "questions" in d1["viva_data"]
        print(f"✅ /api/agent/chat [viva_start] — {len(d1['viva_data']['questions'])} questions")
        print(f"   {d1['response'][:120]}...")

        # Submit an answer
        r2 = await c.post("/api/agent/chat", json={
            "thread_id": thread,
            "mode": "viva_answer",
            "user_message": "The base case stops recursion when n is 0 or 1, returning n directly without more recursive calls.",
            "current_code": "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)",
            "compiler_output": "",
        }, timeout=30.0)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["tool_used"] in {"viva_answer", "viva_verdict", "viva_answer_error"}
        print(f"✅ /api/agent/chat [viva_answer] — tool={d2['tool_used']}")
        print(f"   {d2['response'][:120]}...")


async def test_agent_chat_security():
    """Test that /api/agent/chat blocks dangerous imports with 422."""
    import httpx

    async with httpx.AsyncClient(base_url="http://localhost:8002") as c:
        resp = await c.post("/api/agent/chat", json={
            "thread_id": "test-security",
            "mode": "chat",
            "user_message": "Help me with this code",
            "current_code": "import os\nos.system('rm -rf /')",
        }, timeout=30.0)
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        data = resp.json()
        assert data["error"] == "security_violation"
        assert "os" in data["blocked_imports"]
        print(f"✅ /api/agent/chat security — blocked: {data['blocked_imports']}")


# ═══════════════════════════════════════════════════════════════
#  RUNNER
# ═══════════════════════════════════════════════════════════════

def run_unit_tests():
    """Run all offline (no-server) tests."""
    print("\n" + "=" * 60)
    print("  UNIT TESTS (no server needed)")
    print("=" * 60 + "\n")

    test_ast_parser_basic()
    test_ast_parser_recursion()
    test_ast_parser_missing_base_case()
    test_ast_parser_syntax_error()
    test_ast_parser_nested_loops()
    test_ast_parser_dp()
    test_ast_llm_context()
    test_ast_security_block()
    test_ast_nesting_depth()
    test_ast_pydantic_model()
    test_viva_question_generation()
    test_concept_overlap()
    test_orchestrator_ast_sync()
    test_orchestrator_state_schema()
    test_orchestrator_affect_routing()
    test_orchestrator_route_mode()
    test_critic_check()

    print("\n✅ All unit tests passed!\n")


async def run_integration_tests():
    """Run all server-dependent tests."""
    print("\n" + "=" * 60)
    print("  INTEGRATION TESTS (server must be running on :8002)")
    print("=" * 60 + "\n")

    await test_health()
    await test_analyze_endpoint()
    await test_security_block_endpoint()
    await test_agent_chat_basic()
    await test_agent_chat_hint_mode()
    await test_agent_chat_multi_turn()
    await test_agent_viva_flow()
    await test_agent_chat_security()

    print("\n✅ All integration tests passed!\n")


if __name__ == "__main__":
    run_unit_tests()

    if "--live" in sys.argv:
        asyncio.run(run_integration_tests())
    else:
        print("💡 Run with --live to test against a running server")
