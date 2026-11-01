import asyncio

import httpx
import pytest
from groq import APIConnectionError, APITimeoutError, AuthenticationError, NotFoundError, RateLimitError
from langchain_core.runnables import RunnableLambda
from pydantic import ValidationError

from app.ai.errors import (
    InvalidModelConfigurationError,
    MissingCredentialsError,
    ModelAuthenticationError,
    ModelConnectionError,
    ModelRateLimitError,
    ModelServiceError,
    ModelTimeoutError,
)
from app.ai.llm import create_llm
from app.core.config import Settings
from app.services.ai_service import AIService


def settings(**overrides) -> Settings:
    return Settings(_env_file=None, app_environment="testing", **overrides)


def test_missing_api_key_is_checked_only_when_engine_initializes():
    with pytest.raises(MissingCredentialsError):
        create_llm(settings(GROQ_API_KEY=""))


@pytest.mark.parametrize(
    "overrides",
    [
        {"GROQ_MODEL": "  "},
        {"LLM_TEMPERATURE": -1},
        {"LLM_MAX_OUTPUT_TOKENS": 0},
        {"LLM_TIMEOUT_SECONDS": 0},
        {"LLM_MAX_RETRIES": 4},
        {"LLM_MAX_QUESTION_CHARS": 0},
    ],
)
def test_invalid_llm_settings_are_rejected(overrides):
    with pytest.raises(ValidationError):
        settings(**overrides)


def test_llm_factory_passes_configured_limits(monkeypatch):
    captured = {}

    def fake_chat_groq(**kwargs):
        captured.update(kwargs)
        return object()

    monkeypatch.setattr("app.ai.llm.ChatGroq", fake_chat_groq)
    create_llm(settings(
        GROQ_API_KEY="dummy-test-value",
        GROQ_MODEL="example-model",
        LLM_TEMPERATURE=0.2,
        LLM_MAX_OUTPUT_TOKENS=100,
        LLM_TIMEOUT_SECONDS=15,
        LLM_MAX_RETRIES=0,
    ))
    assert captured["model"] == "example-model"
    assert captured["temperature"] == 0.2
    assert captured["max_tokens"] == 100
    assert captured["timeout"] == 15
    assert captured["max_retries"] == 0
    assert captured["api_key"].get_secret_value() == "dummy-test-value"


def test_groq_settings_load_from_environment_without_exposing_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "dummy-test-value")
    monkeypatch.setenv("GROQ_MODEL", "example-model")
    configured = Settings(_env_file=None)
    assert configured.groq_model == "example-model"
    assert configured.groq_api_key.get_secret_value() == "dummy-test-value"
    assert "dummy-test-value" not in repr(configured)
    assert "groq_api_key" not in configured.model_dump()


@pytest.mark.parametrize(
    ("provider_error", "expected"),
    [
        (AuthenticationError("private detail", response=httpx.Response(401, request=httpx.Request("GET", "https://example.com")), body=None), ModelAuthenticationError),
        (RateLimitError("private detail", response=httpx.Response(429, request=httpx.Request("GET", "https://example.com")), body=None), ModelRateLimitError),
        (APITimeoutError(httpx.Request("GET", "https://example.com")), ModelTimeoutError),
        (APIConnectionError(request=httpx.Request("GET", "https://example.com")), ModelConnectionError),
        (NotFoundError("private detail", response=httpx.Response(404, request=httpx.Request("GET", "https://example.com")), body=None), InvalidModelConfigurationError),
        (RuntimeError("private detail"), ModelServiceError),
    ],
)
def test_provider_errors_are_mapped_without_leaking_details(provider_error, expected):
    async def fail(_):
        raise provider_error

    service = AIService(settings(), RunnableLambda(fail))
    with pytest.raises(expected) as caught:
        asyncio.run(service.generate_response("A question"))
    assert "private detail" not in str(caught.value)
