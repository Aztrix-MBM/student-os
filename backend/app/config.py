from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./student_os.db"
    JWT_SECRET: str = "student-os-super-secret-jwt-key-2026-phase-1"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_DAYS: int = 14
    FRONTEND_ORIGINS: str = "http://127.0.0.1:5173,http://localhost:5173"
    APP_ENV: str = "development"
    ENVIRONMENT: str = "development"
    COOKIE_SECURE: bool = False
    TRUSTED_PROXY: bool = False

    # AI & Syllabus Extraction Configuration
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_PROVIDER: str = "auto"  # 'gemini', 'openai', or 'mock'
    SYLLABUS_DAILY_LIMIT_PER_USER: int = 5
    SYLLABUS_MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    SYLLABUS_MAX_PAGES: int = 30

    # Payments & UPI (Empty by default; requires explicit configuration)
    UPI_ID: str = ""
    UPI_PAYEE_NAME: str = ""
    ADMIN_EMAILS: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
