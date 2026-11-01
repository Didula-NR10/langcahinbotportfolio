from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.ai_schema import SourceReference

SESSION_ID_PATTERN = r"^[A-Za-z0-9_-]{32,128}$"


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, description="Visitor message; maximum length is configured by CHAT_MAX_MESSAGE_LENGTH.")
    session_id: str | None = Field(default=None, pattern=SESSION_ID_PATTERN, description="Omit to start a new session; return the supplied ID for subsequent turns.")

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message must contain text")
        return value


class ChatResponse(BaseModel):
    answer: str = Field(min_length=1)
    session_id: str = Field(pattern=SESSION_ID_PATTERN)
    mode: Literal["general", "direct_context", "rag"]
    sources: list[SourceReference] = Field(default_factory=list)
