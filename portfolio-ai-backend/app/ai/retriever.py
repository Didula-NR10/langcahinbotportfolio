from pathlib import Path

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from app.core.config import Settings
from app.knowledge.errors import EmbeddingRateLimitError, EmbeddingServiceError, VectorIndexError, is_embedding_rate_limit
from app.knowledge.index import active_collection


class KnowledgeRetriever:
    def __init__(self, settings: Settings, embeddings: Embeddings):
        self.settings = settings
        self.embeddings = embeddings

    async def retrieve(self, question: str) -> list[Document]:
        collection = active_collection(self.settings.vector_db_path)
        try:
            from langchain_chroma import Chroma
        except ImportError as exc:
            raise VectorIndexError("Install the optional RAG dependencies.") from exc
        try:
            store = Chroma(
                collection_name=collection,
                persist_directory=str(Path(self.settings.vector_db_path)),
                embedding_function=self.embeddings,
                create_collection_if_not_exists=False,
            )
            results = await store.asimilarity_search(question, k=self.settings.rag_top_k)
        except Exception as exc:
            if is_embedding_rate_limit(exc):
                raise EmbeddingRateLimitError("Embedding provider rate limit reached.") from exc
            raise EmbeddingServiceError("Knowledge retrieval failed.") from exc
        unique = []
        seen = set()
        for doc in results:
            key = (doc.metadata.get("source"), doc.page_content)
            if key not in seen:
                seen.add(key)
                unique.append(doc)
        return unique
