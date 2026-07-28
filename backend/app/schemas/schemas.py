"""
Pydantic schemas = the API contract.

This is the file to share with whoever builds the frontend and whoever
builds each ML service -- it defines exactly what JSON goes in and out,
independent of how any of those pieces are implemented internally.
"""
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, field_serializer


class UTCBaseModel(BaseModel):
    """
    Base class that stamps every naive datetime with a UTC timezone marker
    before serializing to JSON. Without this, timestamps go out as e.g.
    "2026-07-26T08:20:21" with no "Z"/"+00:00" suffix -- browsers then
    interpret that as LOCAL time instead of UTC, which silently corrupts
    every "elapsed time" calculation on the frontend by however many hours
    the viewer's timezone is offset from UTC.
    """

    @field_serializer("*", when_used="json")
    def _serialize_datetimes(self, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc).isoformat()
        return value


class SourceModality(str, Enum):
    typed = "typed"
    transcribed = "transcribed"


class EventType(str, Enum):
    ai_text_probability = "ai_text_probability"
    semantic_match = "semantic_match"
    style_deviation = "style_deviation"
    multi_speaker = "multi_speaker"
    coaching_phrase = "coaching_phrase"


# ---------- Active session list (Live Monitoring dashboard grid) ----------

class ActiveSessionOut(UTCBaseModel):
    candidate_id: str
    name: str
    exam_id: str
    exam_title: str
    session_start: datetime
    running_score: float


class AnswerSegmentOut(UTCBaseModel):
    id: str
    question_id: Optional[str] = None
    text_content: str
    source: SourceModality
    timestamp: datetime


# ---------- Session lifecycle ----------

class SessionStartRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    exam_id: str


class SessionStartResponse(UTCBaseModel):
    candidate_id: str
    exam_id: str
    session_start: datetime


# ---------- Answer submission (typed text) ----------

class AnswerSubmitRequest(BaseModel):
    question_id: Optional[str] = None
    text_content: str = Field(..., min_length=1)
    source: SourceModality = SourceModality.typed


class AnswerSubmitResponse(BaseModel):
    answer_segment_id: str
    accepted: bool
    # events generated synchronously from THIS segment, if the pipeline
    # is configured to respond inline rather than purely async
    triggered_events: List["EventOut"] = []


# ---------- Events (produced by ML services, consumed by the dashboard) ----------

class EventIn(BaseModel):
    """What an ML service posts back to the backend after analysing a segment."""
    candidate_id: str
    event_type: EventType
    source_modality: SourceModality
    confidence: float = Field(..., ge=0.0, le=1.0)
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    answer_segment_id: Optional[str] = None


class EventOut(EventIn, UTCBaseModel):
    id: str
    timestamp: datetime


# ---------- Running score ----------

class ScoreOut(UTCBaseModel):
    candidate_id: str
    running_score: float
    window_start: datetime
    window_end: datetime


# ---------- Explainable report ----------

class EvidenceItem(BaseModel):
    event_id: str
    event_type: EventType
    source_modality: SourceModality
    confidence: float
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    text_excerpt: Optional[str] = None
    reason: Optional[str] = None  # plain-language explanation, e.g. "40-point style deviation"


class ReportOut(UTCBaseModel):
    candidate_id: str
    final_score: float
    evidence: List[EvidenceItem]
    summary_text: Optional[str] = None
    reviewed_by: Optional[str] = None
    created_at: datetime


# ---------- Live dashboard (WebSocket payload shape) ----------

class DashboardUpdate(BaseModel):
    candidate_id: str
    type: str  # "score_update" | "new_event" | "session_ended"
    score: Optional[ScoreOut] = None
    event: Optional[EventOut] = None


AnswerSubmitResponse.model_rebuild()
