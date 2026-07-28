"""
AegisAI backend configuration.

All values are read from environment variables so the same code runs
against free-tier services (Supabase/Neon Postgres, Upstash Redis, etc.)
without any code changes -- only the .env file changes.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AegisAI"
    ENV: str = "development"

    # Postgres (Supabase / Neon free tier)
    DATABASE_URL: str = "sqlite:///./aegisai.db"  # falls back to local sqlite for quick dev

    # Redis (Upstash free tier) - used for the event queue / rolling window
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # ML service URLs - each one is its own deployable service.
    # Point these at wherever each model service ends up running
    # (a HF Space, a Render free web service, or localhost while developing).
    AI_TEXT_DETECTOR_URL: str = "http://localhost:8001"
    SEMANTIC_SIMILARITY_URL: str = "http://localhost:8002"
    STYLOMETRY_URL: str = "http://localhost:8003"
    ASR_URL: str = "http://localhost:8004"
    TEMPORAL_ENGINE_URL: str = "http://localhost:8005"

    # Score threshold at which the explainability module fires
    SUSPICION_THRESHOLD: float = 0.65

    class Config:
        env_file = ".env"


settings = Settings()
