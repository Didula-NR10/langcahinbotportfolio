from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class DocumentView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    file_size: int
    mime_type: str
    file_hash: str
    category: str
    title: str
    description: str
    status: Literal["uploaded", "queued", "processing", "indexed", "failed", "deleting"]
    chunk_count: int
    created_at: datetime
    updated_at: datetime
    indexed_at: datetime | None
    error_message: str | None


class JobView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    status: Literal["queued", "processing", "completed", "failed"]
    attempt_count: int
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime


class DocumentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str | None = Field(default=None, min_length=1, max_length=80, pattern=r"^[A-Za-z0-9][A-Za-z0-9 _-]*$")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("category", "title", "description")
    @classmethod
    def strip(cls, value):
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def has_change(self):
        if not self.model_fields_set:
            raise ValueError("At least one metadata field is required")
        if any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("Metadata fields must not be null")
        if self.category == "" or self.title == "":
            raise ValueError("Metadata fields must contain text")
        return self
