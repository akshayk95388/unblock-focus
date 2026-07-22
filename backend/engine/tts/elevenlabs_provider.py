"""ElevenLabs TTS provider."""
import logging
from pathlib import Path

from engine.tts.base import TTSProvider

from typing import Optional

logger = logging.getLogger(__name__)


class ElevenLabsTTSProvider(TTSProvider):
    """TTS provider using the ElevenLabs SDK."""

    VOICE_MAP = {
        "gentle_female": "EXAVITQu4vr4xnSDxMaL",  # Sarah (standard built-in female voice)
        "calm_male": "JBFqnCBsd6RMkjVDRZzb",       # George (standard built-in male voice)
        "soft_male": "JBFqnCBsd6RMkjVDRZzb",       # George
        "male": "JBFqnCBsd6RMkjVDRZzb",            # George
    }

    def __init__(self, api_key: str):
        self._api_key = api_key

    @property
    def provider_id(self) -> str:
        return "elevenlabs"

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
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(api_key=self._api_key)

        # Resolve voice key to ElevenLabs voice ID
        resolved_voice = self.VOICE_MAP.get(voice_id, voice_id)

        convert_kwargs = {
            "voice_id": resolved_voice,
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "output_format": "mp3_44100_128",
        }
        effective_speed = speed if speed != 1.0 else 0.94
        convert_kwargs["voice_settings"] = {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "speed": round(effective_speed, 2),
        }

        if previous_text:
            convert_kwargs["previous_text"] = previous_text
        if next_text:
            convert_kwargs["next_text"] = next_text

        audio = client.text_to_speech.convert(**convert_kwargs)

        # audio is a generator of bytes chunks
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            for chunk in audio:
                f.write(chunk)

        logger.debug(f"ElevenLabs generated (speed={effective_speed:.2f}, ctx={bool(previous_text)}): {output_path}")

    async def generate_with_timestamps(
        self,
        text: str,
        voice_id: str,
        rate: str = "+0%",
        speed: float = 1.0,
        previous_text: Optional[str] = None,
        next_text: Optional[str] = None,
    ) -> dict:
        """One-shot or phase-level TTS generation with character-level timestamps and context stitching.

        Returns dict with:
        - audio_bytes: bytes
        - char_start: list[float]
        - char_end: list[float]
        - characters: list[str]
        """
        import base64
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(api_key=self._api_key)
        resolved_voice = self.VOICE_MAP.get(voice_id, voice_id)

        effective_speed = speed if speed != 1.0 else 0.94
        convert_kwargs = {
            "voice_id": resolved_voice,
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "output_format": "mp3_44100_128",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "speed": round(effective_speed, 2),
            },
        }
        if previous_text:
            convert_kwargs["previous_text"] = previous_text
        if next_text:
            convert_kwargs["next_text"] = next_text

        result = client.text_to_speech.convert_with_timestamps(**convert_kwargs)

        if isinstance(result, dict):
            raw_audio = result.get("audio_base64")
            alignment = result.get("alignment", {})
        else:
            raw_audio = getattr(result, "audio_base64", None)
            alignment = getattr(result, "alignment", {})

        if isinstance(raw_audio, str):
            audio_bytes = base64.b64decode(raw_audio)
        elif isinstance(raw_audio, bytes):
            audio_bytes = raw_audio
        else:
            audio_bytes = b""

        if isinstance(alignment, dict):
            char_start = alignment.get("character_start_times_seconds", [])
            char_end = alignment.get("character_end_times_seconds", [])
            characters = alignment.get("characters", [])
        else:
            char_start = getattr(alignment, "character_start_times_seconds", [])
            char_end = getattr(alignment, "character_end_times_seconds", [])
            characters = getattr(alignment, "characters", [])

        return {
            "audio_bytes": audio_bytes,
            "char_start": char_start,
            "char_end": char_end,
            "characters": characters,
        }
