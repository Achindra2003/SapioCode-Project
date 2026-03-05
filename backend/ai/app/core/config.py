"""
Configuration -- SapioCode Intelligence Engine (Production-Grade)

Dual-model LLM strategy: Kimi K2 primary, Llama 3.3 failover.
Security: Configurable blocked-import list for the AST gatekeeper.
No DB, no auth, no BKT -- those live in teammates' services.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Loaded from .env at startup"""

    # ── LLM (Groq) ───────────────────────────────
    GROQ_API_KEY: str
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_PRIMARY_MODEL: str = "moonshotai/kimi-k2-instruct"
    GROQ_FALLBACK_MODEL: str = "llama-3.3-70b-versatile"

    # ── Service tuning ────────────────────────────
    PORT: int = 8002
    LOG_LEVEL: str = "info"

    # ── Hint engine thresholds ────────────────────
    FRUSTRATION_HIGH: float = 0.7   # route → gentle/empathetic
    FRUSTRATION_MED: float = 0.4    # route → normal socratic
    MASTERY_HIGH: float = 0.7       # route → challenge/push harder

    # ── Viva thresholds ──────────────────────────
    VIVA_PASS_THRESHOLD: float = 0.7
    VIVA_WEAK_THRESHOLD: float = 0.4
    VIVA_MIN_QUESTIONS: int = 2

    # ── Security ──────────────────────────────────
    BLOCKED_IMPORTS: str = "os,sys,subprocess,socket,shutil,ctypes,importlib"

    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
