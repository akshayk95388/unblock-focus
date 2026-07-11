"""FastAPI application — main entry point."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from db.session import init_db
from api.routes import generate, status, history

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    logger.info("Starting meditation engine...")
    await init_db()
    logger.info("Database initialized")

    # Ensure media directory exists
    media_dir = Path("./media")
    media_dir.mkdir(parents=True, exist_ok=True)

    yield

    logger.info("Shutting down meditation engine...")


app = FastAPI(
    title="Meditation Generation Engine",
    description="Generate personalized meditation audio from text descriptions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving generated media
media_dir = Path("./media")
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

# Register routes
app.include_router(generate.router)
app.include_router(status.router)
app.include_router(history.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "engine": "meditation-generation"}
