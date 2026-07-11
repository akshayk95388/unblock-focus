"""S3 storage backend (stub for production)."""
import logging

from storage.base import StorageBackend

logger = logging.getLogger(__name__)


class S3StorageBackend(StorageBackend):
    """Placeholder for S3 storage. Implement when moving to production."""

    def __init__(self, bucket: str = "", region: str = "us-east-1"):
        self.bucket = bucket
        self.region = region
        logger.warning("S3StorageBackend is a stub — not yet implemented")

    async def store(self, local_path: str, key: str) -> str:
        raise NotImplementedError("S3 storage not yet implemented")

    async def get_url(self, key: str) -> str:
        raise NotImplementedError("S3 storage not yet implemented")

    async def delete(self, key: str) -> None:
        raise NotImplementedError("S3 storage not yet implemented")
