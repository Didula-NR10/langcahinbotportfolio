from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.knowledge.errors import KnowledgeError
from app.knowledge.index import active_collection
from app.services.knowledge_service import KnowledgeService

from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service="portfolio-ai-chatbot",
        version=request.app.state.settings.api_version,
    )


@router.get("/ready", include_in_schema=False)
def ready(request: Request):
    settings = request.app.state.settings
    try:
        KnowledgeService(settings.knowledge_path).discover()
        if settings.admin_knowledge_enabled:
            if not request.app.state.document_service.repository.ping():
                return JSONResponse(status_code=503, content={"status": "not_ready"})
        elif settings.knowledge_mode == "rag":
            active_collection(settings.vector_db_path)
    except (KnowledgeError, OSError):
        return JSONResponse(status_code=503, content={"status": "not_ready"})
    return {"status": "ready"}
