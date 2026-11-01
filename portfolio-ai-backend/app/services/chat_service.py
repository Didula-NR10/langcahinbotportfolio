from app.ai.conversation import is_follow_up
from langsmith import Client, tracing_context
from app.ai.errors import InvalidQuestionError
from app.core.config import Settings
from app.schemas.chat_schema import ChatResponse
from app.services.knowledge_ai_service import KnowledgeAIService
from app.services.session_service import SessionService


class ChatService:
    def __init__(self, settings: Settings, sessions: SessionService, knowledge: KnowledgeAIService):
        self.settings = settings
        self.sessions = sessions
        self.knowledge = knowledge
        self.tracing_client = (
            Client(
                api_key=settings.langsmith_api_key.get_secret_value(),
                hide_inputs=not settings.langsmith_include_conversation_data,
                hide_outputs=not settings.langsmith_include_conversation_data,
            )
            if settings.langsmith_tracing else None
        )

    async def chat(self, message: str, session_id: str | None = None) -> ChatResponse:
        if not isinstance(message, str) or not message.strip():
            raise InvalidQuestionError("Message must contain text.")
        message = message.strip()
        if len(message) > min(self.settings.chat_max_message_length, self.settings.llm_max_question_chars):
            raise InvalidQuestionError("Message exceeds the configured length limit.")

        turn = self.sessions.begin(session_id)
        completed = False
        try:
            mode = turn.last_mode if turn.last_mode and is_follow_up(message, turn.history) else "auto"
            with tracing_context(
                enabled=self.settings.langsmith_tracing,
                project_name=self.settings.langsmith_project,
                client=self.tracing_client,
            ):
                answer = await self.knowledge.answer(message, mode=mode, history=list(turn.history))
            self.sessions.complete(turn, message, answer.answer, answer.mode)
            completed = True
            return ChatResponse(
                answer=answer.answer,
                session_id=turn.session_id,
                mode=answer.mode,
                sources=answer.sources,
            )
        finally:
            if not completed:
                self.sessions.abort(turn)
