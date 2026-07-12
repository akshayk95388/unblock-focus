"""S3 storage backend for production audio file storage."""
import asyncio
import logging

import boto3
from botocore.exceptions import ClientError

from config.settings import get_settings
from storage.base import StorageBackend

logger = logging.getLogger(__name__)


class S3StorageBackend(StorageBackend):
    """AWS S3 storage backend. Uploads audio files to an S3 bucket."""

    def __init__(self, bucket: str = "", region: str = "us-east-1"):
        settings = get_settings()
        self.bucket = bucket or settings.aws_bucket_name
        self.region = region or settings.aws_region
        self.client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        logger.info(f"S3StorageBackend initialized: bucket={self.bucket}, region={self.region}")

    async def store(self, local_path: str, key: str) -> str:
        """Upload a file to S3 and return the public URL."""

        def _upload():
            self.client.upload_file(
                local_path,
                self.bucket,
                key,
                ExtraArgs={"ContentType": "audio/mpeg"},
            )

        await asyncio.to_thread(_upload)
        url = self.get_public_url(key)
        logger.info(f"Stored: {local_path} → {url}")
        return url

    async def get_url(self, key: str) -> str:
        def _gen():
            try:
                return self.client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket, "Key": key},
                    ExpiresIn=3600,  # 1 hour
                )
            except Exception as e:
                logger.error(f"Error generating presigned URL for {key}: {e}")
                return self.get_public_url(key)

        return await asyncio.to_thread(_gen)

    async def delete(self, key: str) -> None:
        """Delete a file from S3."""

        def _delete():
            self.client.delete_object(Bucket=self.bucket, Key=key)

        try:
            await asyncio.to_thread(_delete)
            logger.info(f"Deleted: s3://{self.bucket}/{key}")
        except ClientError as e:
            logger.error(f"Error deleting s3://{self.bucket}/{key}: {e}")

    def get_public_url(self, key: str) -> str:
        """Construct the public URL for an S3 object."""
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"
