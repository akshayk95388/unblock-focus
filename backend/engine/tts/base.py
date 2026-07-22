"""TTS Provider abstract base class."""
from abc import ABC, abstractmethod
from typing import Optional


class TTSProvider(ABC):
    @abstractmethod
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
        """Write audio to output_path. Raise on failure."""
        ...

    @property
    @abstractmethod
    def provider_id(self) -> str:
        ...

    @property
    @abstractmethod
    def voice_map(self) -> dict[str, str]:
        ...
