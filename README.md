# AI portfolio chatbot — deployment guide

## System

The existing [React/Vite portfolio](portfolio-frontend/README.md) hosts a floating chat widget. It sends JSON over HTTPS to the [FastAPI backend](portfolio-ai-backend/README.md), which enforces body size, input, rate and concurrency limits before coordinating short-lived sessions and either general LangChain/Groq answers or portfolio-grounded answers. Direct context reads reviewed Markdown files. Optional RAG retrieves from a Chroma index using hosted Google embeddings. The browser holds only the current session ID in memory. Groq, embedding and optional LangSmith keys stay on the backend.

```text
Visitor → HTTPS Cloudflare static portfolio → HTTPS FastAPI (one worker)
                                           → bounded session and request state
                                           → direct knowledge or optional RAG/Chroma
                                           → LangChain → Groq
```

This workspace contains a copy of the existing portfolio in `portfolio-frontend`; the sibling original was not edited. The [Phase 6 audit](SECURITY_AUDIT.md) records findings and verification. No hosting account, production domain or live provider credentials are available in this workspace, so the system has **not** been deployed or production-verified.

## Local development and tests

From `portfolio-ai-backend`, create a virtual environment and install the project:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
# Add your own GROQ_API_KEY to the ignored .env for model-backed answers.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

From `portfolio-frontend`, install from the lockfile and run Vite:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Run backend tests with `.\.venv\Scripts\python.exe -m pytest -q`; run frontend tests and the build with `npm.cmd test` and `npm.cmd run build`. The browser smoke script `npm.cmd run test:browser` needs the frontend, backend and Microsoft Edge running locally. It uses unknown personal facts for real HTTP requests so it needs no Groq key. Separately invoked provider tests are under `portfolio-ai-backend/scripts/live_*.py` and require your own credentials; they may consume provider quota.

## Production configuration

Set `PORTFOLIO_APP_ENVIRONMENT=production`, `PORTFOLIO_DEBUG=false`, `PORTFOLIO_CORS_ORIGINS=https://<actual-frontend-origin>` and `GROQ_API_KEY` in the backend host's secret manager. The example file lists every supported limit and provider setting. Production rejects localhost or HTTP CORS origins, a missing Groq key, debug mode, and RAG without an embedding key. Keep `LANGSMITH_TRACING=false` unless intentionally enabled. The backend uses `PORT` for container hosting, runs a single Uvicorn worker, and reads `TRUSTED_PROXY_IPS` for Uvicorn's trusted forwarding configuration. Set that value to the **actual proxy address or trusted network** supplied by the host; never use `*` on a publicly reachable backend. Restrict direct access if the host has an ingress proxy.

Set `VITE_CHATBOT_API_URL` to the public **HTTPS origin** of the backend before building the frontend, without `/api/v1/chat`. The production build rejects an HTTP API URL. Same-origin `/api/v1/chat` works only if you configure a reverse proxy for that route. Do not put provider keys in `VITE_` variables: Vite embeds those values in public JavaScript. The frontend's `public/_headers` applies security headers to Cloudflare static assets. Test the final host's response headers after deployment.

| Control | Default | Scope |
| --- | --- | --- |
| Client requests | 5/minute, 50/hour | Hashed connection IP; shared NAT shares quota |
| Global requests | 100/minute | One backend process |
| Concurrent chat | 4 | One backend process |
| Groq output | 400 tokens, 8000 response characters | Each model call |
| Session | 60-minute idle TTL, 1000 active, 12 messages | In-memory, one process |
| Request body | 16 KiB | Chat endpoint |

These controls bound this app's traffic; they do not replace a host's edge protection or Groq account limits. Check current account quotas in the provider console. A restart clears sessions and rate counters. Multiple instances need shared session and limit stores; the provided deployment intentionally uses one worker. Health and readiness checks make no provider calls. Provider outages return safe API errors, and the frontend offers retry.

## Deployment path

The portfolio already has a Cloudflare Workers static-assets configuration. Keep that frontend host, and use any HTTPS Python container host for FastAPI. A Render Docker web service is one documented option: it supports Python/Docker, environment secrets, a dynamic `PORT` and HTTP health checks, though free services have capacity and spin-down limits. Review current [Cloudflare static-assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Render free-service limits](https://render.com/docs/free), and [Render pricing](https://render.com/pricing) before selecting a plan. The deployment is not tied to Render.

1. Rotate the Groq key previously found in the example configuration. Create a fresh key in Groq and place it only in the backend host's secret manager. Review any copies or history outside this workspace.
2. Review `portfolio-ai-backend/app/knowledge/projects.md` against the live portfolio. Replace other template knowledge files only with facts approved for public answers. Never add private data or credentials.
3. Deploy `portfolio-ai-backend/Dockerfile` as a **single-instance, single-worker** web service. Set the Docker build context to `portfolio-ai-backend` (or the platform's root directory to that folder). Set the environment above, host-provided `PORT`, and an HTTP health path of `/api/v1/ready`. The image runs as a non-root user. See [Render Docker setup](https://render.com/docs/docker), [web services](https://render.com/docs/web-services), and [health checks](https://render.com/docs/health-checks) for an example host.
4. Confirm the backend HTTPS origin responds to `/api/v1/health` and `/api/v1/ready`. Set `VITE_CHATBOT_API_URL` to that origin in the frontend build environment. Build with `npm ci && npm run build`; deploy the static `dist` directory with the existing `wrangler.jsonc` (`npm run deploy:worker` if Wrangler is authenticated). [Cloudflare's static-assets headers guide](https://developers.cloudflare.com/workers/static-assets/headers/) documents the included `_headers` file.
5. Set `PORTFOLIO_CORS_ORIGINS` to the exact deployed frontend origin and redeploy the backend. Test an `OPTIONS` preflight from that origin, then a real chat request in the deployed browser. Configure a separate preview origin explicitly if needed.

The `Dockerfile` can include RAG dependencies using `--build-arg INSTALL_RAG=true`. Default production mode is `direct_context`, which avoids embedding cost and local vector persistence for this small knowledge base. If choosing RAG, set `KNOWLEDGE_MODE=rag`, `EMBEDDING_API_KEY`, and a durable `VECTOR_DB_PATH`; build the index separately with `python -m scripts.index_knowledge` using that mounted path. Keep the same embedding model at indexing and query time. A local Chroma directory on an ephemeral filesystem disappears on redeploy. Never rebuild an index on every startup. The readiness endpoint returns `503` if RAG has no active index manifest.

An additional [private knowledge backend](portfolio-ai-backend/ADMIN_KNOWLEDGE.md) can use Supabase Auth, private PDF Storage and PostgreSQL/pgvector instead of local Chroma. Build with `--build-arg INSTALL_ADMIN=true`, run its Alembic migration, and supply its separate admin secrets and allowlisted owner UUID. This path has no local vector persistence requirement. It is locally tested with mocks but has not been connected to a live Supabase project.

## Release verification

After deployment, record the frontend and backend HTTPS URLs and check:

- `/api/v1/health` returns 200 and `/api/v1/ready` returns 200 without provider traffic; production `/docs` is unavailable.
- The portfolio pages, theme controls, static assets and chatbot work on desktop and mobile. Browser developer tools show HTTPS chat requests and no mixed content.
- `What is LangChain?` gets a general answer; `What projects has this developer completed?` uses `projects.md`; `Which technologies were used in the first project?` retains the session; `What is the developer's GPA?` acknowledges missing information.
- A temporary provider failure displays a retryable message. Excessive chat requests return 429 with `Retry-After`. An oversized request returns 413. Unapproved CORS origins receive no allow-origin header.
- Security headers are present on the deployed static site and API, and no provider keys appear in downloaded assets or responses.

These are **post-deployment checks**, not claims of production verification. Live provider and production checks remain pending until valid credentials and hosting access are supplied. A local mocked load smoke with 20 simultaneous requests and a 4-request concurrency cap admitted 4, rejected 16 with 429, and left no active requests; its in-process median was about 84 ms, maximum about 169 ms, and peak Python allocations about 2.3 MiB. These figures include TestClient/ASGI test overhead and a 50 ms mock delay; they are not provider or production performance measurements. Re-run with `.\.venv\Scripts\python.exe -m scripts.local_load_smoke` from the backend folder.

## Operations and limitations

Monitor HTTPS availability and readiness, 5xx/429 rates, request duration, Groq rate-limit events, token usage when the provider reports it, RAG errors and restarts. Logs contain a server-generated request ID, route, status and duration; they omit request bodies, session IDs and client IPs. Use the host log dashboard and request ID for troubleshooting. LangSmith tracing is off by default. If enabled, the client hides inputs/outputs unless `LANGSMITH_INCLUDE_CONVERSATION_DATA=true`; trace metadata still leaves the server. Review LangSmith data retention before enabling visitor traces.

Rotate keys by creating a new key at the provider, updating the backend secret, redeploying, verifying a test request, then revoking the old key. Update knowledge by editing reviewed files and redeploying. In RAG mode, rebuild and verify the index before routing traffic. Restarting the service intentionally clears sessions. Check the host's quota and billing dashboard periodically. Current Python dependencies use bounded version ranges rather than a full transitive lock; the frontend has `package-lock.json`. Rebuild and test the backend image before each release.

Dependency audit on 2026-11-01: `npm audit` reported zero advisories; `pip-audit` reported five entries for optional `chromadb==1.5.9`, with no fix version listed. Local `pip` was updated to 26.2.2 to clear its separate advisory. The default direct-context Docker build does **not** install Chroma. Keep RAG out of the production image until the Chroma advisories are reviewed and a safe version or replacement is available. The local development virtual environment still contains the optional package. The package's [upstream issue](https://github.com/chroma-core/chroma/issues/7909) tracks the advisories; no Chroma HTTP server is exposed by this application.
