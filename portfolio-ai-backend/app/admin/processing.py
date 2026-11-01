"""Bounded PDF extraction and existing LangChain text splitting."""

import json
import os
import subprocess
import sys
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class DocumentProcessingError(Exception):
    pass


def extract_and_split(data: bytes, document_id: str, filename: str, category: str, settings) -> list[Document]:
    safe_env = {name: os.environ[name] for name in ("SystemRoot", "WINDIR", "PATH") if name in os.environ}
    safe_env["PYTHONPATH"] = str(Path(__file__).resolve().parents[2])
    try:
        result = subprocess.run(
            [sys.executable, "-m", "app.admin.pdf_worker", str(settings.document_max_pages), str(settings.document_max_text_chars)],
            input=data, capture_output=True, timeout=30, env=safe_env, check=False,
        )
        if result.returncode != 0:
            raise DocumentProcessingError("PDF cannot be processed or requires OCR.")
        pages = json.loads(result.stdout)
    except subprocess.TimeoutExpired as exc:
        raise DocumentProcessingError("PDF processing timed out.") from exc
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise DocumentProcessingError("PDF cannot be processed.") from exc

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.document_chunk_size,
        chunk_overlap=settings.document_chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    documents = [Document(page_content=item["text"], metadata={
        "document_id": document_id, "page": item["page"], "source": filename, "category": category,
    }) for item in pages]
    chunks = splitter.split_documents(documents)
    if not chunks:
        raise DocumentProcessingError("PDF contains no indexable text.")
    return chunks
