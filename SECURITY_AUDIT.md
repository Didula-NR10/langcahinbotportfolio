# Phase 6 audit and remediation record

Audit date: 2026-11-01. Scope: workspace copies of `portfolio-ai-backend` and `portfolio-frontend`. This workspace is not a Git repository, so commit history and copies outside it could not be inspected.

## Existing strengths

- FastAPI already separated routing, schemas, services, prompts, knowledge, retrieval and sessions.
- Session IDs were cryptographically random, expiring, bounded and absent from URLs. Concurrent turns on one session were rejected.
- Requests already forbade unexpected JSON fields and used explicit CORS origins. Provider errors had safe API mappings.
- The React widget already handled cancellation, retries, session reset, theme changes, mobile layout and accessible keyboard controls. Markdown was rendered without raw HTML or dangerous links.
- Groq output tokens, timeout and retries were already configurable; RAG indexing was an explicit command rather than a startup operation.

## Findings and status

| Priority | Finding and impact | Remediation/status |
| --- | --- | --- |
| P0 | A credential-shaped Groq key was present in backend `.env.example`; copied or published versions could be abused. | Replaced with an empty placeholder and scanned source/build output. **Owner must rotate the key and inspect external copies/history.** No Git history is available here. |
| P0 | Public chat had no per-client or global usage controls, allowing quota exhaustion. | Added hashed-IP per-minute/hour, global minute and concurrent admission limits with bounded expiry and 429/Retry-After responses. Controls remain process-local. |
| P1 | JSON body and final answer size were not bounded independently of question/token settings. | Added a pre-parse body cap and final character cap; retained Groq token, timeout, retry, history and context limits. |
| P1 | Production accepted HTTP CORS origins and did not require provider configuration; frontend builds could embed an HTTP API origin. | Added production validation and an HTTPS-only frontend build check. Exact deployed origin and secrets are still needed. |
| P1 | Exception logging could include internal details, and operational request logs lacked correlation/duration. | Logged exception category only; added request ID, route, status, duration and response security headers. No request bodies, sessions or IPs are logged by the app. |
| P1 | All backend knowledge files were templates, so portfolio project questions had no verified context. | Transcribed five project summaries from existing portfolio project data into `projects.md`; other personal facts remain unavailable until reviewed. |
| P1 | Local Chroma would disappear on ephemeral hosting; no RAG deployment strategy was selected. | Selected direct context for the small production knowledge set. RAG remains optional with explicit persistent storage and offline indexing. |
| P1 | Optional tracing had no privacy gate. | Added explicit LangSmith configuration, off by default; inputs and outputs hidden unless specifically enabled. |
| P1 | Existing tests did not cover limits, body rejection, output cap, production secret masking or deployed knowledge. | Added focused security and knowledge tests and a mocked load smoke. |
| P1 | Optional Chroma package had unresolved published advisories in the local Python audit. | Excluded it from the default production image; defer public RAG mode until advisories are reviewed and mitigated. |
| P2 | Python dependency ranges are bounded but not transitively locked; no local Docker engine or hosting access. | Dockerfile and deployment guide added; image and production checks remain unverified. Frontend lockfile is present. |

## Verification record

- Backend: 109 local tests passed; `pip check` passed.
- Frontend: 14 tests passed; production build passed; an HTTP API URL was rejected by the build.
- Browser: desktop, tablet and two phone sizes passed against real local FastAPI; two requests reused the session ID.
- Mocked load: 20 concurrent requests, 4 accepted and 16 safely rejected by the concurrency cap; no active permit leaked.
- Dependency audit: npm reported zero advisories. Python audit reported five entries for optional `chromadb==1.5.9` and initially two for `pip`; updating local `pip` to 26.2.2 cleared its entries. The current Chroma issue remains.
- Production: no deployment, Docker run, live Groq answer, live RAG retrieval or HTTPS host verification occurred.
