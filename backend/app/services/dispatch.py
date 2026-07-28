"""
Dispatches a newly submitted answer segment to each ML service.

This file is intentionally a stub. Each ML service (AI-text detector,
semantic similarity, stylometry, ASR, temporal engine) is being built
and deployed independently -- once one is live, wire its call in here
and have it POST its result back to /session/{candidate_id}/events.

Kept as background tasks (FastAPI BackgroundTasks or a proper task queue
like Celery/RQ later) so /session/{candidate_id}/answer stays fast for
the candidate-facing UI.
"""
import httpx

from app.core.config import settings


async def dispatch_to_ai_text_detector(candidate_id: str, segment_id: str, text: str):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(
                f"{settings.AI_TEXT_DETECTOR_URL}/analyze",
                json={"candidate_id": candidate_id, "segment_id": segment_id, "text": text},
            )
        except httpx.RequestError:
            # ML service not up yet during early development -- fail silently for now.
            # Replace with proper logging/retry once services are live.
            pass


async def dispatch_to_semantic_similarity(candidate_id: str, segment_id: str, text: str):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(
                f"{settings.SEMANTIC_SIMILARITY_URL}/analyze",
                json={"candidate_id": candidate_id, "segment_id": segment_id, "text": text},
            )
        except httpx.RequestError:
            pass


async def dispatch_to_stylometry(candidate_id: str, segment_id: str, text: str):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(
                f"{settings.STYLOMETRY_URL}/analyze",
                json={"candidate_id": candidate_id, "segment_id": segment_id, "text": text},
            )
        except httpx.RequestError:
            pass


async def dispatch_all(candidate_id: str, segment_id: str, text: str):
    """Fan out to every text-based ML service at once."""
    import asyncio
    await asyncio.gather(
        dispatch_to_ai_text_detector(candidate_id, segment_id, text),
        dispatch_to_semantic_similarity(candidate_id, segment_id, text),
        dispatch_to_stylometry(candidate_id, segment_id, text),
    )
