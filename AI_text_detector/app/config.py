from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Where the main AegisAI backend lives -- this service POSTs its
    # results there once analysis is done.
    MAIN_BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


settings = Settings()
