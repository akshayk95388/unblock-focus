"""Edge TTS provider — free, no API key needed."""
import logging
from pathlib import Path

from engine.tts.base import TTSProvider

from typing import Optional

logger = logging.getLogger(__name__)


class EdgeTTSProvider(TTSProvider):
    """TTS provider using Microsoft Edge TTS (free, high quality)."""

    VOICE_MAP = {
        "calm_female": "en-US-EmmaMultilingualNeural",  # Emma (Female)
        "warm_male": "en-US-AndrewNeural",            # Andrew (Male)
    }

    @property
    def provider_id(self) -> str:
        return "edge_tts"

    @property
    def voice_map(self) -> dict[str, str]:
        return self.VOICE_MAP

    async def generate(
        self,
        text: str,
        voice_id: str,
        output_path: str,
        rate: str = "-6%",
        speed: float = 0.94,
        previous_text: Optional[str] = None,
        next_text: Optional[str] = None,
    ) -> None:
        import edge_tts

        # Resolve voice key to Edge TTS voice name
        resolved_voice = self.VOICE_MAP.get(voice_id, voice_id)

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        communicate = edge_tts.Communicate(text, resolved_voice, rate=rate)
        await communicate.save(str(path))

        logger.debug(f"Edge TTS generated ({rate}): {output_path}")

    async def generate_with_timestamps(
        self,
        text: str,
        voice_id: str,
        rate: str = "-6%",
        speed: float = 0.94,
        previous_text: Optional[str] = None,
        next_text: Optional[str] = None,
    ) -> dict:
        """Edge TTS timestamp generation using native WordBoundary events."""
        import edge_tts

        resolved_voice = self.VOICE_MAP.get(voice_id, voice_id)
        communicate = edge_tts.Communicate(text, resolved_voice, rate=rate)

        audio_chunks = []
        boundaries = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
            elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                st_s = chunk["offset"] / 10_000_000.0
                dur_s = chunk["duration"] / 10_000_000.0
                boundaries.append((chunk["text"], st_s, dur_s))

        audio_bytes = b"".join(audio_chunks)

        n_chars = len(text)
        characters = list(text)
        char_start = [0.0] * n_chars
        char_end = [0.0] * n_chars

        cursor = 0
        for b_text, st_s, dur_s in boundaries:
            idx = text.find(b_text, cursor)
            if idx == -1:
                idx = text.lower().find(b_text.lower(), cursor)
            if idx != -1:
                b_len = max(1, len(b_text))
                for c_idx in range(b_len):
                    pos = idx + c_idx
                    if pos < n_chars:
                        char_start[pos] = st_s + (c_idx / b_len) * dur_s
                        char_end[pos] = st_s + ((c_idx + 1) / b_len) * dur_s
                cursor = idx + b_len

        return {
            "audio_bytes": audio_bytes,
            "char_start": char_start,
            "char_end": char_end,
            "characters": characters,
        }
