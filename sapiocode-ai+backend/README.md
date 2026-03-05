# SapioCode Intelligence Microservice (NS-CITS v2.0)

> **Role**: The "Brain" — Socratic Hint Engine + Viva Verification Agent  
> **Owner**: AI Engineer (Role 2)  
> **Stack**: Python + FastAPI + LangGraph + Groq (llama-3.3-70b)

## What This Service Does

This is the **Intelligence Microservice** for SapioCode — a Neuro-Symbolic Cognitive Intelligent Tutoring System. It receives student code, compiler output, and behavioral metrics from teammates' services and returns:

1. **Socratic Hints** — AST-aware, affect-modulated guiding questions (never the answer)
2. **Viva Verification** — Validates that students genuinely understand their code

### Engineering Boundary

| I Build | Teammates Build |
|---------|----------------|
| AST Parser (loops, recursion, conditionals) | Login/Auth |
| Socratic Hint LangGraph Agent | Database (Supabase/MongoDB) |
| Viva Verification Agent | JDoodle Compiler Integration |
| FastAPI endpoints that accept (code, compiler_output, mental_state) | Next.js Frontend + Monaco Editor |

## Architecture

```
                     ┌─────────────────────────┐
                     │     /api/hint            │
                     │  (code + stderr + affect) │
                     └────────┬────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   AST PARSER       │  ◄── Pure Python, no LLM
                    │   (loops, recursion,│
                    │    issues, patterns)│
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   AFFECT ROUTER    │
                    │   frustration → ?  │
                    └───┬─────┬─────┬────┘
                        │     │     │
              ┌─────────┘     │     └─────────┐
              ▼               ▼               ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  GENTLE  │  │ SOCRATIC │  │ CHALLENGE│
        │ empathy  │  │ question │  │ push     │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             └──────────┬──┘──────────────┘
                        ▼
               ┌────────────────┐
               │  Groq LLM      │
               │  (llama-3.3)   │
               └────────────────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/hint` | Socratic hint generation |
| POST | `/api/analyze` | Raw AST analysis (no LLM) |
| POST | `/api/verify` | Single-shot viva verification |
| POST | `/api/viva/start` | Start a viva session |
| POST | `/api/viva/answer` | Submit answer to current question |
| GET | `/api/viva/verdict/{session_id}` | Get final verdict |
| GET | `/health` | Service health check |

## Quick Start

```bash
cd sapiocode-ai+backend

# Install dependencies
pip install -r requirements.txt

# Set your Groq API key in .env
# GROQ_API_KEY=gsk_...

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

## Example Requests

### Hint Request
```bash
curl -X POST http://localhost:8002/api/hint \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "stu-001",
    "code": "def fib(n):\n    if n <= 0:\n        return 0\n    return fib(n-1) + fib(n-2)",
    "problem_description": "Write a function that returns the nth Fibonacci number",
    "compiler_output": "",
    "mental_state": {
      "frustration": 0.3,
      "engagement": 0.7
    }
  }'
```

### Verify Request
```bash
curl -X POST http://localhost:8002/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "stu-001",
    "code": "def fib(n):\n    if n <= 0:\n        return 0\n    return fib(n-1) + fib(n-2)",
    "question": "Explain how your function handles the base case",
    "student_answer": "When n is 0 or negative, it returns 0 to stop the recursion"
  }'
```

## Project Structure

```
sapiocode-ai+backend/
├── app/
│   ├── main.py              # FastAPI entrypoint
│   ├── core/
│   │   └── config.py        # Settings (Groq key, thresholds)
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   ├── services/
│   │   ├── ast_parser.py    # Deep AST analysis (pure Python)
│   │   ├── groq_client.py   # Async Groq LLM client
│   │   ├── hint_agent.py    # LangGraph Socratic hint workflow
│   │   └── viva_agent.py    # LangGraph Viva verification
│   └── api/
│       └── routes.py        # FastAPI route handlers
├── tests/
│   └── test_service.py      # Integration tests
├── requirements.txt
├── .env
├── Dockerfile
└── README.md
```

## Key Design Decisions

1. **LangGraph over plain if/else** — The 3-path affect routing (gentle/socratic/challenge) is a proper state machine, not spaghetti conditionals. This makes it easy to add new paths (e.g., "bored" → push complexity).

2. **AST first, LLM second** — Every hint is grounded in structural analysis. The LLM never hallucinates about code structure because the AST tells it exactly what's there.

3. **Compiler output integration** — The old system had no slot for stderr/stdout. This pivot adds `compiler_output` as a first-class field, so the hint agent can help students decode error messages.

4. **No database dependency** — Viva sessions are in-memory. The teammate's DB handles persistence. This keeps the microservice stateless and easy to deploy.
