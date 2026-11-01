import pytest
from pydantic import ValidationError

from app.ai.embeddings import create_embeddings
from app.core.config import Settings
from app.knowledge.errors import EmbeddingConfigurationError


def test_embedding_key_required_only_when_rag_initializes():
    settings = Settings(_env_file=None, EMBEDDING_API_KEY="")
    assert settings.knowledge_mode == "direct_context"
    with pytest.raises(EmbeddingConfigurationError):
        create_embeddings(settings)


def test_embedding_provider_and_model_are_configurable():
    settings = Settings(_env_file=None, EMBEDDING_API_KEY="dummy-test-value", EMBEDDING_MODEL="gemini-embedding-001")
    model = create_embeddings(settings)
    assert model.model == "gemini-embedding-001"
    assert "dummy-test-value" not in repr(settings)
    assert "embedding_api_key" not in settings.model_dump()


def test_unsupported_embedding_provider_is_rejected():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, EMBEDDING_PROVIDER="local")
