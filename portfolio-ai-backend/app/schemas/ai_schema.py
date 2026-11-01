from typing import Literal

from pydantic import BaseModel, Field


class TokenUsage(BaseModel):
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    total_tokens: int | None = Field(default=None, ge=0)


class AIResult(BaseModel):
    answer: str = Field(min_length=1)
    model: str = Field(min_length=1)
    usage: TokenUsage | None = None


class SourceReference(BaseModel):
    document: str
    category: str


class KnowledgeAnswer(AIResult):
    mode: Literal["general", "direct_context", "rag"]
    sources: list[SourceReference] = Field(default_factory=list)
