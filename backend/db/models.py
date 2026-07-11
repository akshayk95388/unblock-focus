"""SQLAlchemy database models."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, Text, Integer, Float, JSON, DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class MeditationJob(Base):
    __tablename__ = "meditation_jobs"

    id = Column(String(36), primary_key=True)
    status = Column(String(20), default="pending")  # pending | running | complete | failed
    stressor = Column(Text)
    duration_mins = Column(Integer)
    voice = Column(String(50))
    music = Column(String(50))
    meditation_type = Column(String(20))
    title = Column(String(200))
    storage_url = Column(Text)
    actual_duration_s = Column(Float)
    subtitles = Column(JSON)
    tts_provider_used = Column(String(50))
    fix_attempts = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
