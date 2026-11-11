import json
from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import parse_qs, urlsplit
import re
from uuid import UUID

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="PORTFOLIO_", extra="ignore",
        hide_input_in_errors=True,
    )

    app_name: str = "Portfolio AI Chatbot API"
    app_environment: Literal["development", "testing", "production"] = "development"
    debug: bool = False
    api_version: Literal["v1"] = "v1"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    api_host: str = "127.0.0.1"
    api_port: int = Field(default=8000, ge=1, le=65535)
    groq_api_key: SecretStr | None = Field(default=None, validation_alias="GROQ_API_KEY", repr=False, exclude=True)
    groq_model: str = Field(default="openai/gpt-oss-20b", validation_alias="GROQ_MODEL")
    llm_temperature: float = Field(default=0.3, ge=0, le=2, validation_alias="LLM_TEMPERATURE")
    llm_max_output_tokens: int = Field(default=2048, ge=1, le=8192, validation_alias="LLM_MAX_OUTPUT_TOKENS")
    llm_timeout_seconds: float = Field(default=30, gt=0, le=120, validation_alias="LLM_TIMEOUT_SECONDS")
    llm_max_retries: int = Field(default=1, ge=0, le=3, validation_alias="LLM_MAX_RETRIES")
    llm_max_question_chars: int = Field(default=4000, ge=1, le=10000, validation_alias="LLM_MAX_QUESTION_CHARS")
    llm_max_response_chars: int = Field(default=8000, ge=100, le=50000, validation_alias="LLM_MAX_RESPONSE_CHARS")
    knowledge_mode: Literal["direct_context", "rag"] = Field(default="direct_context", validation_alias="KNOWLEDGE_MODE")
    knowledge_path: str = Field(default="app/knowledge", validation_alias="KNOWLEDGE_PATH")
    rag_top_k: int = Field(default=4, ge=1, le=10, validation_alias="RAG_TOP_K")
    rag_chunk_size: int = Field(default=700, ge=100, le=4000, validation_alias="RAG_CHUNK_SIZE")
    rag_chunk_overlap: int = Field(default=100, ge=0, validation_alias="RAG_CHUNK_OVERLAP")
    rag_max_context_chars: int = Field(default=6000, ge=200, le=30000, validation_alias="RAG_MAX_CONTEXT_CHARS")
    embedding_provider: Literal["google"] = Field(default="google", validation_alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="gemini-embedding-001", validation_alias="EMBEDDING_MODEL")
    embedding_api_key: SecretStr | None = Field(default=None, validation_alias="EMBEDDING_API_KEY", repr=False, exclude=True)
    vector_db_path: str = Field(default="data/chroma", validation_alias="VECTOR_DB_PATH")
    chat_max_message_length: int = Field(default=2000, ge=1, le=10000, validation_alias="CHAT_MAX_MESSAGE_LENGTH")
    chat_max_history_messages: int = Field(default=12, ge=2, le=100, validation_alias="CHAT_MAX_HISTORY_MESSAGES")
    chat_max_history_chars: int = Field(default=6000, ge=100, le=50000, validation_alias="CHAT_MAX_HISTORY_CHARS")
    chat_session_ttl_minutes: int = Field(default=60, ge=1, le=1440, validation_alias="CHAT_SESSION_TTL_MINUTES")
    chat_max_active_sessions: int = Field(default=1000, ge=1, le=100000, validation_alias="CHAT_MAX_ACTIVE_SESSIONS")
    chat_max_request_bytes: int = Field(default=16384, ge=1024, le=1048576, validation_alias="CHAT_MAX_REQUEST_BYTES")
    rate_limit_requests_per_minute: int = Field(default=5, ge=1, le=10000, validation_alias="RATE_LIMIT_REQUESTS_PER_MINUTE")
    rate_limit_requests_per_hour: int = Field(default=50, ge=1, le=100000, validation_alias="RATE_LIMIT_REQUESTS_PER_HOUR")
    global_requests_per_minute: int = Field(default=100, ge=1, le=1000000, validation_alias="GLOBAL_REQUESTS_PER_MINUTE")
    max_concurrent_chat_requests: int = Field(default=4, ge=1, le=1000, validation_alias="MAX_CONCURRENT_CHAT_REQUESTS")
    langsmith_tracing: bool = Field(default=False, validation_alias="LANGSMITH_TRACING")
    langsmith_api_key: SecretStr | None = Field(default=None, validation_alias="LANGSMITH_API_KEY", repr=False, exclude=True)
    langsmith_project: str = Field(default="portfolio-ai-chatbot", validation_alias="LANGSMITH_PROJECT")
    langsmith_include_conversation_data: bool = Field(default=False, validation_alias="LANGSMITH_INCLUDE_CONVERSATION_DATA")
    admin_knowledge_enabled: bool = Field(default=False, validation_alias="ADMIN_KNOWLEDGE_ENABLED")
    supabase_url: str | None = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_publishable_key: str | None = Field(default=None, validation_alias="SUPABASE_PUBLISHABLE_KEY")
    supabase_service_role_key: SecretStr | None = Field(default=None, validation_alias="SUPABASE_SERVICE_ROLE_KEY", repr=False, exclude=True)
    database_url: SecretStr | None = Field(default=None, validation_alias="DATABASE_URL", repr=False, exclude=True)
    admin_user_ids: Annotated[list[UUID], NoDecode] = Field(default_factory=list, validation_alias="ADMIN_USER_IDS")
    supabase_document_bucket: str = Field(default="portfolio-knowledge", validation_alias="SUPABASE_DOCUMENT_BUCKET")
    document_max_file_size_mb: int = Field(default=15, ge=1, le=50, validation_alias="DOCUMENT_MAX_FILE_SIZE_MB")
    document_max_files_per_upload: int = Field(default=10, ge=1, le=20, validation_alias="DOCUMENT_MAX_FILES_PER_UPLOAD")
    document_chunk_size: int = Field(default=700, ge=100, le=4000, validation_alias="DOCUMENT_CHUNK_SIZE")
    document_chunk_overlap: int = Field(default=100, ge=0, validation_alias="DOCUMENT_CHUNK_OVERLAP")
    document_embedding_dimensions: int = Field(default=768, ge=128, le=2000, validation_alias="DOCUMENT_EMBEDDING_DIMENSIONS")
    document_max_cosine_distance: float = Field(default=0.45, ge=0, le=2, validation_alias="DOCUMENT_MAX_COSINE_DISTANCE")
    document_max_pages: int = Field(default=100, ge=1, le=1000, validation_alias="DOCUMENT_MAX_PAGES")
    document_max_text_chars: int = Field(default=200000, ge=1000, le=1000000, validation_alias="DOCUMENT_MAX_TEXT_CHARS")
    document_max_chunks: int = Field(default=300, ge=1, le=5000, validation_alias="DOCUMENT_MAX_CHUNKS")
    document_embed_batch_size: int = Field(default=32, ge=1, le=100, validation_alias="DOCUMENT_EMBED_BATCH_SIZE")

    @field_validator("admin_user_ids", mode="before")
    @classmethod
    def parse_admin_ids(cls, value: object) -> object:
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value

    @field_validator("supabase_document_bucket")
    @classmethod
    def validate_bucket(cls, value: str) -> str:
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{2,63}", value):
            raise ValueError("Supabase bucket name is invalid")
        return value

    @field_validator("embedding_model", "knowledge_path", "vector_db_path")
    @classmethod
    def validate_nonempty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Setting must not be empty")
        return value

    @field_validator("groq_model")
    @classmethod
    def validate_model(cls, model: str) -> str:
        if not model.strip() or model != model.strip():
            raise ValueError("Groq model must be a nonempty model identifier")
        return model

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                return json.loads(raw)
            return [part.strip() for part in raw.split(",") if part.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, origins: list[str]) -> list[str]:
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
                or "*" in origin
            ):
                raise ValueError("CORS origins must be explicit HTTP(S) origins without paths or credentials")
        return origins

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.rag_chunk_overlap >= self.rag_chunk_size:
            raise ValueError("RAG chunk overlap must be smaller than chunk size")
        if self.chat_max_history_messages % 2:
            raise ValueError("Chat history limit must retain complete user/assistant exchanges")
        if self.rate_limit_requests_per_hour < self.rate_limit_requests_per_minute:
            raise ValueError("Hourly per-client limit must be at least the minute limit")
        if self.langsmith_tracing and (
            self.langsmith_api_key is None or not self.langsmith_api_key.get_secret_value().strip()
        ):
            raise ValueError("LangSmith tracing requires an API key")
        if self.document_chunk_overlap >= self.document_chunk_size:
            raise ValueError("Document chunk overlap must be smaller than chunk size")
        if self.admin_knowledge_enabled:
            parsed_supabase = urlsplit(self.supabase_url or "")
            if (parsed_supabase.scheme != "https" or not parsed_supabase.netloc
                    or parsed_supabase.path not in {"", "/"} or parsed_supabase.query or parsed_supabase.fragment
                    or parsed_supabase.username or parsed_supabase.password):
                raise ValueError("Admin knowledge requires a HTTPS Supabase origin")
            if not self.supabase_service_role_key or not self.supabase_service_role_key.get_secret_value().strip():
                raise ValueError("Admin knowledge requires a Supabase backend key")
            if not self.database_url or not self.database_url.get_secret_value().strip():
                raise ValueError("Admin knowledge requires a database URL")
            parsed_database = urlsplit(self.database_url.get_secret_value())
            if parsed_database.scheme not in {"postgresql", "postgresql+psycopg"} or not parsed_database.hostname:
                raise ValueError("Admin knowledge requires a PostgreSQL database URL")
            if self.app_environment == "production" and parse_qs(parsed_database.query).get("sslmode", [""])[0] not in {"require", "verify-ca", "verify-full"}:
                raise ValueError("Production admin database URL must require TLS")
            if not self.admin_user_ids:
                raise ValueError("Admin knowledge requires an administrator user ID allowlist")
            if not self.embedding_api_key or not self.embedding_api_key.get_secret_value().strip():
                raise ValueError("Admin knowledge requires an embedding API key")
            if self.knowledge_mode != "rag":
                raise ValueError("Admin knowledge requires RAG mode")
        if self.app_environment == "production":
            if self.debug:
                raise ValueError("Debug mode is forbidden in production")
            if not self.cors_origins:
                raise ValueError("Production requires explicit CORS origins")
            if any("localhost" in origin or "127.0.0.1" in origin for origin in self.cors_origins):
                raise ValueError("Production CORS origins must not point to localhost")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")
            if self.groq_api_key is None or not self.groq_api_key.get_secret_value().strip():
                raise ValueError("Production requires a Groq API key")
            if self.knowledge_mode == "rag" and (
                self.embedding_api_key is None or not self.embedding_api_key.get_secret_value().strip()
            ):
                raise ValueError("Production RAG requires an embedding API key")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
