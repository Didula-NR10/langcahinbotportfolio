# Private AI knowledge management backend

This optional module adds authenticated PDF management to the existing FastAPI application. It leaves the public React portfolio and Groq chat API intact. It uses [Supabase Auth JWTs](https://supabase.com/docs/guides/auth/jwts), a [private Supabase Storage bucket](https://supabase.com/docs/guides/storage/buckets/fundamentals), PostgreSQL metadata and persisted jobs, and [pgvector](https://supabase.com/docs/guides/ai/vector-indexes) for retrieval. No Supabase project or database credentials are present in this workspace, so live cloud operations and migrations have **not** been verified.

## Provisioning

1. Create a dedicated Storage bucket named `portfolio-knowledge` with **Public** disabled. After setting the backend environment below, `python -m scripts.provision_admin_bucket` creates the private PDF-only bucket if it is absent and refuses an existing public bucket. Do not create `anon` or `authenticated` policies granting access to this bucket. The backend checks that the bucket is private before uploads. Original PDFs use generated paths such as `documents/<UUID>/original.pdf`; filenames are stored separately.
2. Enable Supabase Auth asymmetric JWT signing keys. Create the owner account through the Supabase dashboard or an invitation, disable public signup if unnecessary, and copy the owner's Auth user UUID into `ADMIN_USER_IDS`. The API verifies each token's signature against the project's JWKS, issuer, audience, expiry, authenticated role and server-side UUID allowlist. User-editable profile metadata cannot grant admin rights. Legacy HS256 projects must migrate to asymmetric signing before this module can authenticate them.
3. Obtain a PostgreSQL connection URL for the Supabase project. Keep the database password and the Supabase service-role/secret key only in backend secrets. Never put them in a `VITE_` variable or distribute them with an admin client. Use TLS for the database connection (`sslmode=require` in `DATABASE_URL`). The direct database role needs permission to run the migration and operate the tables; restrict its network access and rotate its password if exposed.
4. Add the backend environment variables shown below, then run `python -m alembic upgrade head` from `portfolio-ai-backend`. The migration creates the `vector` extension, documents, chunks and jobs tables, a cosine HNSW index, status constraints, and RLS/grant restrictions. If Supabase has already installed `vector`, the migration reuses it. The migration's vector dimension comes from `DOCUMENT_EMBEDDING_DIMENSIONS`; changing that setting later requires a new migration and reindex.
5. Install `python -m pip install -e ".[admin]"` for native Python hosting, or build `Dockerfile` with `--build-arg INSTALL_ADMIN=true`. Keep one application worker because the existing chat sessions and usage limits are process-local. The document jobs themselves persist in PostgreSQL and recover after a restart.

```env
ADMIN_KNOWLEDGE_ENABLED=true
KNOWLEDGE_MODE=rag
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend secret>
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<database>?sslmode=require
ADMIN_USER_IDS=<owner Auth UUID>
SUPABASE_DOCUMENT_BUCKET=portfolio-knowledge
EMBEDDING_API_KEY=<backend secret>
EMBEDDING_MODEL=gemini-embedding-001
DOCUMENT_EMBEDDING_DIMENSIONS=768
GROQ_API_KEY=<backend secret>
```

The backend's `SUPABASE_PUBLISHABLE_KEY` setting is optional and unused by this server module. A future private admin client may use that public key to sign in through Supabase Auth; it must send only the resulting user access token to FastAPI. The backend uses the service key for Storage, never for admin authorization. Production also needs `PORTFOLIO_APP_ENVIRONMENT=production`, `PORTFOLIO_CORS_ORIGINS` set to the exact HTTPS admin/frontend origin, and the existing production chat settings.

## API

All routes below are under `/api/v1/admin/documents` and require `Authorization: Bearer <Supabase access token>`. They are absent when `ADMIN_KNOWLEDGE_ENABLED=false`. Obtain the token using Supabase Auth sign-in in a private API client; do not pass a password or service key to these endpoints. The service checks the token **before parsing uploads**. Cross-origin admin requests may use the configured CORS origin and Authorization header.

| Method | Path | Action |
| --- | --- | --- |
| `POST` | `/` | Upload one PDF with multipart `file`, `category`, optional `title`, `description`; returns `202` and queued metadata |
| `POST` | `/batch` | Upload up to `DOCUMENT_MAX_FILES_PER_UPLOAD` PDFs; returns a separate result for each file |
| `GET` | `/` | List documents with `limit` and `offset` |
| `GET` | `/{id}` | View metadata, status, chunk count and safe processing error |
| `GET` | `/{id}/download` | Download the original PDF with `Cache-Control: no-store` |
| `PATCH` | `/{id}` | Edit category, title or description |
| `PUT` | `/{id}/file` | Replace a finished PDF and queue indexing again |
| `DELETE` | `/{id}` | Remove the private PDF and database record/chunks |
| `POST` | `/{id}/reindex` | Queue indexing again |
| `GET` | `/{id}/jobs` | View processing attempts and errors |

Example with `curl` after obtaining an access token from Supabase Auth:

```bash
curl -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -F "file=@portfolio.pdf;type=application/pdf" \
  -F "category=projects" -F "title=Portfolio projects" \
  https://<backend-origin>/api/v1/admin/documents
```

The response says `queued`, never `indexed` before work completes. Poll the document or job endpoint. A failed file in a batch does not roll back earlier successful files. Duplicate SHA-256 content returns 409; unsupported or malformed/scanned/encrypted PDFs return a safe rejection. Each file is limited to 15 MiB by default, the whole admin request is capped, and extraction runs in a subprocess with a 30-second timeout and resource limits where supported. Up to 100 pages, 200,000 extracted characters and 300 chunks are allowed by default. OCR is not implemented.

## Indexing and public answers

The background worker claims queued database jobs with `FOR UPDATE SKIP LOCKED`, downloads the original from private Storage, extracts page text, uses the existing LangChain splitter and hosted Google embedding integration in bounded batches (32 chunks by default), then replaces that document's chunks transactionally. It validates the configured embedding dimension and records page metadata. Failed jobs expose only a safe category message; stale processing jobs are retried up to three attempts after ten minutes. The worker does not block normal chat requests. Admin document status moves through `queued`, `processing`, `indexed` or `failed`; deletion uses `deleting`.

When enabled, the existing RAG answer path queries pgvector using a configurable cosine-distance threshold and joins only `indexed` documents. Existing reviewed Markdown knowledge remains available in the same answer context. A generated answer can cite a PDF source and its category. Upload **only information intended for public chatbot answers**: admin API privacy does not make indexed document content private from visitors. Original PDFs remain accessible only through authenticated admin download, but extracted passages may be returned by the public chatbot and sent to the embedding/Groq providers.

Default mode without this module continues to use the existing direct-context or Chroma paths. The new admin Docker extra uses pgvector and does not install Chroma. The vector database is managed by Supabase PostgreSQL, so application redeploys do not erase indexed chunks. Database backups, Supabase project quotas, provider billing and any private admin UI are external operational responsibilities.

## Verification limits

The full backend suite passed 122 local tests; the frontend suite passed 14 and its production build succeeded. Local tests cover config validation, JWT signature/expiry/allowlist, protected API routes, upload/duplicate handling, PDF text extraction and scanned-PDF rejection, replacement/deletion/reindex lifecycle, and mocked pgvector retrieval into the existing chat chain. Alembic generated the expected PostgreSQL migration SQL, but the migration was not run against a live database. No live Supabase project, real private bucket, hosted embedding request or Groq request was exercised. Complete those checks with owner credentials in a staging Supabase project before public release. Check that unauthenticated users cannot access Storage or tables directly, that a real PDF reaches `indexed`, that a scanned PDF fails safely, and that the public chatbot cites only intended content.
