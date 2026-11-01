"""Transactional PostgreSQL metadata, jobs and pgvector retrieval."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from langchain_core.documents import Document
from sqlalchemy import create_engine, delete, select, text
from sqlalchemy.orm import sessionmaker

from app.admin.models import IndexingJob, KnowledgeChunk, KnowledgeDocument


class DocumentRepository:
    def __init__(self, settings):
        url = settings.database_url.get_secret_value().replace("postgresql://", "postgresql+psycopg://", 1)
        self.engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=0, pool_timeout=5,
                                    connect_args={"connect_timeout": 5}, hide_parameters=True)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def close(self):
        self.engine.dispose()

    def ping(self) -> bool:
        with self.engine.connect() as connection:
            return bool(connection.scalar(text("SELECT to_regclass('knowledge_documents') IS NOT NULL AND to_regclass('knowledge_chunks') IS NOT NULL")))

    def find_hash(self, digest: str, exclude_id: UUID | None = None):
        with self.sessions() as session:
            query = select(KnowledgeDocument).where(KnowledgeDocument.file_hash == digest)
            if exclude_id:
                query = query.where(KnowledgeDocument.id != exclude_id)
            return session.scalar(query)

    def create(self, *, document_id, filename, path, size, digest, category, title, description):
        with self.sessions.begin() as session:
            document = KnowledgeDocument(
                id=document_id, original_filename=filename, storage_path=path, file_size=size,
                mime_type="application/pdf", file_hash=digest, category=category, title=title,
                description=description, status="queued",
            )
            session.add(document)
            session.add(IndexingJob(id=uuid4(), document_id=document_id, status="queued"))
        return document

    def get(self, document_id: UUID):
        with self.sessions() as session:
            return session.get(KnowledgeDocument, document_id)

    def list(self, limit: int, offset: int):
        with self.sessions() as session:
            return list(session.scalars(select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).limit(limit).offset(offset)))

    def update_metadata(self, document_id: UUID, **values):
        with self.sessions.begin() as session:
            document = session.get(KnowledgeDocument, document_id)
            if document is None:
                return None
            for name, value in values.items():
                setattr(document, name, value)
            document.updated_at = datetime.now(timezone.utc)
        return document

    def replace(self, document_id: UUID, *, filename, path, size, digest):
        with self.sessions.begin() as session:
            document = session.get(KnowledgeDocument, document_id)
            if document is None or document.status in {"queued", "processing", "deleting"}:
                return None
            old_path = document.storage_path
            document.original_filename = filename
            document.storage_path = path
            document.file_size = size
            document.file_hash = digest
            document.status = "queued"
            document.error_message = None
            document.updated_at = datetime.now(timezone.utc)
            session.add(IndexingJob(id=uuid4(), document_id=document_id, status="queued"))
        return document, old_path

    def mark_deleting(self, document_id: UUID):
        with self.sessions.begin() as session:
            document = session.get(KnowledgeDocument, document_id)
            if document is None or document.status == "processing":
                return None
            document.status = "deleting"
            return document.storage_path

    def delete(self, document_id: UUID):
        with self.sessions.begin() as session:
            document = session.get(KnowledgeDocument, document_id)
            if document:
                session.delete(document)

    def queue(self, document_id: UUID):
        with self.sessions.begin() as session:
            document = session.get(KnowledgeDocument, document_id)
            if document is None:
                return None
            if document.status in {"queued", "processing", "deleting"}:
                return False
            document.status = "queued"
            document.error_message = None
            session.add(IndexingJob(id=uuid4(), document_id=document_id, status="queued"))
        return True

    def jobs(self, document_id: UUID):
        with self.sessions() as session:
            return list(session.scalars(select(IndexingJob).where(IndexingJob.document_id == document_id).order_by(IndexingJob.created_at.desc())))

    def recover_stale_jobs(self):
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
        with self.sessions.begin() as session:
            stale = list(session.scalars(select(IndexingJob).where(IndexingJob.status == "processing", IndexingJob.started_at < cutoff).with_for_update(skip_locked=True)))
            for job in stale:
                document = session.get(KnowledgeDocument, job.document_id)
                if job.attempt_count >= 3:
                    job.status = "failed"
                    job.error_message = "Indexing retry limit reached."
                    job.completed_at = datetime.now(timezone.utc)
                    if document:
                        document.status = "failed"
                        document.error_message = job.error_message
                else:
                    job.status = "queued"
                    job.started_at = None
                    if document:
                        document.status = "queued"

    def claim_job(self):
        with self.sessions.begin() as session:
            job = session.scalar(select(IndexingJob).where(IndexingJob.status == "queued").order_by(IndexingJob.created_at).with_for_update(skip_locked=True).limit(1))
            if job is None:
                return None
            document = session.get(KnowledgeDocument, job.document_id)
            if document is None or document.status == "deleting":
                job.status = "failed"
                job.error_message = "Document unavailable."
                job.completed_at = datetime.now(timezone.utc)
                return None
            job.status = "processing"
            job.started_at = datetime.now(timezone.utc)
            job.attempt_count += 1
            document.status = "processing"
            return job.id, document.id, document.storage_path, document.original_filename, document.category, document.file_size

    def finish_job(self, job_id: UUID, chunks: list[Document], vectors: list[list[float]]):
        with self.sessions.begin() as session:
            job = session.get(IndexingJob, job_id)
            if job is None or job.status != "processing":
                return
            document = session.get(KnowledgeDocument, job.document_id)
            session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
            for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
                session.add(KnowledgeChunk(
                    id=uuid4(), document_id=document.id, chunk_index=index, content=chunk.page_content,
                    embedding=vector, chunk_metadata={"page": chunk.metadata["page"]},
                ))
            document.status = "indexed"
            document.chunk_count = len(chunks)
            document.indexed_at = datetime.now(timezone.utc)
            document.error_message = None
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = None

    def fail_job(self, job_id: UUID, message: str):
        with self.sessions.begin() as session:
            job = session.get(IndexingJob, job_id)
            if job is None:
                return
            document = session.get(KnowledgeDocument, job.document_id)
            job.status = "failed"
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = message[:500]
            if document:
                document.status = "failed"
                document.error_message = message[:500]

    def search(self, vector: list[float], limit: int, max_distance: float) -> list[Document]:
        distance = KnowledgeChunk.embedding.cosine_distance(vector)
        with self.sessions() as session:
            rows = session.execute(
                select(KnowledgeChunk, KnowledgeDocument)
                .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                .where(KnowledgeDocument.status == "indexed", distance <= max_distance)
                .order_by(distance).limit(limit)
            ).all()
        return [Document(page_content=chunk.content, metadata={
            "source": f"pdf/{document.id}/{document.original_filename}",
            "category": document.category,
            "document_id": str(document.id),
            "page": chunk.chunk_metadata.get("page"),
        }) for chunk, document in rows]
