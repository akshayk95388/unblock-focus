"""ElevenLabs TTS provider."""
import logging
from pathlib import Path

from engine.tts.base import TTSProvider

logger = logging.getLogger(__name__)


class ElevenLabsTTSProvider(TTSProvider):
    """TTS provider using the ElevenLabs SDK."""

    VOICE_MAP = {
        "gentle_female": "21m00Tcm4TlvDq8ikWAM",  # Rachel
        "calm_male": "pNInz6obpgqjMko4T1v3",       # Adam
        "soft_male": "pNInz6obpgqjMko4T1v3",       # Adam
    }

    def __init__(self, api_key: str):
        self._api_key = api_key

    @property
    def provider_id(self) -> str:
        return "elevenlabs"

    @property
    def voice_map(self) -> dict[str, str]:
        return self.VOICE_MAP

    async def generate(self, text: str, voice_id: str, output_path: str) -> None:
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(api_key=self._api_key)

        # Resolve voice key to ElevenLabs voice ID
        resolved_voice = self.VOICE_MAP.get(voice_id, voice_id)

        audio = client.text_to_speech.convert(
            voice_id=resolved_voice,
            text=text,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_192",
        )

        # audio is a generator of bytes chunks
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            for chunk in audio:
                f.write(chunk)

        logger.debug(f"ElevenLabs generated: {output_path}")
