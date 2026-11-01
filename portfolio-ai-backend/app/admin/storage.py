"""Private Supabase Storage access; the backend key never reaches visitors."""

from supabase import create_client
from storage3.exceptions import StorageApiError


class DocumentStorageError(Exception):
    pass


class DocumentStorage:
    def __init__(self, settings):
        self.bucket = settings.supabase_document_bucket
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key.get_secret_value())

    def ensure_private(self) -> None:
        try:
            bucket = self.client.storage.get_bucket(self.bucket)
            if bucket.public:
                raise DocumentStorageError("The document bucket must be private.")
        except DocumentStorageError:
            raise
        except Exception as exc:
            raise DocumentStorageError("Document storage is temporarily unavailable.") from exc

    def provision_private(self, max_file_bytes: int) -> None:
        try:
            bucket = self.client.storage.get_bucket(self.bucket)
        except StorageApiError as exc:
            if str(exc.status) != "404":
                raise DocumentStorageError("Could not inspect document storage.") from exc
            try:
                self.client.storage.create_bucket(self.bucket, options={
                    "public": False, "file_size_limit": max_file_bytes,
                    "allowed_mime_types": ["application/pdf"],
                })
            except Exception as create_exc:
                raise DocumentStorageError("Could not create private document bucket.") from create_exc
            return
        if bucket.public:
            raise DocumentStorageError("The document bucket must be private.")
        desired_limit = min(bucket.file_size_limit or max_file_bytes, max_file_bytes)
        if bucket.file_size_limit != desired_limit or bucket.allowed_mime_types != ["application/pdf"]:
            try:
                self.client.storage.update_bucket(self.bucket, options={
                    "public": False, "file_size_limit": desired_limit,
                    "allowed_mime_types": ["application/pdf"],
                })
            except Exception as exc:
                raise DocumentStorageError("Could not configure private document bucket.") from exc

    def upload(self, path: str, content: bytes) -> None:
        try:
            self.client.storage.from_(self.bucket).upload(path, content, {"content-type": "application/pdf", "upsert": "false"})
        except Exception as exc:
            raise DocumentStorageError("Document upload failed.") from exc

    def download(self, path: str) -> bytes:
        try:
            return self.client.storage.from_(self.bucket).download(path)
        except Exception as exc:
            raise DocumentStorageError("Document download failed.") from exc

    def delete(self, path: str) -> None:
        try:
            self.client.storage.from_(self.bucket).remove([path])
        except Exception as exc:
            raise DocumentStorageError("Document deletion failed.") from exc
