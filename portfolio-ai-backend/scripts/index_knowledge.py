"""Build or refresh the persistent knowledge index."""

from app.ai.embeddings import create_embeddings
from app.core.config import get_settings
from app.knowledge.errors import KnowledgeError
from app.knowledge.index import rebuild_index
from app.services.knowledge_service import KnowledgeService


def main() -> int:
    settings = get_settings()
    try:
        documents = KnowledgeService(settings.knowledge_path).load_documents()
        if not documents:
            print("No verified knowledge documents found. Fill in the templates first.")
            return 1
        report = rebuild_index(documents, settings, create_embeddings(settings))
    except KnowledgeError as exc:
        print(f"Indexing failed: {exc}")
        return 1
    action = "updated" if report.updated else "already current"
    print(f"Index {action}: {report.documents} documents, {report.chunks} chunks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
