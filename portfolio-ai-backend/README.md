# Portfolio AI Chatbot API

A FastAPI backend for a personal portfolio chatbot, with a LangChain/Groq AI engine, portfolio knowledge and optional RAG, short-lived sessions, and public API safeguards. See the [workspace deployment guide](../README.md) for the full React plus API architecture and release procedure.

## Architecture and stack

Python 3.11+, FastAPI, Pydantic, pydantic-settings, Uvicorn, LangChain Core, LangChain Groq, Pytest, and HTTPX. Optional RAG dependencies are LangChain Text Splitters, LangChain Chroma, and LangChain Google GenAI. The `api` package handles HTTP routing, `schemas` defines response shapes, `core` owns configuration and errors, and `utils` provides logging. The `services` package coordinates AI and knowledge calls, while `ai` contains model, prompt, chain, embedding, and retrieval components. `knowledge` contains verified source documents and index utilities.

```text
portfolio-ai-backend/
├── app/
│   ├── main.py
│   ├── api/v1/{router.py,health.py}
│   ├── core/{config.py,exceptions.py}
│   ├── schemas/{common.py,ai_schema.py}
│   ├── utils/logger.py
│   ├── services/{ai_service.py,knowledge_service.py,knowledge_ai_service.py,session_service.py,chat_service.py}
│   ├── ai/{llm.py,prompts.py,chains.py,output.py,errors.py,embeddings.py,retriever.py,conversation.py}
│   └── knowledge/{*.md,index.py,context.py,errors.py}
├── scripts/{test_ai_engine.py,test_knowledge.py,index_knowledge.py,live_groq_test.py,live_rag_test.py,live_chat_test.py}
├── tests/{test_health.py,test_ai_*.py,test_knowledge_*.py,test_chat_*.py,test_sessions.py,...}
├── .env.example
├── pyproject.toml
└── requirements.txt
```

## Setup (Windows PowerShell)

From `portfolio-ai-backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

If PowerShell prevents activation, call `.\.venv\Scripts\python.exe` in place of `python` and `.\.venv\Scripts\uvicorn.exe` in place of `uvicorn`.

Open `http://127.0.0.1:8000/docs` for interactive API documentation. `GET http://127.0.0.1:8000/api/v1/health` returns:

```json
{"status":"healthy","service":"portfolio-ai-chatbot","version":"v1"}
```

The health route checks only that the API is serving requests. It does not probe external services.

## Configuration

Settings load from `PORTFOLIO_`-prefixed environment variables and an optional `.env` file. `.env.example` lists safe local defaults. `PORTFOLIO_CORS_ORIGINS` accepts comma-separated origins or a JSON array. Production requires explicit HTTPS origins and a Groq key, disables debug mode, and hides API documentation. Credentials are not enabled for CORS. Do not commit `.env`.

`PORTFOLIO_API_HOST` and `PORTFOLIO_API_PORT` record the intended server address; Uvicorn does not automatically read them. Pass the corresponding flags when starting the server, for example:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

For deployment, supply the desired host and port to the process manager. `PORTFOLIO_APP_ENVIRONMENT` supports `development`, `testing`, and `production`. `PORTFOLIO_LOG_LEVEL` supports `DEBUG`, `INFO`, `WARNING`, `ERROR`, and `CRITICAL`.

## Tests

```powershell
python -m pytest
```

Tests run locally with FastAPI TestClient. They cover app startup, health, response schemas, unknown routes, CORS, validation and server errors, and production settings.

## Phase 2 — AI Engine

LangChain Core builds separate system and human messages and connects the prompt, `ChatGroq`, and output processing with a Runnable chain. Groq Cloud hosts the default `openai/gpt-oss-20b` model. `AIService.generate_response(question)` validates the input, invokes the chain asynchronously, and returns an `AIResult` with the answer, configured model, and provider-reported token usage when available. It does not expose a public chat route.

Create a Groq API key in the [Groq Cloud console](https://console.groq.com/keys). Put it in the local, ignored `.env` file as `GROQ_API_KEY=...`, or set it for the current PowerShell session with `$env:GROQ_API_KEY = "..."`. Never commit the key. The other settings in `.env.example` are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Hosted model identifier |
| `LLM_TEMPERATURE` | `0.3` | Sampling temperature, 0–2 |
| `LLM_MAX_OUTPUT_TOKENS` | `400` | Maximum generated tokens, 1–8192 |
| `LLM_TIMEOUT_SECONDS` | `30` | Request timeout, greater than 0 and at most 120 seconds |
| `LLM_MAX_RETRIES` | `1` | Provider retries, 0–3 |
| `LLM_MAX_QUESTION_CHARS` | `4000` | Maximum question length, 1–10000 characters |

To change the model or limits, edit `.env` and restart the process. The model client and service are cached after first use. Install or update dependencies with `python -m pip install -e ".[dev]"` from the backend directory. The project uses `langchain-core` and `langchain-groq`; the top-level `langchain` package is unnecessary for this phase and would bring in LangGraph.

Run the interactive terminal tool without starting FastAPI:

```powershell
python -m scripts.test_ai_engine
```

Type a question and press Enter; type `exit` to leave. The tool does not retain conversation history. Run the complete local test suite with `python -m pytest`. A separate test makes a real, billable Groq request only when you explicitly run:

```powershell
python -m pytest scripts/live_groq_test.py -q
```

It skips when `GROQ_API_KEY` is absent. Missing credentials are checked when the engine initializes, so the health route stays available. Authentication, rate limit, timeout, connection, missing model, empty response, and unexpected provider failures become safe application errors. Provider exception text and credentials are not returned to callers. The Groq client handles its bounded retry setting; there is no additional service retry loop.

## Phase 3 — Knowledge and RAG

Portfolio facts live in UTF-8 `.md` or `.txt` files under `app/knowledge`. `projects.md` contains facts transcribed from the existing portfolio project data. The other Markdown files are **templates**: replace each `[TO BE PROVIDED...]` marker with verified information before use. A file still containing that marker, or containing only whitespace, is excluded entirely. Each loaded document has relative `source`, `category`, and `document_type` metadata. Avoid putting secrets or private information in these files; document text may be sent to the configured model and embedding providers.

Direct context is the default (`KNOWLEDGE_MODE=direct_context`). The service selects relevant verified documents, bounds the supplied context, and uses the existing Groq model with a portfolio-specific prompt. If no relevant verified document exists, it gives a clear unavailable-information answer without inventing a fact. General technical questions use the Phase 2 AI path. In auto mode, explicit personal references go through knowledge processing; clear general questions use the general path; ambiguous wording stays on the knowledge path. Callers can also select `general`, `direct_context`, or `rag` explicitly. The returned internal result includes the actual mode and only sources supplied to that answer.

RAG uses `gemini-embedding-001` through the hosted Google Gemini API, splits documents at headings and paragraphs, and stores embeddings in a persistent local Chroma index. Groq still hosts text generation. RAG retrieves up to `RAG_TOP_K` chunks, bounds context, and calls the same Groq model with a portfolio prompt. RAG retrieves reference text; it does **not** train or update the LLM. Indexing is a separate command and never runs on a question request.

Google currently lists a [free tier for Gemini Embedding](https://ai.google.dev/gemini-api/docs/pricing), with limits that may change; its paid rate is listed on that page. Free-tier content may be used to improve Google's products, while the paid tier is listed differently. Check current pricing and data terms before sending portfolio text. Create a key in [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key), then put `EMBEDDING_API_KEY=...` in the ignored `.env` file. An embedding key is needed for indexing and RAG retrieval, but not for direct context. A Groq key is needed whenever the model generates an answer.

Install the optional dependencies and configure `.env`:

```powershell
python -m pip install -e ".[dev,rag]"
Copy-Item .env.example .env
# Edit .env: add GROQ_API_KEY and EMBEDDING_API_KEY, then fill in verified knowledge files.
python -m scripts.index_knowledge
python -m scripts.test_knowledge
```

`python -m scripts.index_knowledge` is also the rebuild command after editing a document. It skips unchanged content, builds changed content into a new Chroma collection, and switches the active index only after the new collection succeeds. The default vector path is `data/chroma`, which is outside source directories and ignored by Git. Old active data remains available if a rebuild fails. Source paths in responses are relative document names.

| Variable | Default | Purpose |
| --- | --- | --- |
| `KNOWLEDGE_MODE` | `direct_context` | Default knowledge path; `rag` enables retrieval |
| `KNOWLEDGE_PATH` | `app/knowledge` | Source document directory |
| `RAG_TOP_K` | `4` | Maximum retrieved chunks, 1–10 |
| `RAG_CHUNK_SIZE` | `700` | Maximum chunk characters, 100–4000 |
| `RAG_CHUNK_OVERLAP` | `100` | Overlap, less than chunk size |
| `RAG_MAX_CONTEXT_CHARS` | `6000` | Context character budget, 200–30000 |
| `EMBEDDING_PROVIDER` | `google` | Hosted embedding provider |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Hosted embedding model |
| `EMBEDDING_API_KEY` | empty | Google API key, required for RAG |
| `VECTOR_DB_PATH` | `data/chroma` | Persistent local Chroma directory |

Use `python -m pytest` for all local tests; they use fake model and embedding responses and consume no API tokens. Explicit live checks are `python -m pytest scripts/live_groq_test.py scripts/live_rag_test.py -q`; they skip if keys or an index are absent. To test retrieval interactively, run `python -m scripts.test_knowledge`, select RAG, and ask about a fact added to a source document.

If indexing says no verified documents, replace the template markers first. If RAG reports a missing index, run the index command. If an embedding request fails or is rate limited, check the Google key, model, account limits, and network; the active index is retained on a failed rebuild. A RAG result depends on the quality and relevance of supplied documents, retrieval, and model output. Source references identify supplied documents, but do not prove that every sentence in a generated answer is entailed by them. No live provider result is guaranteed without configured keys and network access.

## Phase 4 — Chat Management & REST API

`POST /api/v1/chat` accepts a message and optional `session_id`. Omit the ID for a new conversation; reuse the returned ID for follow-up turns. The response reports the actual `general`, `direct_context`, or `rag` mode and the source documents supplied to a knowledge answer. This is the only public chat endpoint; no endpoint lists or reads sessions. Open `/docs` in development to try it through Swagger UI.

```json
{"message":"What is the developer's GPA?","session_id":null}
```

```json
{"answer":"I don't have verified portfolio information to answer that question.","session_id":"<new random ID>","mode":"direct_context","sources":[]}
```

The example now applies to unavailable personal facts such as GPA. Project questions use `projects.md` and require a configured Groq key to generate an answer. For another turn, send the returned ID:

```powershell
$first = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/v1/chat' -ContentType 'application/json' -Body '{"message":"What projects has this developer completed?"}'
$body = @{ message = 'Which technologies were used in the first one?'; session_id = $first.session_id } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/v1/chat' -ContentType 'application/json' -Body $body
```

Each session has a cryptographically random bearer ID, recent LangChain human/AI messages, timestamps, and an inactivity expiry. Recent messages are passed to the existing LangChain prompts. For follow-ups with references such as “that project” or “the first one,” the knowledge service also adds the previous exchange to the retrieval query; this does not make an extra model call. The current message is added to history only after an answer succeeds. Overlapping requests for one session return `409`, while other sessions proceed. Unknown and expired IDs return `404`; send no ID to start over. Sessions are removed on expiry and app shutdown.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHAT_MAX_MESSAGE_LENGTH` | `2000` | Maximum message characters; the AI question limit also applies |
| `CHAT_MAX_HISTORY_MESSAGES` | `12` | Retained messages, in complete user/assistant pairs |
| `CHAT_MAX_HISTORY_CHARS` | `6000` | Additional history character cap |
| `CHAT_SESSION_TTL_MINUTES` | `60` | Inactivity expiry |
| `CHAT_MAX_ACTIVE_SESSIONS` | `1000` | Maximum in-memory sessions per process |

Malformed messages and IDs return `422`. Provider rate limits return `429`, model failures `502`, unavailable configuration or retrieval `503`, and model timeouts `504`. Errors use the standard `{ "error": { "code": "...", "message": "..." } }` shape without raw provider details. The API does not log request bodies or session IDs. The bearer ID should be treated as a secret by clients.

Run local tests and the separately invoked live HTTP check with:

```powershell
python -m pytest
python -m pytest scripts/live_chat_test.py -q
```

Local tests use fake providers and consume no API tokens. The live check needs a Groq key and verified portfolio documents; configured RAG mode also needs an embedding key and built index. It skips when these prerequisites are absent. Session storage is **in memory only**: restarting the server loses sessions, and separate workers or server instances do not share them. A shared store is needed before horizontal scaling. Public traffic controls are documented below.

## Phase 6 — public API safeguards

`POST /api/v1/chat` has a 16 KiB JSON body cap, strict request fields and session format, and process-local limits. Defaults are 5 requests per minute and 50 per hour per client, 100 total requests per minute, and 4 concurrent chat requests. A rejected request returns `429` with a safe error and `Retry-After`. The app identifies clients from the server connection address, never from a request's untrusted `X-Forwarded-For` header. Configure `TRUSTED_PROXY_IPS` for the deployment's actual reverse proxy; restrict direct access to the backend if a proxy supplies client IPs. Shared NAT addresses share a quota. Client keys are salted hashes of IPs and expire after one hour; raw addresses are not retained by the limiter. All limits are **per process**. Run one worker, or add a shared limiter and session store before scaling horizontally.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHAT_MAX_REQUEST_BYTES` | `16384` | Maximum chat JSON bytes |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `5` | Per-client minute quota |
| `RATE_LIMIT_REQUESTS_PER_HOUR` | `50` | Per-client hour quota |
| `GLOBAL_REQUESTS_PER_MINUTE` | `100` | Process-wide minute quota |
| `MAX_CONCURRENT_CHAT_REQUESTS` | `4` | Process-wide in-flight chat cap |
| `LLM_MAX_RESPONSE_CHARS` | `8000` | Final response text cap |

The Groq client caps generation at `LLM_MAX_OUTPUT_TOKENS=400`, times out after 30 seconds, and retries at most once by default. Conversation history is bounded by message count and characters; retrieved context is bounded by `RAG_MAX_CONTEXT_CHARS`. Provider rate limits return a safe `429` and `Retry-After: 60`. The frontend never receives provider keys or raw exceptions. Prompts mark retrieved text as untrusted reference data. The model has no tools, arbitrary file access, or command execution. Prompt injection remains a model-behavior risk, so portfolio facts must be reviewed before publishing.

`GET /api/v1/health` reports process liveness without provider calls. `GET /api/v1/ready` checks that the knowledge directory exists and, in RAG mode, that an active index manifest exists; it does not call Groq or the embedding provider. Request logs include a generated request ID, route path, status and duration, but omit request bodies, sessions and IPs. Use the `X-Request-ID` response header to correlate failures. Production API responses include HSTS, frame protection, no-sniff, referrer and permissions headers.

LangSmith is disabled by default. To opt in, set `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY` through the backend secret manager and `LANGSMITH_PROJECT`. Inputs and outputs are hidden by default; `LANGSMITH_INCLUDE_CONVERSATION_DATA=true` explicitly allows full prompts, retrieved context, conversations and answers to leave the service. Review retention and visitor privacy before enabling that setting. The public API continues to work with tracing off.

The default `KNOWLEDGE_MODE=direct_context` reads the small knowledge directory and needs no vector persistence. RAG is optional and must be installed with `.[rag]`, indexed with `python -m scripts.index_knowledge`, and deployed with a persistent `VECTOR_DB_PATH`. On ephemeral hosting, a Chroma index disappears on restart; mount durable storage or rebuild it as a separate deployment step. Indexing is never done automatically at app startup. The 2026-11-01 Python audit found unresolved advisories in optional Chroma; keep direct context for public deployment until those are reviewed and mitigated.

See the [workspace deployment guide](../README.md) for Docker, frontend hosting, environment variables, monitoring, rotation, tests, and post-deployment verification.

## Optional private knowledge management

The [admin module guide](ADMIN_KNOWLEDGE.md) explains Supabase Auth, private PDF Storage, PostgreSQL/pgvector migrations, protected upload and metadata APIs, durable indexing jobs, and how indexed PDFs reach the existing RAG chat path. It is disabled by default and requires the `.[admin]` dependency extra and explicit backend secrets. The existing chat behavior stays available when disabled. No live Supabase project is configured in this workspace.
