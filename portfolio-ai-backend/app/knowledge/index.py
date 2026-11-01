import hashlib
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from app.core.config import Settings
from app.knowledge.errors import EmbeddingRateLimitError, EmptyKnowledgeError, MissingVectorIndexError, VectorIndexError, is_embedding_rate_limit

logger = logging.getLogger("portfolio_ai")
MANIFEST_NAME = "active_index.json"


@dataclass(frozen=True)
class IndexReport:
    documents: int
    chunks: int
    updated: bool


def split_documents(documents: list[Document], settings: Settings) -> list[Document]:
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except ImportError as exc:
        raise VectorIndexError("Install the optional RAG dependencies.") from exc
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        separators=["\n# ", "\n## ", "\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = index
    return chunks


def _fingerprint(documents: list[Document], settings: Settings) -> str:
    payload = {
        "documents": [(doc.metadata["source"], doc.page_content) for doc in documents],
        "chunk_size": settings.rag_chunk_size,
        "chunk_overlap": settings.rag_chunk_overlap,
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _manifest(path: Path) -> dict | None:
    manifest_path = path / MANIFEST_NAME
    if not manifest_path.is_file():
        return None
    try:
        value = json.loads(manifest_path.read_text(encoding="utf-8"))
        if (
            isinstance(value.get("collection"), str)
            and isinstance(value.get("fingerprint"), str)
            and isinstance(value.get("chunks"), int)
            and value["chunks"] >= 0
        ):
            return value
    except (OSError, ValueError, AttributeError):
        pass
    raise VectorIndexError("Vector index manifest is invalid.")


def active_collection(path: str | Path) -> str:
    manifest = _manifest(Path(path))
    if manifest is None:
        raise MissingVectorIndexError("No active knowledge index exists. Run the index command first.")
    return manifest["collection"]


def rebuild_index(
    documents: list[Document], settings: Settings, embeddings: Embeddings
) -> IndexReport:
    if not documents:
        raise EmptyKnowledgeError("No verified knowledge documents are available for indexing.")
    path = Path(settings.vector_db_path)
    fingerprint = _fingerprint(documents, settings)
    previous = _manifest(path)
    if previous and previous["fingerprint"] == fingerprint:
        return IndexReport(len(documents), previous["chunks"], False)

    chunks = split_documents(documents, settings)
    if not chunks:
        raise EmptyKnowledgeError("No indexable knowledge chunks were produced.")

    try:
        import chromadb
        from langchain_chroma import Chroma
    except ImportError as exc:
        raise VectorIndexError("Install the optional RAG dependencies.") from exc

    collection = f"portfolio_{uuid4().hex}"
    client = None
    try:
        path.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(path))
        store = Chroma(client=client, collection_name=collection, embedding_function=embeddings)
        ids = [hashlib.sha256(f"{fingerprint}:{i}".encode()).hexdigest() for i in range(len(chunks))]
        store.add_documents(chunks, ids=ids)
        new_manifest = {"collection": collection, "fingerprint": fingerprint, "chunks": len(chunks)}
        temporary = path / f".{MANIFEST_NAME}.{uuid4().hex}.tmp"
        try:
            temporary.write_text(json.dumps(new_manifest), encoding="utf-8")
            os.replace(temporary, path / MANIFEST_NAME)
        finally:
            temporary.unlink(missing_ok=True)
    except Exception as exc:
        if client is not None:
            try:
                client.delete_collection(collection)
            except Exception:
                logger.warning("Could not remove failed staging collection")
        if is_embedding_rate_limit(exc):
            raise EmbeddingRateLimitError("Embedding provider rate limit reached; the previous index remains active.") from exc
        raise VectorIndexError("Knowledge index rebuild failed; the previous index remains active.") from exc

    if previous and previous["collection"] != collection:
        try:
            client.delete_collection(previous["collection"])
        except Exception:
            logger.warning("Could not remove old collection after index switch")
    return IndexReport(len(documents), len(chunks), True)
