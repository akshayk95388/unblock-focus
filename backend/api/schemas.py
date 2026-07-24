"""Pydantic request/response schemas for the API."""
from typing import Optional, List
from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    stressor: str = Field(..., min_length=3, max_length=500)
    duration_category: Optional[str] = Field(default="quick")  # "quick" | "deep"
    duration_mins: Optional[int] = Field(default=None, ge=1, le=30)
    voice: str = Field(default="gentle_female")
    music: str = Field(default="none")


class GenerateResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    job_id: str
    status: str           # pending | running | complete | failed
    progress_pct: float
    current_stage: str
    audio_url: Optional[str] = None
    duration_s: Optional[float] = None
    title: Optional[str] = None
    error: Optional[str] = None
    focus_task: Optional[str] = None
    subtitles: Optional[List[dict]] = None


class HistoryItem(BaseModel):
    job_id: str
    stressor: str
    duration_mins: int
    meditation_type: Optional[str] = None
    title: Optional[str] = None
    status: str
    audio_url: Optional[str] = None
    actual_duration_s: Optional[float] = None
    created_at: str


class HistoryResponse(BaseModel):
    items: List[HistoryItem]
    total: int
