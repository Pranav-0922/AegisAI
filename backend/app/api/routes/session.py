from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.services import scoring, report_generator, dispatch
from app.api.routes.dashboard import manager

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/active", response_model=list[schemas.ActiveSessionOut])
def list_active_sessions(db: Session = Depends(get_db)):
    """
    Lists all candidates with an open session (no session_end yet), each
    with their current running score. This is what the Live Monitoring
    dashboard grid renders -- one card per row returned here.
    """
    candidates = (
        db.query(models.Candidate)
        .filter(models.Candidate.session_end.is_(None))
        .all()
    )

    results = []
    for c in candidates:
        score, _, _ = scoring.compute_running_score(db, c.id)
        exam = db.get(models.Exam, c.exam_id)
        results.append(
            schemas.ActiveSessionOut(
                candidate_id=c.id,
                name=c.name,
                exam_id=c.exam_id,
                exam_title=exam.title if exam else c.exam_id,
                session_start=c.session_start,
                running_score=score,
            )
        )
    return results


@router.get("/{candidate_id}/answers", response_model=list[schemas.AnswerSegmentOut])
def get_answers(candidate_id: str, db: Session = Depends(get_db)):
    """Returns every answer segment submitted so far, in order -- what the review screen displays as the candidate's response."""
    segments = (
        db.query(models.AnswerSegment)
        .filter(models.AnswerSegment.candidate_id == candidate_id)
        .order_by(models.AnswerSegment.timestamp.asc())
        .all()
    )
    return segments


@router.post("/start", response_model=schemas.SessionStartResponse)
def start_session(payload: schemas.SessionStartRequest, db: Session = Depends(get_db)):
    """Initialises a new exam session for a candidate."""
    candidate = models.Candidate(
        name=payload.candidate_name,
        email=payload.candidate_email,
        exam_id=payload.exam_id,
        session_start=datetime.utcnow(),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return schemas.SessionStartResponse(
        candidate_id=candidate.id,
        exam_id=candidate.exam_id,
        session_start=candidate.session_start,
    )


@router.post("/{candidate_id}/answer", response_model=schemas.AnswerSubmitResponse)
def submit_answer(
    candidate_id: str,
    payload: schemas.AnswerSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Submits a typed (or transcribed) answer segment for NLP analysis.

    This endpoint persists the segment and returns immediately; the actual
    analysis is dispatched to the ML services as a background task (see
    app/services/dispatch.py), which then POST their results back to
    /session/{candidate_id}/events -- keeping this endpoint fast for the
    candidate-facing exam UI.
    """
    candidate = db.get(models.Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate session not found")

    segment = models.AnswerSegment(
        candidate_id=candidate_id,
        question_id=payload.question_id,
        text_content=payload.text_content,
        source=payload.source,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    background_tasks.add_task(
        dispatch.dispatch_to_ai_text_detector, candidate_id, segment.id, segment.text_content
    )

    # TODO: dispatch segment.text_content to ML services here (see services/dispatch.py stub)

    return schemas.AnswerSubmitResponse(
        answer_segment_id=segment.id,
        accepted=True,
        triggered_events=[],
    )


@router.get("/{candidate_id}/events", response_model=list[schemas.EventOut])
def get_events(candidate_id: str, db: Session = Depends(get_db)):
    """Retrieves the timestamped linguistic event stream for a session."""
    events = (
        db.query(models.Event)
        .filter(models.Event.candidate_id == candidate_id)
        .order_by(models.Event.timestamp.asc())
        .all()
    )
    return events


@router.post("/{candidate_id}/events", response_model=schemas.EventOut)
async def post_event(candidate_id: str, payload: schemas.EventIn, db: Session = Depends(get_db)):
    """
    Called BY the ML services (not the frontend) to push a newly detected
    linguistic event. Recomputes the running score, generates/updates the
    report if the threshold is crossed, and broadcasts both to any
    connected examiner dashboards over /dashboard/live.
    """
    if payload.candidate_id != candidate_id:
        raise HTTPException(status_code=400, detail="candidate_id mismatch")

    event = models.Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)

    # Recompute the rolling-window score now that a new event has landed.
    score_row = scoring.upsert_session_score(db, candidate_id)

    # Push the new event to any live dashboards.
    await manager.broadcast(
        schemas.DashboardUpdate(
            candidate_id=candidate_id,
            type="new_event",
            event=schemas.EventOut.model_validate(event, from_attributes=True),
        ).model_dump(mode="json")
    )

    # Push the updated score too.
    await manager.broadcast(
        schemas.DashboardUpdate(
            candidate_id=candidate_id,
            type="score_update",
            score=schemas.ScoreOut.model_validate(score_row, from_attributes=True),
        ).model_dump(mode="json")
    )

    # If the score just crossed the threshold, (re)generate the explainable report.
    report_generator.maybe_generate_report(
        db, candidate_id, score_row.running_score, settings.SUSPICION_THRESHOLD
    )

    return event


@router.get("/{candidate_id}/score", response_model=schemas.ScoreOut)
def get_score(candidate_id: str, db: Session = Depends(get_db)):
    """
    Returns the current running suspicion score, recomputed fresh from
    events in the rolling window (not just the last cached row) so a
    dashboard that reloads mid-session sees an accurate number even if no
    new event has landed in the last few seconds.
    """
    computed_score, window_start, window_end = scoring.compute_running_score(db, candidate_id)
    return schemas.ScoreOut(
        candidate_id=candidate_id,
        running_score=computed_score,
        window_start=window_start,
        window_end=window_end,
    )


@router.get("/{candidate_id}/report", response_model=schemas.ReportOut)
def get_report(candidate_id: str, db: Session = Depends(get_db)):
    """Returns the full post-exam explainable report with highlighted text evidence."""
    report = (
        db.query(models.Report)
        .filter(models.Report.candidate_id == candidate_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not yet generated")

    import json
    evidence_raw = json.loads(report.evidence_refs) if report.evidence_refs else []

    return schemas.ReportOut(
        candidate_id=report.candidate_id,
        final_score=report.final_score,
        evidence=evidence_raw,
        summary_text=report.summary_text,
        reviewed_by=report.reviewed_by,
        created_at=report.created_at,
    )
