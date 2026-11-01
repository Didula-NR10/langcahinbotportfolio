"""Admin document lifecycle and durable background indexing."""

import asyncio
import hashlib
import logging
import math
import re
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError

from app.admin.processing import DocumentProcessingError, extract_and_split
from app.admin.repository import DocumentRepository
from app.admin.storage import DocumentStorage, DocumentStorageError
from app.ai.embeddings import create_embeddings

logger = logging.getLogger("portfolio_ai")


class DocumentEmbeddingError(Exception):
    pass


def clean_filename(filename: str | None) -> str:
    value = re.split(r"[\\/]", filename or "")[-1].strip()
    if not value or len(value) > 255 or not value.lower().endswith(".pdf") or ":" in value or any(ord(char) < 32 for char in value):
        raise HTTPException(422, "A valid PDF filename is required.")
    return value


class DocumentService:
    def __init__(self, settings, repository=None, storage=None, embeddings=None):
        self.settings = settings
        self.repository = repository or DocumentRepository(settings)
        self.storage = storage or DocumentStorage(settings)
        self.embeddings = embeddings or create_embeddings(settings, settings.document_embedding_dimensions)

    async def _read_pdf(self, file: UploadFile, category: str):
        filename = clean_filename(file.filename)
        if file.content_type not in {"application/pdf", "application/octet-stream"}:
            raise HTTPException(415, "Only PDF files are supported.")
        limit = self.settings.document_max_file_size_mb * 1024 * 1024
        data = bytearray()
        while chunk := await file.read(min(1024 * 1024, limit + 1 - len(data))):
            data.extend(chunk)
            if len(data) > limit:
                raise HTTPException(413, "PDF exceeds the configured file size limit.")
        if len(data) < 8 or not data.startswith(b"%PDF-") or b"%%EOF" not in data[-1024:]:
            raise HTTPException(422, "The uploaded file is not a valid PDF.")
        try:
            chunks = await asyncio.to_thread(extract_and_split, bytes(data), "validation", filename, category, self.settings)
            if len(chunks) > self.settings.document_max_chunks:
                raise DocumentProcessingError("PDF produces too many chunks.")
        except DocumentProcessingError as exc:
            raise HTTPException(422, str(exc)) from exc
        return filename, bytes(data), hashlib.sha256(data).hexdigest()

    async def upload(self, file: UploadFile, *, category: str, title: str | None, description: str):
        filename, data, digest = await self._read_pdf(file, category)
        if await asyncio.to_thread(self.repository.find_hash, digest):
            raise HTTPException(409, "This PDF has already been uploaded.")
        document_id = uuid4()
        path = f"documents/{document_id}/original.pdf"
        await asyncio.to_thread(self.storage.ensure_private)
        await asyncio.to_thread(self.storage.upload, path, data)
        try:
            return await asyncio.to_thread(
                self.repository.create, document_id=document_id, filename=filename, path=path,
                size=len(data), digest=digest, category=category, title=title or filename[:-4], description=description,
            )
        except IntegrityError as exc:
            await asyncio.to_thread(self.storage.delete, path)
            raise HTTPException(409, "This PDF has already been uploaded.") from exc
        except Exception:
            try:
                await asyncio.to_thread(self.storage.delete, path)
            except DocumentStorageError:
                logger.warning("Could not clean up an uploaded object after a database failure")
            raise

    async def replace(self, document_id: UUID, file: UploadFile):
        document = await asyncio.to_thread(self.repository.get, document_id)
        if document is None:
            raise HTTPException(404, "Document not found.")
        if document.status in {"queued", "processing", "deleting"}:
            raise HTTPException(409, "Document is currently processing.")
        filename, data, digest = await self._read_pdf(file, document.category)
        if await asyncio.to_thread(self.repository.find_hash, digest, document_id):
            raise HTTPException(409, "This PDF has already been uploaded.")
        path = f"documents/{document_id}/{uuid4().hex}.pdf"
        await asyncio.to_thread(self.storage.ensure_private)
        await asyncio.to_thread(self.storage.upload, path, data)
        try:
            result = await asyncio.to_thread(self.repository.replace, document_id, filename=filename, path=path, size=len(data), digest=digest)
            if result is None:
                raise HTTPException(409, "Document cannot be replaced now.")
        except IntegrityError as exc:
            await asyncio.to_thread(self.storage.delete, path)
            raise HTTPException(409, "This PDF has already been uploaded.") from exc
        except Exception:
            await asyncio.to_thread(self.storage.delete, path)
            raise
        updated, old_path = result
        try:
            await asyncio.to_thread(self.storage.delete, old_path)
        except DocumentStorageError:
            logger.warning("Old PDF cleanup is pending after replacement")
        return updated

    async def remove(self, document_id: UUID):
        if await asyncio.to_thread(self.repository.get, document_id) is None:
            raise HTTPException(404, "Document not found.")
        path = await asyncio.to_thread(self.repository.mark_deleting, document_id)
        if path is None:
            raise HTTPException(409, "Document is missing or processing.")
        await asyncio.to_thread(self.storage.delete, path)
        await asyncio.to_thread(self.repository.delete, document_id)

    async def process_next(self) -> bool:
        claimed = await asyncio.to_thread(self.repository.claim_job)
        if claimed is None:
            return False
        job_id, document_id, path, filename, category, expected_size = claimed
        try:
            data = await asyncio.to_thread(self.storage.download, path)
            if len(data) != expected_size or len(data) > self.settings.document_max_file_size_mb * 1024 * 1024:
                raise DocumentProcessingError("Stored PDF size is invalid.")
            chunks = await asyncio.to_thread(extract_and_split, data, str(document_id), filename, category, self.settings)
            if len(chunks) > self.settings.document_max_chunks:
                raise DocumentProcessingError("PDF produces too many chunks.")
            vectors = []
            for start in range(0, len(chunks), self.settings.document_embed_batch_size):
                batch = chunks[start:start + self.settings.document_embed_batch_size]
                vectors.extend(await asyncio.wait_for(
                    asyncio.to_thread(self.embeddings.embed_documents, [chunk.page_content for chunk in batch]), timeout=60,
                ))
            if len(vectors) != len(chunks) or any(
                len(vector) != self.settings.document_embedding_dimensions or not all(math.isfinite(value) for value in vector)
                for vector in vectors
            ):
                raise DocumentEmbeddingError("Embedding dimensions are incompatible with the index.")
            await asyncio.to_thread(self.repository.finish_job, job_id, chunks, vectors)
            logger.info("Document indexing completed job_id=%s chunks=%s", job_id, len(chunks))
        except Exception as exc:
            logger.warning("Document indexing failed job_id=%s category=%s", job_id, type(exc).__name__)
            if isinstance(exc, DocumentProcessingError):
                message = "PDF extraction failed or requires OCR."
            elif isinstance(exc, DocumentEmbeddingError):
                message = "Embedding dimensions are incompatible with the index."
            else:
                message = "Indexing failed. Check provider and storage configuration."
            await asyncio.to_thread(self.repository.fail_job, job_id, message)
        return True

    async def worker_loop(self):
        while True:
            try:
                await asyncio.to_thread(self.repository.recover_stale_jobs)
                processed = await self.process_next()
                if not processed:
                    await asyncio.sleep(3)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Document worker unavailable category=%s", type(exc).__name__)
                await asyncio.sleep(10)
