"""
Core DB models.

These map 1:1 onto the schema sketched in the AegisAI report (Chapter 5.3),
kept close to that spec so the rest of the team can cross-reference it.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from app.db.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class SourceModality(str, enum.Enum):
    typed = "typed"
    transcribed = "transcribed"


class EventType(str, enum.Enum):
    ai_text_probability = "ai_text_probability"
    semantic_match = "semantic_match"
    style_deviation = "style_deviation"
    multi_speaker = "multi_speaker"
    coaching_phrase = "coaching_phrase"


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)

    exams = relationship("Exam", back_populates="institution")


class Exam(Base):
    __tablename__ = "exams"
    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"))
    scheduled_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)

    institution = relationship("Institution", back_populates="exams")
    candidates = relationship("Candidate", back_populates="exam")


class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    exam_id = Column(String, ForeignKey("exams.id"))
    session_start = Column(DateTime, nullable=True)
    session_end = Column(DateTime, nullable=True)

    exam = relationship("Exam", back_populates="candidates")
    answer_segments = relationship("AnswerSegment", back_populates="candidate")
    events = relationship("Event", back_populates="candidate")
    scores = relationship("SessionScore", back_populates="candidate")
    report = relationship("Report", back_populates="candidate", uselist=False)


class AnswerSegment(Base):
    __tablename__ = "answer_segments"
    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    question_id = Column(String, nullable=True)
    text_content = Column(Text, nullable=False)
    source = Column(Enum(SourceModality), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="answer_segments")


class Event(Base):
    """A single timestamped linguistic event produced by one of the ML services."""
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    event_type = Column(Enum(EventType), nullable=False)
    source_modality = Column(Enum(SourceModality), nullable=False)
    confidence = Column(Float, nullable=False)
    span_start = Column(Integer, nullable=True)
    span_end = Column(Integer, nullable=True)
    answer_segment_id = Column(String, ForeignKey("answer_segments.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="events")


class SessionScore(Base):
    """Running suspicion score for a candidate over a rolling window."""
    __tablename__ = "session_scores"
    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    running_score = Column(Float, nullable=False, default=0.0)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)

    candidate = relationship("Candidate", back_populates="scores")


class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), unique=True)
    final_score = Column(Float, nullable=False)
    evidence_refs = Column(Text, nullable=True)   # JSON-encoded list of event IDs
    summary_text = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="report")
