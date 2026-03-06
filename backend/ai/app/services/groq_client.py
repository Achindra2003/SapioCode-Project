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
    """Async Groq chat-completion client with dual-model failover.

    Strategy:
      1. Primary model (Kimi K2) — single fast attempt.
      2. On 429 / 503 / 500 / timeout → immediate failover to fallback (Llama 3.3).
      3. Fallback gets 2 retries with exponential back-off.
      4. Separate connect vs read timeouts for faster failure detection.
    """

    def __init__(self):
        s = get_settings()
        self._client = httpx.AsyncClient(
            base_url=s.GROQ_BASE_URL,
            headers={
                "Authorization": f"Bearer {s.GROQ_API_KEY}",
            },
            timeout=httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0),
        )
        self._primary = s.GROQ_PRIMARY_MODEL
        self._fallback = s.GROQ_FALLBACK_MODEL
        self._active_model = self._primary
        # Track consecutive primary failures to skip it temporarily
        self._primary_failures = 0
        self._PRIMARY_SKIP_THRESHOLD = 3  # skip primary after N consecutive failures

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

        Flow: Primary → (429/503/5xx/timeout) → Fallback with 2-retry back-off.
        If primary has failed N times consecutively, skip it entirely.
        """
        payload: Dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        # ── Attempt primary (skip if it's been consistently failing) ──
        if self._primary_failures < self._PRIMARY_SKIP_THRESHOLD:
            payload["model"] = self._primary
            try:
                text = await self._post(payload)
                self._active_model = self._primary
                self._primary_failures = 0  # reset on success
                return text
            except _RateLimited:
                self._primary_failures += 1
                logger.warning(
                    "Primary model rate-limited (fail #%d); failing over.",
                    self._primary_failures,
                )
            except httpx.HTTPStatusError as exc:
                self._primary_failures += 1
                logger.warning(
                    "Primary model HTTP %s (fail #%d); failing over.",
                    exc.response.status_code, self._primary_failures,
                )
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as exc:
                self._primary_failures += 1
                logger.warning(
                    "Primary model timeout/connect error (fail #%d): %s; failing over.",
                    self._primary_failures, type(exc).__name__,
                )
        else:
            logger.info(
                "Primary model skipped (%d consecutive failures); using fallback directly.",
                self._primary_failures,
            )

        # ── Fallback model with 2 retries ──
        payload["model"] = self._fallback
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                text = await self._post(payload)
                self._active_model = self._fallback
                return text
            except _RateLimited as exc:
                last_err = exc
                wait = 1.5 * (attempt + 1)
                logger.warning(
                    "Fallback rate-limited, retry %d/3 in %.1fs",
                    attempt + 1, wait,
                )
                await asyncio.sleep(wait)
            except (httpx.HTTPStatusError, httpx.ReadTimeout, httpx.ConnectTimeout) as exc:
                last_err = exc
                if attempt < 2:
                    await asyncio.sleep(1.0 * (attempt + 1))
                    logger.warning("Fallback error retry %d/3: %s", attempt + 1, exc)

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

    # ── Whisper Speech-to-Text ──────────────────────────

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        language: str = "en",
    ) -> dict:
        """
        Transcribe audio via Groq Whisper (whisper-large-v3-turbo).

        Accepts raw audio bytes (webm, wav, mp3, etc.).
        Returns {"text": str, "duration": float}.
        """
        files = {
            "file": (filename, audio_bytes, "audio/webm"),
        }
        data = {
            "model": "whisper-large-v3-turbo",
            "language": language,
            "response_format": "verbose_json",
        }
        resp = await self._client.post(
            "/audio/transcriptions",
            files=files,
            data=data,
            timeout=30.0,
        )
        if resp.status_code == 429:
            raise _RateLimited(resp.text)
        resp.raise_for_status()
        result = resp.json()
        return {
            "text": result.get("text", "").strip(),
            "duration": result.get("duration", 0.0),
        }

    # ── Internals ───────────────────────────────────────

    async def _post(self, payload: dict) -> str:
        """Single HTTP round-trip — raises _RateLimited on 429."""
        resp = await self._client.post("/chat/completions", json=payload)
        if resp.status_code == 429:
            raise _RateLimited(resp.text)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if content is None:
            logger.warning("LLM returned null content — finish_reason=%s model=%s",
                           data["choices"][0].get("finish_reason"), payload.get("model"))
            return ""
        return content

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
