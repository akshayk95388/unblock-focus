"""TTS provider factory — builds the provider chain from config."""
import logging
from typing import List

from engine.tts.base import TTSProvider
from engine.tts.elevenlabs_provider import ElevenLabsTTSProvider
from engine.tts.edge_tts_provider import EdgeTTSProvider
from engine.tts.gtts_provider import GTTSProvider
from config.settings import Settings

logger = logging.getLogger(__name__)


def build_provider_chain(settings: Settings) -> List[TTSProvider]:
    """Build a fallback chain of TTS providers based on configuration.

    Order: primary → edge_tts → gtts
    """
    chain: List[TTSProvider] = []

    primary = settings.tts_primary.lower()

    if primary == "elevenlabs" and settings.elevenlabs_api_key:
        chain.append(ElevenLabsTTSProvider(api_key=settings.elevenlabs_api_key))
        logger.info("Primary TTS: ElevenLabs")

    # Edge TTS as primary or first fallback
    if primary == "edge_tts" or primary != "elevenlabs":
        chain.insert(0, EdgeTTSProvider())
        logger.info("Primary TTS: Edge TTS")
    else:
        chain.append(EdgeTTSProvider())

    # gTTS as last resort
    chain.append(GTTSProvider())

    logger.info(f"TTS chain: {[p.provider_id for p in chain]}")
    return chain
