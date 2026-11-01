from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.core.config import Settings
from app.core.limits import ChatLimitExceeded, ChatLimiter
from app.main import create_app


def test_per_client_and_global_limits_are_bounded():
    now = [0.0]
    settings = Settings(_env_file=None, app_environment="testing", RATE_LIMIT_REQUESTS_PER_MINUTE=2,
                        RATE_LIMIT_REQUESTS_PER_HOUR=3, GLOBAL_REQUESTS_PER_MINUTE=2)
    limiter = ChatLimiter(settings, clock=lambda: now[0])
    for _ in range(2):
        limiter.acquire("visitor-a")
        limiter.release()
    with pytest.raises(ChatLimitExceeded) as exc:
        limiter.acquire("visitor-a")
    assert exc.value.retry_after == 60
    now[0] = 61
    limiter.acquire("visitor-a")
    limiter.release()
    with pytest.raises(ChatLimitExceeded) as exc:
        limiter.acquire("visitor-a")
    assert exc.value.retry_after > 0
    limiter.acquire("visitor-b")
    limiter.release()
    with pytest.raises(ChatLimitExceeded):
        limiter.acquire("visitor-c")
    now[0] = 3662
    limiter.acquire("visitor-a")
    limiter.release()
    assert len(limiter._clients) == 1


def test_concurrent_capacity_is_released():
    settings = Settings(_env_file=None, app_environment="testing", MAX_CONCURRENT_CHAT_REQUESTS=1)
    limiter = ChatLimiter(settings)
    limiter.acquire("visitor-a")
    with pytest.raises(ChatLimitExceeded):
        limiter.acquire("visitor-b")
    assert limiter.active == 1
    limiter.release()
    limiter.acquire("visitor-b")
    limiter.release()


def test_chat_api_limits_and_ignores_untrusted_forwarding_header():
    settings = Settings(_env_file=None, app_environment="testing", RATE_LIMIT_REQUESTS_PER_MINUTE=1,
                        RATE_LIMIT_REQUESTS_PER_HOUR=2, GLOBAL_REQUESTS_PER_MINUTE=2)
    with TestClient(create_app(settings)) as client:
        first = client.post("/api/v1/chat", json={"message": "What is the developer's GPA?"},
                            headers={"X-Forwarded-For": "198.51.100.1"})
        second = client.post("/api/v1/chat", json={"message": "What is the developer's GPA?"},
                             headers={"X-Forwarded-For": "203.0.113.2"})
    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "CHAT_RATE_LIMIT"
    assert int(second.headers["retry-after"]) >= 1


def test_oversized_and_malformed_json_fail_before_service():
    settings = Settings(_env_file=None, app_environment="testing", CHAT_MAX_REQUEST_BYTES=1024)
    with TestClient(create_app(settings)) as client:
        oversized = client.post("/api/v1/chat", content=b"x" * 1025,
                                headers={"content-type": "application/json"})
        malformed = client.post("/api/v1/chat", content=b"{bad",
                                headers={"content-type": "application/json"})
        invalid_session = client.post("/api/v1/chat", json={"message": "hello", "session_id": "bad"})
        extra = client.post("/api/v1/chat", json={"message": "hello", "unexpected": True})
    assert oversized.status_code == 413
    assert oversized.json()["error"]["code"] == "REQUEST_TOO_LARGE"
    for response in (malformed, invalid_session, extra):
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_production_and_tracing_require_explicit_safe_configuration():
    with pytest.raises(ValidationError) as invalid:
        Settings(_env_file=None, app_environment="production", cors_origins=["http://portfolio.example"], GROQ_API_KEY="test-secret-canary")
    assert "test-secret-canary" not in str(invalid.value)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_environment="production", cors_origins=["https://portfolio.example"])
    with pytest.raises(ValidationError):
        Settings(_env_file=None, LANGSMITH_TRACING=True)
