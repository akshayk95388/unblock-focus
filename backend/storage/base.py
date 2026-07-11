"""Storage backend abstract base class."""
from abc import ABC, abstractmethod
from pathlib import Path


class StorageBackend(ABC):
    @abstractmethod
    async def store(self, local_path: str, key: str) -> str:
        """Store a file and return a URL/path to access it."""
        ...

    @abstractmethod
    async def get_url(self, key: str) -> str:
        """Get a URL/path for a stored file."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a stored file."""
        ...
