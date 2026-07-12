"""S3 storage backend integration tests.

Tests real S3 operations: upload, URL generation, fetch, and delete.
Uses actual AWS credentials from .env — skips if credentials are missing.
"""
import asyncio
import os
import tempfile
import urllib.request

import pytest

# ---------- helpers ----------

def _get_settings():
    """Load settings from .env."""
    from config.settings import get_settings
    return get_settings()


def _skip_if_no_creds():
    """Skip the test if AWS credentials are not configured."""
    settings = _get_settings()
    if not settings.aws_access_key_id or not settings.aws_bucket_name:
        pytest.skip("AWS credentials not configured in .env — skipping S3 test")


# ---------- tests ----------

class TestS3Backend:
    """Integration tests for S3StorageBackend using real AWS."""

    def test_s3_backend_initializes(self):
        """S3StorageBackend can be instantiated with credentials from .env."""
        _skip_if_no_creds()
        from storage.s3_backend import S3StorageBackend
        settings = _get_settings()

        backend = S3StorageBackend(
            bucket=settings.aws_bucket_name,
            region=settings.aws_region,
        )

        assert backend.bucket == settings.aws_bucket_name
        assert backend.region == settings.aws_region
        assert backend.client is not None

    def test_url_generation_format(self):
        """get_public_url returns correct S3 URL format."""
        _skip_if_no_creds()
        from storage.s3_backend import S3StorageBackend
        settings = _get_settings()

        backend = S3StorageBackend(
            bucket=settings.aws_bucket_name,
            region=settings.aws_region,
        )

        url = backend.get_public_url("test-job-123/meditation.mp3")
        expected = f"https://{settings.aws_bucket_name}.s3.{settings.aws_region}.amazonaws.com/test-job-123/meditation.mp3"
        assert url == expected

    def test_factory_returns_s3_when_configured(self):
        """get_storage_backend returns S3StorageBackend when STORAGE_BACKEND=s3."""
        _skip_if_no_creds()
        from storage.factory import get_storage_backend
        from storage.s3_backend import S3StorageBackend

        # Temporarily override
        original = os.environ.get("STORAGE_BACKEND")
        os.environ["STORAGE_BACKEND"] = "s3"
        try:
            backend = get_storage_backend()
            assert isinstance(backend, S3StorageBackend)
        finally:
            if original is not None:
                os.environ["STORAGE_BACKEND"] = original
            else:
                os.environ.pop("STORAGE_BACKEND", None)

    def test_upload_fetch_delete_roundtrip(self):
        """Upload a test MP3 file to S3, fetch it via HTTP, then delete it."""
        _skip_if_no_creds()
        from storage.s3_backend import S3StorageBackend
        settings = _get_settings()

        backend = S3StorageBackend(
            bucket=settings.aws_bucket_name,
            region=settings.aws_region,
        )

        # Create a small test MP3 file (just a valid MP3 header + silence frame)
        # This is a minimal valid MP3: ID3v2 tag + one silent MPEG frame
        mp3_header = (
            b'\xff\xfb\x90\x00'  # MPEG1, Layer 3, 128kbps, 44100Hz
            + b'\x00' * 413     # Padded frame data (417 bytes total for one frame)
        )

        test_key = "_test_s3_integration/test_upload.mp3"

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(mp3_header)
            tmp_path = tmp.name

        try:
            # 1. Upload
            url = asyncio.get_event_loop().run_until_complete(
                backend.store(tmp_path, test_key)
            )
            assert url is not None
            assert test_key in url
            assert url.startswith("https://")
            print(f"\n  ✓ Uploaded to: {url}")

            # 2. Verify URL format and get presigned URL
            expected_url = backend.get_public_url(test_key)
            assert url == expected_url
            print(f"  ✓ Static URL format correct")

            presigned_url = asyncio.get_event_loop().run_until_complete(
                backend.get_url(test_key)
            )
            assert presigned_url is not None
            assert "AWSAccessKeyId" in presigned_url or "X-Amz-Signature" in presigned_url
            print(f"  ✓ Presigned URL successfully generated: {presigned_url[:80]}...")

            # 3. Fetch the file via HTTP using the presigned URL to verify it's accessible
            req = urllib.request.Request(presigned_url)
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read()
                assert len(body) == len(mp3_header), f"Expected {len(mp3_header)} bytes, got {len(body)}"
                assert response.status == 200
                content_type = response.headers.get("Content-Type", "")
                assert "audio" in content_type or "octet" in content_type, f"Unexpected Content-Type: {content_type}"
                print(f"  ✓ Successfully fetched {len(body)} bytes from S3 using presigned URL (HTTP 200)")

            # 4. Delete
            asyncio.get_event_loop().run_until_complete(
                backend.delete(test_key)
            )
            print(f"  ✓ Deleted test file from S3")

            # 5. Verify delete — file should return 403 or 404
            try:
                with urllib.request.urlopen(presigned_url, timeout=10):
                    pytest.fail("File should have been deleted but is still accessible")
            except urllib.error.HTTPError as e:
                assert e.code in (403, 404), f"Expected 403/404 after delete, got {e.code}"
                print(f"  ✓ Confirmed deleted (HTTP {e.code})")

        finally:
            os.unlink(tmp_path)

    def test_upload_with_unique_job_id_key(self):
        """Verify that different job IDs produce different S3 keys (uniqueness guarantee)."""
        _skip_if_no_creds()
        from storage.s3_backend import S3StorageBackend
        settings = _get_settings()

        backend = S3StorageBackend(
            bucket=settings.aws_bucket_name,
            region=settings.aws_region,
        )

        url1 = backend.get_public_url("job-aaa-111/meditation.mp3")
        url2 = backend.get_public_url("job-bbb-222/meditation.mp3")

        assert url1 != url2
        assert "job-aaa-111" in url1
        assert "job-bbb-222" in url2
        print(f"\n  ✓ Different job IDs produce different URLs")
