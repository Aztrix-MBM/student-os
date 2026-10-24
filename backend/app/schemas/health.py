from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    app_name: str = Field(default="Student OS API")
    version: str = Field(default="0.1.0")
    timestamp: datetime
    database: str = Field(default="connected")
    environment: str = Field(default="development")
