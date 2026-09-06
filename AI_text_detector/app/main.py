"""
AegisAI AI-text detector -- standalone microservice.

Single job: receive a text segment, score it, POST the result back to the
main backend as an event. Deliberately separate from the main backend so
it can be deployed, scaled, and upgraded (e.g. swapped for a real
transformer model) independently.
"""
import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from app.config import settings
from app.heuristics import score_text

app = FastAPI(title="AegisAI - AI Text Detector")


class AnalyzeRequest(BaseModel):
    candidate_id: str
    segment_id: str
    text: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-text-detector"}


@app.post("/analyze")
async def analyze(payload: AnalyzeRequest):
    """
    Scores the text, then POSTs an event back to the main backend.
    Returns the score immediately too, so this endpoint is independently
    testable with a plain curl call without needing the main backend up.
    """
    score = score_text(payload.text)

    event_payload = {
        "candidate_id": payload.candidate_id,
        "event_type": "ai_text_probability",
        "source_modality": "typed",
        "confidence": score,
        "span_start": 0,
        "span_end": len(payload.text),
        "answer_segment_id": payload.segment_id,
    }

    posted = False
    error = None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.MAIN_BACKEND_URL}/session/{payload.candidate_id}/events",
                json=event_payload,
            )
            resp.raise_for_status()
            posted = True
    except httpx.HTTPError as e:
        # Main backend not up, or candidate doesn't exist -- don't crash
        # the detector over it, just report it back in the response so
        # it's visible during testing.
        error = str(e)

    return {"score": score, "posted_to_backend": posted, "error": error}
