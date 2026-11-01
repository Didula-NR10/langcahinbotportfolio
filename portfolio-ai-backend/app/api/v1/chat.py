from fastapi import APIRouter, Request

from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.schemas.common import ErrorResponse

router = APIRouter(tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={code: {"model": ErrorResponse} for code in (404, 409, 422, 429, 502, 503, 504)},
    summary="Send a chat message",
    description=(
        "Omit session_id to start a session; reuse the returned ID for follow-up messages. "
        "Sessions expire after inactivity. Sources identify documents supplied to a knowledge answer."
    ),
)
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    limiter = request.app.state.chat_limiter
    limiter.acquire(request.client.host if request.client else "unknown")
    try:
        return await request.app.state.chat_service.chat(body.message, body.session_id)
    finally:
        limiter.release()
