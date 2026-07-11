"""Local filesystem storage backend."""
import shutil
import logging
from pathlib import Path

from storage.base import StorageBackend

logger = logging.getLogger(__name__)


class LocalStorageBackend(StorageBackend):
    def __init__(self, media_dir: str = "./media"):
        self.media_dir = Path(media_dir)
        self.media_dir.mkdir(parents=True, exist_ok=True)

    async def store(self, local_path: str, key: str) -> str:
        """Copy file to media directory."""
        dest = self.media_dir / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_path, dest)
        logger.info(f"Stored: {local_path} → {dest}")
        return f"/media/{key}"

    async def get_url(self, key: str) -> str:
        return f"/media/{key}"

    async def delete(self, key: str) -> None:
        path = self.media_dir / key
        if path.exists():
            path.unlink()
            logger.info(f"Deleted: {path}")
