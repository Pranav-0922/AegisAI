# AegisAI Backend — API Contract Skeleton

This is the FastAPI backend that everything else (frontend dashboard, and
every ML service) talks to. It's been run and smoke-tested end-to-end —
session start → answer submission → ML service posting an event → events
being readable again — all confirmed working.

## Why this exists first
Frontend, backend, and all five ML services (AI-text detector, semantic
similarity, stylometry, ASR, temporal engine) are being built separately,
possibly by different tools/people. This skeleton is the **shared contract**
they all build against, so nobody blocks anybody else.

## Structure
```
app/
  core/config.py       - all settings, read from .env (see .env.example)
  db/database.py        - SQLAlchemy engine/session setup
  models/models.py      - DB tables (candidates, exams, events, scores, reports)
  schemas/schemas.py     - Pydantic request/response shapes = THE CONTRACT
  api/routes/session.py  - session lifecycle + event ingestion endpoints
  api/routes/dashboard.py- WebSocket for live examiner monitoring
  services/dispatch.py   - stub that fans out answer text to ML services
  main.py                - app entrypoint, CORS, router wiring
```

## Running it locally
```bash
pip install -r requirements.txt
cp .env.example .env          # defaults work out of the box with sqlite
uvicorn app.main:app --reload --port 8000
```
Then open http://localhost:8000/docs for interactive Swagger UI — every
endpoint below is live and testable from the browser.

## Endpoints (matches the AegisAI report's Chapter 6.7 design)
| Endpoint | Method | Called by |
|---|---|---|
| `/session/start` | POST | Frontend, when candidate begins exam |
| `/session/{id}/answer` | POST | Frontend, per typed/transcribed segment |
| `/session/{id}/events` | GET | Frontend/dashboard |
| `/session/{id}/events` | POST | **ML services**, to report a detection |
| `/session/{id}/score` | GET | Frontend/dashboard |
| `/session/{id}/report` | GET | Frontend, post-exam review |
| `/dashboard/live` | WS | Frontend, live push updates |

## What's stubbed vs what's real
**Real and working:** DB models, all routes, request/response validation,
WebSocket connection handling, CORS, health check.

**Stubbed — fill in as each piece gets built:**
- `services/dispatch.py` — currently fails silently if an ML service isn't
  up yet. Once you deploy the AI-text detector etc., point
  `AI_TEXT_DETECTOR_URL` (etc.) in `.env` at it and this starts working.
- The temporal correlation engine (rolling-window scoring) isn't
  implemented yet — `/session/{id}/score` currently returns a neutral
  default until a `SessionScore` row exists. This is the next backend
  piece worth building once at least one ML service is live and posting
  real events.
- Report generation (`/session/{id}/report`) reads from the `reports`
  table but nothing writes to it yet — that's the explainability module's
  job, triggered when the score crosses `SUSPICION_THRESHOLD`.
- Auth — `JWT_SECRET` is configured but no login/auth routes exist yet.
  Add these once you're ready to gate the examiner dashboard.

## Free-tier deployment notes
- **DB**: swap `DATABASE_URL` in `.env` for a free Supabase or Neon
  Postgres connection string when ready — code doesn't change.
- **Hosting**: deploys as-is to Hugging Face Spaces (Docker) or Render's
  free web service tier.
- **Redis**: not wired in yet (see stub notes above) — when you get there,
  Upstash's free tier works fine with the `redis` Python client.

## Next step
Pick one ML service (AI-text detector is the most novel — recommend
starting there) and build it as its own FastAPI service with a single
`/analyze` endpoint that POSTs its result to
`/session/{candidate_id}/events` on this backend. That's the next frame.
