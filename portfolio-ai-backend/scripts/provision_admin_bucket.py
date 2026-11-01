"""Create or verify the dedicated private Supabase PDF bucket."""

from app.admin.storage import DocumentStorage
from app.core.config import get_settings


def main():
    settings = get_settings()
    if not settings.admin_knowledge_enabled:
        raise SystemExit("Enable ADMIN_KNOWLEDGE_ENABLED and set backend secrets first.")
    storage = DocumentStorage(settings)
    storage.provision_private(settings.document_max_file_size_mb * 1024 * 1024)
    print("Private document bucket is ready.")


if __name__ == "__main__":
    main()
