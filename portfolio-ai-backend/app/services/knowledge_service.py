from pathlib import Path

from langchain_core.documents import Document

from app.knowledge.errors import EmptyKnowledgeError, KnowledgeFileError

SUPPORTED_EXTENSIONS = {".md": "markdown", ".txt": "text"}
PLACEHOLDER_MARKER = "[TO BE PROVIDED"


class KnowledgeService:
    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()

    def discover(self) -> list[Path]:
        if not self.root.is_dir():
            raise KnowledgeFileError("Knowledge directory is unavailable.")
        return sorted(
            path for path in self.root.rglob("*")
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        )

    def load_file(self, path: str | Path) -> Document:
        path = Path(path)
        if path.is_symlink() or not path.resolve().is_relative_to(self.root):
            raise KnowledgeFileError("Knowledge file is outside the configured directory.")
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise KnowledgeFileError("Unsupported knowledge file format.")
        try:
            content = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").strip()
        except (OSError, UnicodeError) as exc:
            raise KnowledgeFileError("Knowledge file could not be read as UTF-8.") from exc
        if not content:
            raise EmptyKnowledgeError("Knowledge file is empty.")
        if PLACEHOLDER_MARKER in content.upper():
            raise EmptyKnowledgeError("Knowledge file is an incomplete template.")
        relative = path.resolve().relative_to(self.root).as_posix()
        return Document(
            page_content=content,
            metadata={"source": relative, "category": path.stem, "document_type": SUPPORTED_EXTENSIONS[path.suffix.lower()]},
        )

    def load_documents(self) -> list[Document]:
        documents = []
        for path in self.discover():
            try:
                documents.append(self.load_file(path))
            except EmptyKnowledgeError:
                continue
        return documents
