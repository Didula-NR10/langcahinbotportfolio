import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.schemas.common import ErrorDetail, ErrorResponse
from app.core.limits import ChatLimitExceeded
from app.ai.errors import (
    AIEngineError, EmptyModelResponseError, InvalidModelConfigurationError, InvalidQuestionError,
    MissingCredentialsError, ModelAuthenticationError, ModelConnectionError, ModelRateLimitError,
    ModelServiceError, ModelTimeoutError,
)
from app.knowledge.errors import EmbeddingConfigurationError, EmbeddingRateLimitError, KnowledgeError
from app.services.session_service import (
    SessionCapacityError, SessionConflictError, SessionError, SessionExpiredError, SessionNotFoundError,
)

logger = logging.getLogger("portfolio_ai")


def _error(status_code: int, code: str, message: str, headers: dict[str, str] | None = None) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "HTTP request failed."
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return _error(exc.status_code, code, message)


async def validation_exception_handler(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    return _error(422, "VALIDATION_ERROR", "Invalid request.")


async def unexpected_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled request error: %s", type(exc).__name__)
    return _error(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.")


async def application_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, ChatLimitExceeded):
        return _error(429, "CHAT_RATE_LIMIT", "Chat capacity is temporarily unavailable. Try again later.", {"Retry-After": str(exc.retry_after)})
    if isinstance(exc, InvalidQuestionError):
        return _error(422, "INVALID_MESSAGE", str(exc))
    if isinstance(exc, (SessionNotFoundError, SessionExpiredError)):
        return _error(404, "SESSION_EXPIRED" if isinstance(exc, SessionExpiredError) else "SESSION_NOT_FOUND", str(exc))
    if isinstance(exc, SessionConflictError):
        return _error(409, "SESSION_CONFLICT", str(exc))
    if isinstance(exc, (ModelRateLimitError, EmbeddingRateLimitError)):
        return _error(429, "PROVIDER_RATE_LIMIT", "The AI provider is busy. Try again later.", {"Retry-After": "60"})
    if isinstance(exc, ModelTimeoutError):
        return _error(504, "MODEL_TIMEOUT", str(exc))
    if isinstance(exc, (MissingCredentialsError, EmbeddingConfigurationError, SessionCapacityError)):
        return _error(503, "SERVICE_UNAVAILABLE", "The assistant is temporarily unavailable.")
    if isinstance(exc, (ModelConnectionError, KnowledgeError)):
        return _error(503, "SERVICE_UNAVAILABLE", str(exc))
    if isinstance(exc, (ModelAuthenticationError, InvalidModelConfigurationError, EmptyModelResponseError, ModelServiceError)):
        return _error(502, "UPSTREAM_ERROR", str(exc))
    logger.error("Unmapped application error: %s", type(exc).__name__)
    return _error(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(AIEngineError, application_exception_handler)
    app.add_exception_handler(KnowledgeError, application_exception_handler)
    app.add_exception_handler(SessionError, application_exception_handler)
    app.add_exception_handler(ChatLimitExceeded, application_exception_handler)
    app.add_exception_handler(Exception, unexpected_exception_handler)
