# RAG deployment for MePortfolio

The portfolio Ask AI button calls this backend at /api/v1/chat. Keep Groq and embedding credentials on the backend only.

## Host this backend

Deploy the portfolio-ai-backend directory as a Docker web service with one instance. The Dockerfile now includes the RAG dependencies by default. Mount persistent storage at /app/data. Supply these environment values through the host secret manager:

PORTFOLIO_APP_ENVIRONMENT=production
PORTFOLIO_DEBUG=false
PORTFOLIO_CORS_ORIGINS=https://YOUR-PORTFOLIO-DOMAIN
KNOWLEDGE_MODE=rag
KNOWLEDGE_PATH=app/knowledge
VECTOR_DB_PATH=/app/data/chroma
GROQ_API_KEY=<backend secret>
EMBEDDING_API_KEY=<backend secret>

Use the host-provided PORT. Set TRUSTED_PROXY_IPS only to the documented reverse-proxy address or network. Never commit .env or put provider keys in a VITE_ variable.

After deployment, run python -m scripts.index_knowledge once inside the running service with the persistent disk mounted. Repeat this command after editing reviewed knowledge. Indexing does not happen automatically at startup.

GET /api/v1/health checks process liveness. Use GET /api/v1/ready as the readiness check; it returns 503 until the index exists. POST {"message":"What is NUMBERBOUND?"} to /api/v1/chat and verify that the response reports mode rag and a source.

## Connect the portfolio frontend

Set VITE_CHATBOT_API_URL=https://YOUR-BACKEND-DOMAIN in the MePortfolio build environment. The value is the HTTPS origin only, with no /api/v1/chat suffix. Rebuild and redeploy the site after changing it. The backend PORTFOLIO_CORS_ORIGINS must be the exact HTTPS origin of the deployed portfolio.

The local Google embedding key is currently unset and no Chroma index exists, so live RAG answers have not been verified. Review the Chroma security audit note in README.md before public deployment.
