"""Google TTS (gTTS) provider — last-resort fallback."""
import logging
from pathlib import Path

from engine.tts.base import TTSProvider

logger = logging.getLogger(__name__)


class GTTSProvider(TTSProvider):
    """TTS provider using Google Translate TTS (lowest quality, but always works)."""

    @property
    def provider_id(self) -> str:
        return "gtts"

    @property
    def voice_map(self) -> dict[str, str]:
        # gTTS doesn't have voice selection
        return {}

    async def generate(self, text: str, voice_id: str, output_path: str) -> None:
        from gtts import gTTS
        import asyncio

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        # gTTS is synchronous, run in thread pool
        def _generate():
            tts = gTTS(text=text, lang="en", slow=True)
            tts.save(str(path))

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _generate)

        logger.debug(f"gTTS generated: {output_path}")
