from pathlib import Path

import pytest

from app.knowledge.errors import EmptyKnowledgeError, KnowledgeFileError
from app.services.knowledge_service import KnowledgeService


def test_load_markdown_and_text_with_safe_metadata(tmp_path):
    (tmp_path / "projects.md").write_text("# Projects\nBuilt a weather app.", encoding="utf-8")
    (tmp_path / "skills.txt").write_text("Python and SQL", encoding="utf-8")
    docs = KnowledgeService(tmp_path).load_documents()
    assert {doc.metadata["source"] for doc in docs} == {"projects.md", "skills.txt"}
    assert {doc.metadata["document_type"] for doc in docs} == {"markdown", "text"}
    assert {doc.metadata["category"] for doc in docs} == {"projects", "skills"}


def test_empty_and_placeholder_documents_are_excluded(tmp_path):
    (tmp_path / "empty.md").write_text("  ", encoding="utf-8")
    (tmp_path / "template.md").write_text("# About\n[TO BE PROVIDED]", encoding="utf-8")
    service = KnowledgeService(tmp_path)
    assert service.load_documents() == []
    with pytest.raises(EmptyKnowledgeError):
        service.load_file(tmp_path / "template.md")


def test_missing_invalid_and_unsupported_files(tmp_path):
    service = KnowledgeService(tmp_path)
    (tmp_path / "bad.md").write_bytes(b"\xff")
    (tmp_path / "file.pdf").write_text("unsupported", encoding="utf-8")
    for path in (tmp_path / "missing.md", tmp_path / "bad.md", tmp_path / "file.pdf"):
        with pytest.raises(KnowledgeFileError):
            service.load_file(path)
    with pytest.raises(KnowledgeFileError):
        service.load_file(Path(tmp_path).parent / "outside.md")
