"""
Minimal temporal correlation engine.

This is intentionally simple for now -- a confidence-weighted rolling
average over the last N minutes of events, with a mild bonus for multiple
DIFFERENT event types firing close together (the "sudden style shift +
high AI-text probability + semantic match" pattern the AegisAI report
describes as more suspicious than any single isolated flag).

This is the piece to swap out for the real PyTorch sequence model later --
everything else (routes, WebSocket broadcast, report generation) calls
this through compute_running_score() and doesn't care how the number is
produced internally.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session as DBSession

from app.models import models

ROLLING_WINDOW_MINUTES = 5
CORRELATION_BONUS_PER_EXTRA_TYPE = 0.08  # small boost per distinct event type beyond the first


def compute_running_score(db: DBSession, candidate_id: str) -> tuple[float, datetime, datetime]:
    """Returns (score 0-1, window_start, window_end) for a candidate right now."""
    window_end = datetime.utcnow()
    window_start = window_end - timedelta(minutes=ROLLING_WINDOW_MINUTES)

    events = (
        db.query(models.Event)
        .filter(
            models.Event.candidate_id == candidate_id,
            models.Event.timestamp >= window_start,
        )
        .all()
    )

    if not events:
        return 0.0, window_start, window_end

    avg_confidence = sum(e.confidence for e in events) / len(events)
    distinct_types = {e.event_type for e in events}
    correlation_bonus = max(0, len(distinct_types) - 1) * CORRELATION_BONUS_PER_EXTRA_TYPE

    score = min(1.0, avg_confidence + correlation_bonus)
    return round(score, 3), window_start, window_end


def upsert_session_score(db: DBSession, candidate_id: str) -> models.SessionScore:
    """Computes the current score and writes a fresh SessionScore row."""
    score, window_start, window_end = compute_running_score(db, candidate_id)

    row = models.SessionScore(
        candidate_id=candidate_id,
        running_score=score,
        window_start=window_start,
        window_end=window_end,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
