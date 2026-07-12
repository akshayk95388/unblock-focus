"""Storage backend factory — returns the configured storage backend."""
import logging

from config.settings import get_settings
from storage.base import StorageBackend

logger = logging.getLogger(__name__)


def get_storage_backend() -> StorageBackend:
    """Return the storage backend based on the STORAGE_BACKEND setting."""
    settings = get_settings()

    if settings.storage_backend == "s3":
        from storage.s3_backend import S3StorageBackend

        return S3StorageBackend(
            bucket=settings.aws_bucket_name,
            region=settings.aws_region,
        )
    else:
        from storage.local_backend import LocalStorageBackend

        return LocalStorageBackend(media_dir=settings.media_dir)
