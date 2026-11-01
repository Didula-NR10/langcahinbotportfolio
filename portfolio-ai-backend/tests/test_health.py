import pytest
from fastapi import Request
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app
from app.schemas.common import ErrorResponse, HealthResponse


def test_application_initialization(client):
    assert client.app.title == "Portfolio AI Chatbot API"
    assert client.app.version == "v1"
    assert client.get("/docs").status_code == 200


def test_health_response(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "portfolio-ai-chatbot",
        "version": "v1",
    }
    assert HealthResponse.model_validate(response.json()).model_dump() == response.json()


def test_rag_readiness_requires_an_existing_index(tmp_path):
    from fastapi.testclient import TestClient

    settings = Settings(_env_file=None, app_environment="testing", KNOWLEDGE_MODE="rag", VECTOR_DB_PATH=str(tmp_path / "missing"))
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/v1/health").status_code == 200
        response = client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not_ready"}


def test_unknown_route_uses_error_schema(client):
    response = client.get("/api/v1/missing")
    assert response.status_code == 404
    assert ErrorResponse.model_validate(response.json()).error.code == "NOT_FOUND"


def test_cors_configured_origin(client):
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") is None


def test_cors_rejects_unconfigured_origin(client):
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_validation_errors_use_error_schema(client):
    @client.app.get("/test/number/{value}")
    def number(value: int):
        return {"value": value}

    response = client.get("/test/number/invalid")
    assert response.status_code == 422
    assert response.json() == {"error": {"code": "VALIDATION_ERROR", "message": "Invalid request."}}


def test_unexpected_error_is_sanitized():
    from fastapi.testclient import TestClient

    app = create_app(Settings(_env_file=None, app_environment="testing"))

    @app.get("/test/fail")
    def fail(_request: Request):
        raise RuntimeError("secret-internal-value")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test/fail")
    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred."}
    }
    assert "secret-internal-value" not in response.text


@pytest.mark.parametrize(
    "overrides",
    [
        {"app_environment": "production", "debug": True, "cors_origins": ["https://example.com"]},
        {"app_environment": "production", "cors_origins": []},
        {"app_environment": "production", "cors_origins": ["*"]},
        {"app_environment": "production", "cors_origins": ["http://localhost:5173"]},
        {"app_environment": "invalid"},
        {"api_port": 0},
    ],
)
def test_invalid_configuration_is_rejected(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)


def test_production_docs_are_disabled():
    from fastapi.testclient import TestClient

    app = create_app(Settings(_env_file=None, app_environment="production", cors_origins=["https://portfolio.example"], GROQ_API_KEY="test-only-key"))
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/api/v1/health").status_code == 200
        assert client.get("/api/v1/ready").json() == {"status": "ready"}
        assert client.get("/api/v1/health").headers["strict-transport-security"].startswith("max-age=")


def test_settings_load_prefixed_environment_variables(monkeypatch):
    monkeypatch.setenv("PORTFOLIO_APP_ENVIRONMENT", "testing")
    monkeypatch.setenv("PORTFOLIO_API_PORT", "9001")
    monkeypatch.setenv("PORTFOLIO_CORS_ORIGINS", "https://portfolio.example,https://preview.example")
    settings = Settings(_env_file=None)
    assert settings.app_environment == "testing"
    assert settings.api_port == 9001
    assert settings.cors_origins == ["https://portfolio.example", "https://preview.example"]
