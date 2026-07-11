"""TTS Provider abstract base class."""
from abc import ABC, abstractmethod


class TTSProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        text: str,
        voice_id: str,
        output_path: str,
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
