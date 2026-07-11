"""Redis-backed TTS audio cache."""
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TTSCache:
    """Cache TTS audio bytes in Redis keyed by (text, voice_id, provider_id).

    Falls back to a no-op in-memory dict if Redis is unavailable.
    """

    def __init__(self, redis_url: str = "", ttl_days: int = 30):
        self.ttl = ttl_days * 86400
        self._redis = None
        self._fallback: dict[str, bytes] = {}

        if redis_url:
            try:
                import redis
                self._redis = redis.from_url(redis_url)
                self._redis.ping()
                logger.info("TTS cache connected to Redis")
            except Exception as e:
                logger.warning(f"Redis unavailable, using in-memory fallback: {e}")
                self._redis = None

    def _key(self, text: str, voice_id: str, provider_id: str) -> str:
        raw = f"{text}|{voice_id}|{provider_id}"
        return f"tts:{hashlib.sha256(raw.encode()).hexdigest()}"

    def get(self, text: str, voice_id: str, provider_id: str) -> Optional[bytes]:
        key = self._key(text, voice_id, provider_id)
        if self._redis:
            try:
                return self._redis.get(key)
            except Exception:
                return self._fallback.get(key)
        return self._fallback.get(key)

    def set(self, text: str, voice_id: str, provider_id: str, audio: bytes) -> None:
        key = self._key(text, voice_id, provider_id)
        if self._redis:
            try:
                self._redis.setex(key, self.ttl, audio)
                return
            except Exception:
                pass
        self._fallback[key] = audio
