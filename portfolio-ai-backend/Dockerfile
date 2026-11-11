FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml README.md ./
COPY app ./app
COPY scripts ./scripts
COPY migrations ./migrations
COPY alembic.ini ./

ARG INSTALL_RAG=true
ARG INSTALL_ADMIN=false
RUN python -m pip install --no-cache-dir --upgrade "pip>=26.2,<27" \
    && if [ "$INSTALL_ADMIN" = "true" ]; then pip install --no-cache-dir ".[admin]"; elif [ "$INSTALL_RAG" = "true" ]; then pip install --no-cache-dir ".[rag]"; else pip install --no-cache-dir .; fi \
    && useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/data \
    && chown appuser:appuser /app/data

USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8000') + '/api/v1/health', timeout=3)" || exit 1
CMD ["sh", "-c", "if [ \"$KNOWLEDGE_MODE\" = \"rag\" ]; then python -m scripts.index_knowledge || exit 1; fi; exec python -m scripts.run_production"]
