"""
Groq LLM Client — Kimi K2 primary, Llama 3.3 failover.

Strategy:
  1. Every request first targets Kimi K2 (moonshotai/kimi-k2-instruct).
  2. If Kimi returns HTTP 429 (rate-limit / TPM exceeded), we log
     the event and seamlessly fail over to Llama 3.3.
  3. The caller never sees the failover — it is transparent.

Logging: 'Primary model (Kimi) limited; failing over to Llama-3.'
"""
import httpx
import json
import asyncio
import logging
from typing import Optional, List, Dict, Any

from app.core.config import get_settings

logger = logging.getLogger("sapiocode.llm")


class _RateLimited(Exception):
    """Internal sentinel for HTTP 429 responses."""


class GroqClient:
    """Async Groq chat-completion client with dual-model failover."""

    def __init__(self):
        s = get_settings()
        self._client = httpx.AsyncClient(
            base_url=s.GROQ_BASE_URL,
            headers={
                "Authorization": f"Bearer {s.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self._primary = s.GROQ_PRIMARY_MODEL
        self._fallback = s.GROQ_FALLBACK_MODEL
        self._active_model = self._primary

    # ── Public API ──────────────────────────────────────

    async def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1500,
        json_mode: bool = False,
    ) -> str:
        """
        Send a chat-completion request with automatic failover.

        Flow: Kimi K2 → (429?) → Llama 3.3 with 3-retry back-off.
        """
        payload: Dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        # ── Attempt 1: Primary model (Kimi K2) ──
        payload["model"] = self._primary
        try:
            text = await self._post(payload)
            self._active_model = self._primary
            return text
        except _RateLimited:
            logger.warning(
                "Primary model (Kimi) limited; failing over to Llama-3."
            )
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Primary model HTTP %s; trying fallback.",
                exc.response.status_code,
            )

        # ── Attempts 2–4: Fallback model (Llama 3.3) with retry ──
        payload["model"] = self._fallback
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                text = await self._post(payload)
                self._active_model = self._fallback
                return text
            except _RateLimited as exc:
                last_err = exc
                wait = 2.0 * (attempt + 1)
                logger.warning(
                    "Fallback model rate-limited, retry %d/3 in %.1fs",
                    attempt + 1, wait,
                )
                await asyncio.sleep(wait)
            except (httpx.HTTPStatusError, httpx.ReadTimeout) as exc:
                last_err = exc
                if attempt < 2:
                    await asyncio.sleep(1.5 * (attempt + 1))

        raise RuntimeError(f"Both LLM models exhausted after retries: {last_err}")

    async def chat_json(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float = 0.5,
    ) -> dict:
        """Chat completion that returns parsed JSON."""
        raw = await self.chat(messages, temperature=temperature, json_mode=True)
        return json.loads(raw)

    # ── Internals ───────────────────────────────────────

    async def _post(self, payload: dict) -> str:
        """Single HTTP round-trip — raises _RateLimited on 429."""
        resp = await self._client.post("/chat/completions", json=payload)
        if resp.status_code == 429:
            raise _RateLimited(resp.text)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    @property
    def active_model(self) -> str:
        """Which model actually served the last request."""
        return self._active_model

    @property
    def primary_model(self) -> str:
        return self._primary

    @property
    def fallback_model(self) -> str:
        return self._fallback

    async def close(self):
        await self._client.aclose()


# ── Singleton ──
_instance: Optional[GroqClient] = None


def get_groq_client() -> GroqClient:
    global _instance
    if _instance is None:
        _instance = GroqClient()
    return _instance
