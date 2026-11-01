from langchain_core.embeddings import Embeddings

from app.core.config import Settings
from app.knowledge.errors import EmbeddingConfigurationError


def create_embeddings(settings: Settings, dimensions: int | None = None) -> Embeddings:
    key = settings.embedding_api_key
    if key is None or not key.get_secret_value().strip():
        raise EmbeddingConfigurationError("Set EMBEDDING_API_KEY before using RAG.")
    try:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
    except ImportError as exc:
        raise EmbeddingConfigurationError("Install the optional RAG dependencies.") from exc
    try:
        return GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=key,
            vertexai=False,
            **({"output_dimensionality": dimensions} if dimensions is not None else {}),
        )
    except (ValueError, TypeError) as exc:
        raise EmbeddingConfigurationError("Invalid embedding configuration.") from exc
