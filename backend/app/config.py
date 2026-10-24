from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./student_os.db"
    JWT_SECRET: str = "student-os-super-secret-jwt-key-2026-phase-1"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 14
    FRONTEND_ORIGINS: str = "http://127.0.0.1:5173,http://localhost:5173"
    APP_ENV: str = "development"
    ENVIRONMENT: str = "development"
    COOKIE_SECURE: bool = False
    TRUSTED_PROXY: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]


settings = Settings()
