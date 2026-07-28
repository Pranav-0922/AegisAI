from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import Base, engine
from app.api.routes import session, dashboard

# Creates tables on startup. Fine for early development on sqlite/free-tier
# Postgres; switch to Alembic migrations once the schema stabilises.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="NLP-powered exam integrity backend -- API contract for "
                 "the frontend dashboard and all ML services.",
    version="0.1.0",
)

# Wide-open for local dev across your React frontend on a different port.
# Tighten this to your actual deployed frontend origin before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(dashboard.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}
