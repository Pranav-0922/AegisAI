"""
Explainability module (first version).

Turns raw events into the plain-language evidence report the report says
examiners should see -- span, event type, confidence, and a short reason
string, instead of a bare percentage.
"""
import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session as DBSession

from app.models import models

REASON_TEMPLATES = {
    models.EventType.ai_text_probability: "Segment shows a {pct}% probability of being AI-generated text.",
    models.EventType.semantic_match: "Segment has a {pct}% semantic match to a known external source.",
    models.EventType.style_deviation: "Segment shows a {pct}-point deviation from this candidate's established writing style.",
    models.EventType.multi_speaker: "Transcribed audio contains more than one distinct voice ({pct}% confidence).",
    models.EventType.coaching_phrase: "Transcribed audio contains phrasing consistent with third-party coaching ({pct}% confidence).",
}


def _starts_with_vowel_sound(n: int) -> bool:
    """True for numbers 0-100 that are read aloud starting with a vowel sound (eight, eighteen, eighty-*, eleven)."""
    return n == 8 or n == 11 or n == 18 or 80 <= n <= 89


def build_reason(event: models.Event) -> str:
    pct = round(event.confidence * 100)
    template = REASON_TEMPLATES.get(event.event_type, "Flagged with {pct}% confidence.")
    reason = template.format(pct=pct)
    if _starts_with_vowel_sound(pct):
        reason = reason.replace(f" a {pct}", f" an {pct}")
    return reason


def extract_excerpt(db: DBSession, event: models.Event) -> str | None:
    """
    Slices the real answer text for an event, if it's linked to one.
    Returns None (not an empty string) when there's genuinely nothing to
    show -- the frontend renders that as "no excerpt available" rather
    than a pair of empty quote marks.
    """
    if not event.answer_segment_id:
        return None

    segment = db.get(models.AnswerSegment, event.answer_segment_id)
    if not segment:
        return None

    text = segment.text_content
    if event.span_start is not None and event.span_end is not None:
        return text[event.span_start:event.span_end] or None
    return text


def maybe_generate_report(db: DBSession, candidate_id: str, score: float, threshold: float) -> models.Report | None:
    """
    If the score has crossed the threshold, (re)generates the report for
    this candidate. Idempotent -- safe to call on every event.
    """
    if score < threshold:
        return None

    events = (
        db.query(models.Event)
        .filter(models.Event.candidate_id == candidate_id)
        .order_by(models.Event.timestamp.asc())
        .all()
    )

    evidence = [
        {
            "event_id": e.id,
            "event_type": e.event_type.value,
            "source_modality": e.source_modality.value,
            "confidence": e.confidence,
            "span_start": e.span_start,
            "span_end": e.span_end,
            "text_excerpt": extract_excerpt(db, e),
            "reason": build_reason(e),
        }
        for e in events
    ]

    summary = (
        f"{len(events)} linguistic event(s) recorded across "
        f"{len({e.event_type for e in events})} distinct signal type(s). "
        f"Current suspicion score: {round(score * 100)}/100."
    )

    report = db.query(models.Report).filter(models.Report.candidate_id == candidate_id).first()
    if report is None:
        report = models.Report(candidate_id=candidate_id)
        db.add(report)

    report.final_score = score
    report.evidence_refs = json.dumps(evidence)
    report.summary_text = summary
    report.created_at = datetime.utcnow()

    db.commit()
    db.refresh(report)
    return report
