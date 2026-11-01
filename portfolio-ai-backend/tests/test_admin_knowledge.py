import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from langchain_core.documents import Document
from pydantic import ValidationError

from app.admin.security import verify_admin_token
from app.admin.service import DocumentService
from app.core.config import Settings
from app.main import create_app


def admin_settings(**overrides):
    values = dict(
        _env_file=None, app_environment="testing", ADMIN_KNOWLEDGE_ENABLED=True,
        SUPABASE_URL="https://unit.supabase.co", SUPABASE_SERVICE_ROLE_KEY="backend-only-test-key",
        DATABASE_URL="postgresql://user:pass@localhost/test", ADMIN_USER_IDS=str(uuid4()),
        EMBEDDING_API_KEY="embedding-test-key", KNOWLEDGE_MODE="rag",
    )
    values.update(overrides)
    return Settings(**values)


def test_admin_configuration_is_opt_in_and_requires_all_secrets():
    assert Settings(_env_file=None).admin_knowledge_enabled is False
    with pytest.raises(ValidationError):
        admin_settings(SUPABASE_SERVICE_ROLE_KEY="")
    with pytest.raises(ValidationError):
        admin_settings(SUPABASE_URL="http://unit.supabase.co")
    with pytest.raises(ValidationError):
        admin_settings(ADMIN_USER_IDS="")


def test_supabase_jwt_signature_expiry_and_admin_allowlist(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    admin_id = uuid4()
    settings = SimpleNamespace(supabase_url="https://unit.supabase.co", admin_user_ids=[admin_id])
    monkeypatch.setattr("app.admin.security._jwks_client", lambda _url: SimpleNamespace(
        get_signing_key_from_jwt=lambda _token: SimpleNamespace(key=key.public_key())
    ))
    now = datetime.now(timezone.utc)
    claims = {"iss": "https://unit.supabase.co/auth/v1", "aud": "authenticated", "role": "authenticated",
              "sub": str(admin_id), "iat": now, "exp": now + timedelta(minutes=5)}
    token = jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test"})
    assert verify_admin_token(token, settings) == admin_id
    for changed in (
        {"sub": str(uuid4())}, {"role": "anon"}, {"exp": now - timedelta(minutes=5)},
        {"iss": "https://other.supabase.co/auth/v1"},
    ):
        bad = jwt.encode({**claims, **changed}, key, algorithm="RS256", headers={"kid": "test"})
        with pytest.raises(HTTPException):
            verify_admin_token(bad, settings)
    with pytest.raises(HTTPException):
        verify_admin_token(token + "tampered", settings)


def test_storage_adapter_refuses_public_bucket_and_uses_backend_key(monkeypatch):
    from app.admin.storage import DocumentStorage, DocumentStorageError

    captured = {}

    def client(url, key):
        captured.update(url=url, key=key)
        return SimpleNamespace(storage=SimpleNamespace(get_bucket=lambda _name: SimpleNamespace(public=True)))

    monkeypatch.setattr("app.admin.storage.create_client", client)
    settings = admin_settings()
    storage = DocumentStorage(settings)
    with pytest.raises(DocumentStorageError):
        storage.ensure_private()
    assert captured == {"url": "https://unit.supabase.co", "key": settings.supabase_service_role_key.get_secret_value()}


def test_storage_provisioning_creates_a_private_pdf_only_bucket(monkeypatch):
    from app.admin.storage import DocumentStorage
    from storage3.exceptions import StorageApiError

    calls = {}

    def missing(_name):
        raise StorageApiError("missing", "not_found", 404)

    fake_storage = SimpleNamespace(
        get_bucket=missing,
        create_bucket=lambda name, options: calls.update(name=name, options=options),
    )
    monkeypatch.setattr("app.admin.storage.create_client", lambda _url, _key: SimpleNamespace(storage=fake_storage))
    adapter = DocumentStorage(admin_settings())
    adapter.provision_private(15 * 1024 * 1024)
    assert calls == {"name": "portfolio-knowledge", "options": {
        "public": False, "file_size_limit": 15 * 1024 * 1024,
        "allowed_mime_types": ["application/pdf"],
    }}


def test_storage_provisioning_tightens_an_existing_private_bucket(monkeypatch):
    from app.admin.storage import DocumentStorage

    calls = {}
    fake_storage = SimpleNamespace(
        get_bucket=lambda _name: SimpleNamespace(public=False, file_size_limit=None, allowed_mime_types=None),
        update_bucket=lambda name, options: calls.update(name=name, options=options),
    )
    monkeypatch.setattr("app.admin.storage.create_client", lambda _url, _key: SimpleNamespace(storage=fake_storage))
    DocumentStorage(admin_settings()).provision_private(15 * 1024 * 1024)
    assert calls["options"] == {"public": False, "file_size_limit": 15 * 1024 * 1024,
                                "allowed_mime_types": ["application/pdf"]}


class MemoryRepository:
    def __init__(self):
        self.documents = {}
        self.job = None
        self.chunks = []

    def find_hash(self, digest, exclude_id=None):
        return next((doc for doc in self.documents.values() if doc.file_hash == digest and doc.id != exclude_id), None)

    def close(self):
        return None

    def recover_stale_jobs(self):
        return None

    def ping(self):
        return True

    def list(self, limit, offset):
        return list(self.documents.values())[offset:offset + limit]

    def create(self, **data):
        now = datetime.now(timezone.utc)
        doc = SimpleNamespace(id=data["document_id"], original_filename=data["filename"], storage_path=data["path"],
                              file_size=data["size"], file_hash=data["digest"], category=data["category"],
                              title=data["title"], description=data["description"], mime_type="application/pdf",
                              status="queued", chunk_count=0, created_at=now, updated_at=now, indexed_at=None, error_message=None)
        self.documents[doc.id] = doc
        self.job = (uuid4(), doc.id, doc.storage_path, doc.original_filename, doc.category, doc.file_size)
        return doc

    def get(self, document_id):
        return self.documents.get(document_id)

    def update_metadata(self, document_id, **values):
        doc = self.get(document_id)
        if doc:
            for name, value in values.items():
                setattr(doc, name, value)
        return doc

    def replace(self, document_id, *, filename, path, size, digest):
        doc = self.get(document_id)
        if doc is None or doc.status in {"queued", "processing", "deleting"}:
            return None
        old_path = doc.storage_path
        doc.original_filename, doc.storage_path, doc.file_size, doc.file_hash = filename, path, size, digest
        doc.status = "queued"
        self.job = (uuid4(), doc.id, path, filename, doc.category, size)
        return doc, old_path

    def mark_deleting(self, document_id):
        doc = self.get(document_id)
        if doc and doc.status != "processing":
            doc.status = "deleting"
            return doc.storage_path
        return None

    def delete(self, document_id):
        self.documents.pop(document_id, None)

    def queue(self, document_id):
        doc = self.get(document_id)
        if doc is None:
            return None
        if doc.status in {"queued", "processing", "deleting"}:
            return False
        doc.status = "queued"
        self.job = (uuid4(), doc.id, doc.storage_path, doc.original_filename, doc.category, doc.file_size)
        return True

    def jobs(self, document_id):
        return []

    def claim_job(self):
        job, self.job = self.job, None
        return job

    def finish_job(self, _job_id, chunks, vectors):
        doc = self.documents[next(iter(self.documents))]
        doc.status = "indexed"
        doc.chunk_count = len(chunks)
        self.chunks = chunks
        assert len(vectors[0]) == 768

    def fail_job(self, _job_id, message):
        doc = self.documents[next(iter(self.documents))]
        doc.status = "failed"
        doc.error_message = message


class MemoryStorage:
    def __init__(self):
        self.objects = {}

    def ensure_private(self):
        return None

    def upload(self, path, data):
        self.objects[path] = data

    def download(self, path):
        return self.objects[path]

    def delete(self, path):
        del self.objects[path]


class FakeEmbeddings:
    def embed_documents(self, texts):
        return [[0.1] * 768 for _ in texts]


def test_upload_indexes_in_background_and_rejects_duplicate(monkeypatch):
    from starlette.datastructures import UploadFile
    from io import BytesIO

    settings = admin_settings()
    repo, storage = MemoryRepository(), MemoryStorage()
    service = DocumentService(settings, repo, storage, FakeEmbeddings())
    monkeypatch.setattr("app.admin.service.extract_and_split", lambda _data, _id, _name, _category, _settings: [
        Document(page_content="A verified page of project facts.", metadata={"page": 1})
    ])
    pdf = b"%PDF-1.4\n" + b"content" * 10 + b"\n%%EOF"

    async def run():
        first = await service.upload(UploadFile(filename="portfolio.pdf", file=BytesIO(pdf), headers={"content-type": "application/pdf"}),
                                     category="projects", title=None, description="")
        assert first.status == "queued"
        assert first.storage_path.startswith(f"documents/{first.id}/")
        with pytest.raises(HTTPException) as duplicate:
            await service.upload(UploadFile(filename="copy.pdf", file=BytesIO(pdf), headers={"content-type": "application/pdf"}),
                                 category="projects", title=None, description="")
        assert duplicate.value.status_code == 409
        assert await service.process_next() is True
        assert first.status == "indexed"
        assert first.chunk_count == 1
        assert service.repository.chunks[0].metadata["page"] == 1

    asyncio.run(run())


def test_replace_metadata_reindex_and_delete_lifecycle(monkeypatch):
    from starlette.datastructures import UploadFile
    from io import BytesIO

    repo, storage = MemoryRepository(), MemoryStorage()
    service = DocumentService(admin_settings(), repo, storage, FakeEmbeddings())
    monkeypatch.setattr("app.admin.service.extract_and_split", lambda _data, _id, _name, _category, _settings: [
        Document(page_content="A verified project page.", metadata={"page": 1})
    ])

    async def run():
        first_pdf = b"%PDF-1.4\nfirst" + b"\n%%EOF"
        second_pdf = b"%PDF-1.4\nsecond" + b"\n%%EOF"
        doc = await service.upload(UploadFile(filename="first.pdf", file=BytesIO(first_pdf), headers={"content-type": "application/pdf"}),
                                   category="projects", title="First", description="")
        await service.process_next()
        old_path = doc.storage_path
        replacement = await service.replace(doc.id, UploadFile(filename="second.pdf", file=BytesIO(second_pdf), headers={"content-type": "application/pdf"}))
        assert replacement.status == "queued"
        assert old_path not in storage.objects
        assert replacement.storage_path in storage.objects
        await service.process_next()
        updated = repo.update_metadata(doc.id, category="experience", title="Updated")
        assert updated.category == "experience"
        assert repo.queue(doc.id) is True
        await service.process_next()
        await service.remove(doc.id)
        assert repo.get(doc.id) is None
        assert storage.objects == {}

    asyncio.run(run())


def test_bad_embedding_dimensions_mark_job_failed_without_publishing(monkeypatch):
    from starlette.datastructures import UploadFile
    from io import BytesIO

    class WrongEmbeddings:
        def embed_documents(self, texts):
            return [[0.1] * 3 for _ in texts]

    repo, storage = MemoryRepository(), MemoryStorage()
    service = DocumentService(admin_settings(), repo, storage, WrongEmbeddings())
    monkeypatch.setattr("app.admin.service.extract_and_split", lambda _data, _id, _name, _category, _settings: [
        Document(page_content="Verified PDF content.", metadata={"page": 1})
    ])

    async def run():
        doc = await service.upload(UploadFile(filename="bad.pdf", file=BytesIO(b"%PDF-1.4\ntext\n%%EOF"), headers={"content-type": "application/pdf"}),
                                   category="projects", title=None, description="")
        assert await service.process_next() is True
        assert doc.status == "failed"
        assert doc.chunk_count == 0
        assert "Embedding" in doc.error_message

    asyncio.run(run())


def test_admin_routes_are_hidden_when_disabled(client):
    assert client.get("/api/v1/admin/documents").status_code == 404


def test_admin_api_authenticates_before_parsing_uploads(monkeypatch):
    import app.admin.service as module
    import app.admin.security as security

    repo, storage = MemoryRepository(), MemoryStorage()
    monkeypatch.setattr(module, "DocumentRepository", lambda _settings: repo)
    monkeypatch.setattr(module, "DocumentStorage", lambda _settings: storage)
    monkeypatch.setattr(module, "create_embeddings", lambda _settings, _dimensions: FakeEmbeddings())
    monkeypatch.setattr(module, "extract_and_split", lambda _data, _id, _name, _category, _settings: [
        Document(page_content="Verified PDF content for a project.", metadata={"page": 1})
    ])

    def verify(token, _settings):
        if token != "valid":
            raise HTTPException(401, "Invalid administrator token.")
        return uuid4()

    monkeypatch.setattr(security, "verify_admin_token", verify)
    app = create_app(admin_settings(DOCUMENT_MAX_FILE_SIZE_MB=1, DOCUMENT_MAX_FILES_PER_UPLOAD=2))
    with TestClient(app) as client:
        assert client.get("/api/v1/admin/documents").status_code == 401
        assert client.post("/api/v1/admin/documents", content=b"x" * 2_000_000).status_code == 401
        assert client.get("/api/v1/admin/documents", headers={"Authorization": "Bearer invalid"}).status_code == 401
        listed = client.get("/api/v1/admin/documents", headers={"Authorization": "Bearer valid"})
        assert listed.status_code == 200 and listed.json() == []
        oversized = client.post("/api/v1/admin/documents", content=b"x" * 3_200_000,
                                headers={"Authorization": "Bearer valid", "Content-Type": "application/pdf"})
        assert oversized.status_code == 413
        preflight = client.options("/api/v1/admin/documents", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "authorization",
        })
        assert preflight.status_code == 200
        assert preflight.headers["access-control-allow-origin"] == "http://localhost:5173"
        auth = {"Authorization": "Bearer valid"}
        pdf = b"%PDF-1.4\nvalidated" + b"\n%%EOF"
        uploaded = client.post("/api/v1/admin/documents", headers=auth,
                               files={"file": ("portfolio.pdf", pdf, "application/pdf")},
                               data={"category": "projects", "title": "Portfolio PDF"})
        assert uploaded.status_code == 202
        document_id = uploaded.json()["id"]
        assert uploaded.json()["status"] == "queued"
        assert "storage_path" not in uploaded.json()
        assert client.get(f"/api/v1/admin/documents/{document_id}", headers=auth).status_code == 200
        changed = client.patch(f"/api/v1/admin/documents/{document_id}", headers=auth, json={"title": "Updated"})
        assert changed.status_code == 200 and changed.json()["title"] == "Updated"
        assert client.patch(f"/api/v1/admin/documents/{document_id}", headers=auth, json={"description": None}).status_code == 422
        downloaded = client.get(f"/api/v1/admin/documents/{document_id}/download", headers=auth)
        assert downloaded.status_code == 200 and downloaded.content == pdf
        assert downloaded.headers["cache-control"] == "no-store"
        assert client.get(f"/api/v1/admin/documents/{document_id}/jobs", headers=auth).status_code == 200
        batch = client.post("/api/v1/admin/documents/batch", headers=auth,
                            files=[("files", ("second.pdf", b"%PDF-1.4\nsecond\n%%EOF", "application/pdf")),
                                   ("files", ("bad.pdf", b"not a PDF", "application/pdf"))],
                            data={"category": "projects"})
        assert batch.status_code == 200
        assert [item["status"] for item in batch.json()["results"]] == ["queued", "rejected"]
        assert client.delete(f"/api/v1/admin/documents/{document_id}", headers=auth).status_code == 204
        assert client.get(f"/api/v1/admin/documents/{document_id}", headers=auth).status_code == 404


def test_pdf_extraction_preserves_page_number_and_rejects_scans():
    from io import BytesIO
    from pypdf import PdfWriter
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
    from app.admin.processing import DocumentProcessingError, extract_and_split

    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"),
                             NameObject("/BaseFont"): NameObject("/Helvetica")})
    font_ref = writer._add_object(font)
    page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref})})
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 72 700 Td (Verified private knowledge document text.) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    output = BytesIO()
    writer.write(output)
    chunks = extract_and_split(output.getvalue(), "doc-1", "source.pdf", "projects", admin_settings())
    assert chunks[0].metadata["page"] == 1
    assert "Verified private knowledge" in chunks[0].page_content

    blank = PdfWriter()
    blank.add_blank_page(width=612, height=792)
    output = BytesIO()
    blank.write(output)
    with pytest.raises(DocumentProcessingError):
        extract_and_split(output.getvalue(), "doc-2", "scan.pdf", "projects", admin_settings())


def test_pgvector_retriever_uses_hosted_embeddings_and_configured_threshold():
    from app.admin.retriever import PgVectorRetriever

    captured = {}

    class Embeddings:
        def embed_query(self, question):
            assert question == "Which project used FastAPI?"
            return [0.1] * 768

    class Repository:
        def search(self, vector, limit, threshold):
            captured.update(dimensions=len(vector), limit=limit, threshold=threshold)
            return [Document(page_content="TripSmart used FastAPI.", metadata={"source": "pdf/test/original.pdf", "category": "projects"})]

    retriever = PgVectorRetriever(admin_settings(), Repository(), Embeddings())
    documents = asyncio.run(retriever.retrieve("Which project used FastAPI?"))
    assert documents[0].page_content == "TripSmart used FastAPI."
    assert captured == {"dimensions": 768, "limit": 4, "threshold": 0.45}


def test_indexed_pdf_context_reaches_existing_chat_chain():
    from app.schemas.ai_schema import AIResult
    from app.services.knowledge_ai_service import KnowledgeAIService
    from app.services.knowledge_service import KnowledgeService

    seen = {}

    class Retriever:
        async def retrieve(self, _query):
            return [Document(page_content="The portfolio owner built a travel forecast project.",
                             metadata={"source": "pdf/123/original.pdf", "category": "projects"})]

    class AI:
        async def generate_grounded(self, question, context):
            seen["context"] = context
            return AIResult(answer="The developer built TripSmart.", model="mock")

    service = KnowledgeAIService(admin_settings(), AI(), KnowledgeService("app/knowledge"), Retriever())
    answer = asyncio.run(service.answer("What projects has this developer completed?"))
    assert answer.mode == "rag"
    assert "travel forecast project" in seen["context"]
    assert "TripSmart" in seen["context"]
    assert any(source.document.startswith("pdf/") for source in answer.sources)
