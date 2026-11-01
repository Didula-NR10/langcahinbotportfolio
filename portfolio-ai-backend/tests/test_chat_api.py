import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.ai.errors import MissingCredentialsError, ModelAuthenticationError, ModelRateLimitError, ModelTimeoutError
from app.core.config import Settings
from app.knowledge.errors import EmbeddingServiceError
from app.main import create_app
from app.schemas.ai_schema import KnowledgeAnswer
from app.schemas.chat_schema import ChatResponse
from app.services.chat_service import ChatService


class FakeKnowledge:
    async def answer(self, question, mode="auto", history=None):
        return KnowledgeAnswer(answer="A useful answer.", model="test-model", mode="general", sources=[])


def make_client(**overrides):
    settings = Settings(_env_file=None, app_environment="testing", **overrides)
    app = create_app(settings)
    app.state.chat_service = ChatService(settings, app.state.sessions, FakeKnowledge())
    return TestClient(app, raise_server_exceptions=False)


def test_successful_new_and_continued_chat_request():
    with make_client() as client:
        first = client.post("/api/v1/chat", json={"message": "Explain Python"})
        assert first.status_code == 200
        result = ChatResponse.model_validate(first.json())
        assert result.answer == "A useful answer."
        assert result.mode == "general"
        assert result.sources == []
        second = client.post("/api/v1/chat", json={"message": "Tell me more about it", "session_id": result.session_id})
        assert second.status_code == 200
        assert second.json()["session_id"] == result.session_id
        assert client.get("/api/v1/health").status_code == 200
        assert "/api/v1/chat" in client.get("/openapi.json").json()["paths"]


@pytest.mark.parametrize("body", [
    {},
    {"message": ""},
    {"message": "   "},
    {"message": "x", "unexpected": True},
    {"message": 12},
    {"message": "x", "session_id": "bad-id"},
])
def test_invalid_request_returns_validation_error(body):
    with make_client() as client:
        response = client.post("/api/v1/chat", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_configured_message_length_rejected():
    with make_client(CHAT_MAX_MESSAGE_LENGTH=5) as client:
        response = client.post("/api/v1/chat", json={"message": "123456"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_MESSAGE"


def test_unknown_session_returns_404():
    with make_client() as client:
        response = client.post("/api/v1/chat", json={"message": "Hello", "session_id": "a" * 43})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"


def test_expired_session_returns_404():
    with make_client(CHAT_SESSION_TTL_MINUTES=1) as client:
        first = client.post("/api/v1/chat", json={"message": "Hello"}).json()
        client.app.state.sessions._clock = lambda: datetime.now(timezone.utc) + timedelta(minutes=2)
        response = client.post("/api/v1/chat", json={"message": "Again", "session_id": first["session_id"]})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


def test_busy_session_returns_409():
    with make_client() as client:
        first = client.post("/api/v1/chat", json={"message": "Hello"}).json()
        lease = client.app.state.sessions.begin(first["session_id"])
        try:
            response = client.post("/api/v1/chat", json={"message": "Overlap", "session_id": first["session_id"]})
        finally:
            client.app.state.sessions.abort(lease)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SESSION_CONFLICT"


@pytest.mark.parametrize(("error", "status"), [
    (ModelRateLimitError("Provider busy."), 429),
    (ModelTimeoutError("Provider timeout."), 504),
    (ModelAuthenticationError("Credentials rejected."), 502),
    (MissingCredentialsError("Set GROQ_API_KEY."), 503),
    (EmbeddingServiceError("Retrieval failed."), 503),
    (RuntimeError("private provider detail"), 500),
])
def test_failures_use_safe_error_schema(error, status):
    class FailingKnowledge:
        async def answer(self, *args, **kwargs):
            raise error

    with make_client() as client:
        app = client.app
        app.state.chat_service = ChatService(app.state.settings, app.state.sessions, FailingKnowledge())
        response = client.post("/api/v1/chat", json={"message": "Explain Python"})
    assert response.status_code == status
    assert "error" in response.json()
    assert "private provider detail" not in response.text


def test_real_chat_route_with_unknown_personal_fact_needs_no_key():
    settings = Settings(_env_file=None, app_environment="testing", GROQ_API_KEY="", EMBEDDING_API_KEY="")
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/v1/chat", json={"message": "What is the developer's GPA?"})
    assert response.status_code == 200
    assert response.json()["mode"] == "direct_context"
    assert "don't have verified" in response.json()["answer"]
