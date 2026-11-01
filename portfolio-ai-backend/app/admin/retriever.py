"""pgvector retriever using the existing hosted embedding implementation."""

import asyncio
import math

from app.knowledge.errors import EmbeddingServiceError


class PgVectorRetriever:
    def __init__(self, settings, repository, embeddings):
        self.settings = settings
        self.repository = repository
        self.embeddings = embeddings

    async def retrieve(self, question):
        try:
            vector = await asyncio.wait_for(asyncio.to_thread(self.embeddings.embed_query, question), timeout=30)
            if len(vector) != self.settings.document_embedding_dimensions or not all(math.isfinite(value) for value in vector):
                raise ValueError("Invalid embedding dimensions")
            return await asyncio.to_thread(
                self.repository.search, vector, self.settings.rag_top_k, self.settings.document_max_cosine_distance,
            )
        except Exception as exc:
            raise EmbeddingServiceError("Knowledge retrieval failed.") from exc
