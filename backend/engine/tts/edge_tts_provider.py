"""Edge TTS provider — free, no API key needed."""
import logging
from pathlib import Path

from engine.tts.base import TTSProvider

from typing import Optional

logger = logging.getLogger(__name__)


class EdgeTTSProvider(TTSProvider):
    """TTS provider using Microsoft Edge TTS (free, high quality)."""

    VOICE_MAP = {
        "gentle_female": "en-US-EmmaMultilingualNeural",
        "calm_male": "en-US-AndrewNeural",
        "soft_male": "en-US-AndrewNeural",
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
        rate: str = "+0%",
        speed: float = 1.0,
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
