"""Phase 6 Tests — API + Storage + Database

Tests FastAPI endpoints, database models, storage, and SSE streaming.
Uses httpx AsyncClient with a test database.
"""
import pytest
import pytest_asyncio
import json
import uuid
from datetime import datetime

import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from api.main import app
from db.models import Base, MeditationJob
from db.session import get_db
from api.routes.generate import update_progress


# ── Test database setup ─────────────────────────────────────────────


@pytest_asyncio.fixture
async def test_db():
    """Create a fresh in-memory SQLite database for each test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield factory
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def async_client(test_db):
    """httpx AsyncClient for testing FastAPI."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client


@pytest_asyncio.fixture
async def seeded_job(test_db):
    """Create a seeded job in the test database."""
    async with test_db() as db:
        job = MeditationJob(
            id=str(uuid.uuid4()),
            status="pending",
            stressor="test anxiety",
            duration_mins=5,
            voice="gentle_female",
            music="none",
            created_at=datetime.utcnow(),
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job


@pytest_asyncio.fixture
async def completed_job(test_db):
    """Create a completed job in the test database."""
    async with test_db() as db:
        job = MeditationJob(
            id=str(uuid.uuid4()),
            status="complete",
            stressor="test stress",
            duration_mins=5,
            voice="gentle_female",
            music="none",
            meditation_type="anxiety",
            title="Finding Calm",
            storage_url="/media/test/meditation.mp3",
            actual_duration_s=300.5,
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job


# ── Health check ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ── Generate endpoint tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_returns_job_id(async_client):
    response = await async_client.post("/api/generate", json={
        "stressor": "anxiety about a meeting",
        "duration_mins": 3,
        "voice": "gentle_female",
        "music": "ambient",
    })
    assert response.status_code == 200
    body = response.json()
    assert "job_id" in body
    assert len(body["job_id"]) == 36  # UUID format


@pytest.mark.asyncio
async def test_invalid_request_empty_stressor(async_client):
    response = await async_client.post("/api/generate", json={
        "stressor": "",
        "duration_mins": 5,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_request_short_stressor(async_client):
    response = await async_client.post("/api/generate", json={
        "stressor": "ab",
        "duration_mins": 5,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_request_duration_too_high(async_client):
    response = await async_client.post("/api/generate", json={
        "stressor": "valid stressor text",
        "duration_mins": 60,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_request_duration_zero(async_client):
    response = await async_client.post("/api/generate", json={
        "stressor": "valid stressor text",
        "duration_mins": 0,
    })
    assert response.status_code == 422


# ── Status endpoint tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_status_returns_job(async_client, seeded_job):
    response = await async_client.get(f"/api/status/{seeded_job.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == seeded_job.id
    assert body["status"] in ("pending", "running", "complete", "failed")


@pytest.mark.asyncio
async def test_status_not_found(async_client):
    fake_id = str(uuid.uuid4())
    response = await async_client.get(f"/api/status/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_completed_job_has_audio_url(async_client, completed_job):
    # Set in-memory progress to complete
    update_progress(completed_job.id, "complete", 100,
                   audio_url="/media/test/meditation.mp3")

    response = await async_client.get(f"/api/status/{completed_job.id}")
    body = response.json()
    assert body["status"] == "complete"
    assert body["audio_url"] is not None
    assert body["duration_s"] > 0


# ── History endpoint tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_history_returns_items(async_client, completed_job):
    response = await async_client.get("/api/history")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 1
    assert len(body["items"]) >= 1


@pytest.mark.asyncio
async def test_history_empty_db(async_client):
    response = await async_client.get("/api/history")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["items"] == []


@pytest.mark.asyncio
async def test_history_pagination(async_client, test_db):
    # Create 5 jobs
    async with test_db() as db:
        for i in range(5):
            job = MeditationJob(
                id=str(uuid.uuid4()),
                status="complete",
                stressor=f"stressor {i}",
                duration_mins=5,
                voice="gentle_female",
                music="none",
                created_at=datetime.utcnow(),
            )
            db.add(job)
        await db.commit()

    # Paginate
    response = await async_client.get("/api/history?limit=2&offset=0")
    body = response.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2

    response2 = await async_client.get("/api/history?limit=2&offset=2")
    body2 = response2.json()
    assert len(body2["items"]) == 2


# ── SSE streaming tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_sse_stream_sends_events(async_client):
    """SSE endpoint must send at least one event when progress exists."""
    job_id = str(uuid.uuid4())

    # Pre-set progress to "complete" so the SSE loop terminates immediately
    update_progress(job_id, "complete", 100, audio_url="/media/test.mp3")

    async with async_client.stream("GET", f"/api/generate/stream/{job_id}") as stream:
        events = []
        async for line in stream.aiter_lines():
            if line.startswith("data:"):
                data = json.loads(line[5:])
                events.append(data)
                if data.get("stage") in ("complete", "failed"):
                    break
            if len(events) >= 3:
                break

    assert len(events) >= 1
    assert "stage" in events[0]
    assert "pct" in events[0]


# ── Database model tests ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_db_model_fields(test_db):
    """MeditationJob should store all required fields."""
    async with test_db() as db:
        job = MeditationJob(
            id=str(uuid.uuid4()),
            status="complete",
            stressor="test",
            duration_mins=5,
            voice="gentle_female",
            music="none",
            meditation_type="anxiety",
            title="Test Meditation",
            storage_url="/media/test.mp3",
            actual_duration_s=300.5,
            subtitles=[{"text": "Hello", "start_ms": 0, "end_ms": 2000}],
            tts_provider_used="edge_tts",
            fix_attempts=1,
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        db.add(job)
        await db.commit()

        from sqlalchemy import select
        result = await db.execute(select(MeditationJob).where(MeditationJob.id == job.id))
        loaded = result.scalar_one()

        assert loaded.meditation_type == "anxiety"
        assert loaded.actual_duration_s == 300.5
        assert loaded.fix_attempts == 1


# ── Storage tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_local_storage_stores_file(tmp_path):
    """LocalStorageBackend should copy file to media directory."""
    from storage.local_backend import LocalStorageBackend

    storage = LocalStorageBackend(media_dir=str(tmp_path / "media"))

    # Create a source file
    source = tmp_path / "source.mp3"
    source.write_bytes(b"fake audio data")

    url = await storage.store(str(source), "test-job/meditation.mp3")
    assert url == "/media/test-job/meditation.mp3"
    assert (tmp_path / "media" / "test-job" / "meditation.mp3").exists()


@pytest.mark.asyncio
async def test_local_storage_delete(tmp_path):
    """LocalStorageBackend should delete stored files."""
    from storage.local_backend import LocalStorageBackend

    storage = LocalStorageBackend(media_dir=str(tmp_path / "media"))

    source = tmp_path / "source.mp3"
    source.write_bytes(b"fake audio data")
    await storage.store(str(source), "test.mp3")

    await storage.delete("test.mp3")
    assert not (tmp_path / "media" / "test.mp3").exists()
