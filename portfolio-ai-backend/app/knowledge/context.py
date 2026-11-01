import re

from langchain_core.documents import Document

from app.knowledge.errors import ContextLimitError
from app.schemas.ai_schema import SourceReference

STOPWORDS = {"what", "which", "where", "when", "who", "how", "does", "did", "the", "this", "that", "about", "have", "has", "was", "are", "for", "and", "with", "their", "developer", "portfolio", "tell", "me", "please", "completed"}


def _terms(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {word.rstrip("s") for word in words if len(word) > 2 and word not in STOPWORDS}


def relevant_documents(question: str, documents: list[Document]) -> list[Document]:
    terms = _terms(question)
    if not terms:
        return documents
    scored = []
    for doc in documents:
        category = _terms(str(doc.metadata.get("category", "")))
        body = _terms(doc.page_content)
        score = 3 * len(terms & category) + len(terms & body)
        if score:
            scored.append((score, doc))
    return [doc for _, doc in sorted(scored, key=lambda item: -item[0])]


def build_context(documents: list[Document], max_chars: int) -> tuple[str, list[SourceReference]]:
    pieces: list[str] = []
    sources: list[SourceReference] = []
    remaining = max_chars
    seen = set()
    for doc in documents:
        source = str(doc.metadata.get("source", ""))
        category = str(doc.metadata.get("category", ""))
        if not source or source.startswith(("/", "\\")) or ":" in source or "\\" in source or ".." in source.split("/"):
            continue
        header = f"Source: {source}\n"
        available = remaining - len(header) - 2
        if available < 20:
            break
        content = doc.page_content.strip()[:available]
        if not content:
            continue
        piece = header + content
        pieces.append(piece)
        remaining -= len(piece) + 2
        if (source, category) not in seen:
            seen.add((source, category))
            sources.append(SourceReference(document=source, category=category))
    context = "\n\n".join(pieces)
    if documents and not context:
        raise ContextLimitError("Context budget is too small for the selected documents.")
    return context, sources
