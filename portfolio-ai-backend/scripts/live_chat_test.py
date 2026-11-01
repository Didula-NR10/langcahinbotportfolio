"""Explicit live HTTP test: python -m pytest scripts/live_chat_test.py -q."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.services.knowledge_service import KnowledgeService


def test_live_multiturn_chat_api():
    settings = get_settings()
    if not settings.groq_api_key or not settings.groq_api_key.get_secret_value():
        pytest.skip("GROQ_API_KEY is not set")
    if not KnowledgeService(settings.knowledge_path).load_documents():
        pytest.skip("Add verified portfolio documents before the live chat test")
    if settings.knowledge_mode == "rag" and (not settings.embedding_api_key or not settings.embedding_api_key.get_secret_value()):
        pytest.skip("EMBEDDING_API_KEY is required for configured RAG mode")

    with TestClient(create_app(settings)) as client:
        first = client.post("/api/v1/chat", json={"message": "What projects has this developer completed?"})
        assert first.status_code == 200
        first_data = first.json()
        assert first_data["session_id"] and first_data["answer"] and first_data["sources"]
        second = client.post(
            "/api/v1/chat",
            json={"message": "Which technologies were used in the first one?", "session_id": first_data["session_id"]},
        )
        assert second.status_code == 200
        assert second.json()["session_id"] == first_data["session_id"]
        assert second.json()["answer"]
