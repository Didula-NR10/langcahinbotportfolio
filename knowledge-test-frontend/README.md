# Knowledge Lab: local test frontend

This is a standalone HTML/CSS/vanilla JavaScript client for the existing portfolio AI backend. It does not require npm and does not alter the public portfolio frontend. It uses real API responses throughout.

## Prerequisites

Configure and run the backend as described in [`../portfolio-ai-backend/ADMIN_KNOWLEDGE.md`](../portfolio-ai-backend/ADMIN_KNOWLEDGE.md). In particular, enable `ADMIN_KNOWLEDGE_ENABLED=true` and `KNOWLEDGE_MODE=rag`, provision the private Supabase bucket and PostgreSQL migration, configure embeddings and Groq, and add your Supabase Auth user UUID to `ADMIN_USER_IDS`. The admin routes do not exist when the module is disabled.

Configure the backend's **exact** local origin in `PORTFOLIO_CORS_ORIGINS`. For example, while also retaining the portfolio frontend origin:

```env
PORTFOLIO_CORS_ORIGINS=http://localhost:5500,http://localhost:5173,http://127.0.0.1:5173
```

Start the static server from this directory:

```powershell
cd knowledge-test-frontend
python -m http.server 5500
```

Open `http://localhost:5500`. Do not open `index.html` with `file://`. On the login screen, enter the FastAPI base URL, Supabase project URL, and **browser-safe publishable or anon key** under Connection settings. Enter the existing Supabase owner account email and password. You may put the nonsecret URL and publishable key defaults in `js/config.js` for convenience. Never put a service-role or secret key in this folder.

The app holds session tokens and connection settings in the current tab's JavaScript memory only. Reloading requires another sign-in. An expired access token triggers one refresh attempt; failed refresh returns to login. The backend still enforces JWT validity and `ADMIN_USER_IDS` on every admin request.

## Test the workflow

1. Sign in. The client checks `GET /api/v1/admin/documents?limit=1&offset=0` before displaying the dashboard. A 403 means the account is not on the backend allowlist.
2. Open **Upload documents**. Choose a nonempty PDF under 15 MiB. A single file can have title and description; a batch uses one category and does not send those fields. The backend performs final validation. Accepted uploads are queued, not immediately indexed.
3. Open **Manage documents**. Watch the real status update every four seconds while documents are queued or processing. Details show the current document and job records, including any backend error. Polling stops when processing settles or you leave the relevant view. Use Edit, Replace, Reindex, Delete, and Download as needed.
4. Open **Statistics**. Counts and chunk totals are derived from all pages of `GET /api/v1/admin/documents` because this backend has no `/api/v1/admin/knowledge/stats` endpoint.
5. After a document reaches **indexed**, open **Test chatbot**. Ask about a specific fact in the PDF, then ask a follow-up question. The client reuses the returned `session_id` until you click New conversation. Compare the answer and returned document/category source with the PDF. The chat API does not return page numbers, so none are shown. Empty sources are displayed as no sources rather than invented citations.

No approval or visibility control is displayed because the current backend has no such field or route. Only upload content intended for public chatbot answers: indexed text can be retrieved by the public chat endpoint.

## Connected routes

| Feature | Backend route |
| --- | --- |
| Login, refresh, logout | Supabase Auth `POST /auth/v1/token?grant_type=password`, `POST /auth/v1/token?grant_type=refresh_token`, `POST /auth/v1/logout` |
| Upload one / many | `POST /api/v1/admin/documents`, `POST /api/v1/admin/documents/batch` |
| List / details / jobs / download | `GET /api/v1/admin/documents`, `GET /api/v1/admin/documents/{id}`, `GET /api/v1/admin/documents/{id}/jobs`, `GET /api/v1/admin/documents/{id}/download` |
| Edit / replace / delete / reindex | `PATCH /api/v1/admin/documents/{id}`, `PUT /api/v1/admin/documents/{id}/file`, `DELETE /api/v1/admin/documents/{id}`, `POST /api/v1/admin/documents/{id}/reindex` |
| Chat | `POST /api/v1/chat` |

Uploads use `FormData` and let the browser set the multipart boundary. The app sends the Supabase user JWT to protected FastAPI routes and does not send it to the public chat route. The API URL must use HTTPS away from localhost; the Supabase URL must use HTTPS.

## Limits and diagnosis

- Client file limits default to 15 MiB and 10 files, matching current backend defaults. If the backend configuration changes, update `js/config.js` to match; server checks remain authoritative.
- Supabase credentials and a live project are not in this repository, so local static checks cannot prove real login, hosted indexing, or Groq responses. Exercise those with a configured staging project.
- A CORS/network error often means FastAPI is stopped or `PORTFOLIO_CORS_ORIGINS` lacks the exact page origin. `localhost` and `127.0.0.1` are different origins.
- The FastAPI chat endpoint may be rate limited; errors are displayed without invented answers.
