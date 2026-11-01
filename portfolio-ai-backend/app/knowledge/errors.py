"""Safe errors for knowledge and retrieval operations."""


class KnowledgeError(Exception):
    pass


class KnowledgeFileError(KnowledgeError):
    pass


class EmptyKnowledgeError(KnowledgeError):
    pass


class ContextLimitError(KnowledgeError):
    pass


class EmbeddingConfigurationError(KnowledgeError):
    pass


class EmbeddingServiceError(KnowledgeError):
    pass


class EmbeddingRateLimitError(EmbeddingServiceError):
    pass


class VectorIndexError(KnowledgeError):
    pass


class MissingVectorIndexError(VectorIndexError):
    pass


def is_embedding_rate_limit(exc: BaseException) -> bool:
    current: BaseException | None = exc
    for _ in range(5):
        if current is None:
            return False
        if getattr(current, "code", None) == 429 or getattr(current, "status", None) in (429, "RESOURCE_EXHAUSTED"):
            return True
        current = current.__cause__
    return False
