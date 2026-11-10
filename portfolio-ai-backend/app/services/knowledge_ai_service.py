import re
from functools import lru_cache

from langchain_core.messages import BaseMessage

from app.ai.conversation import contextualize_retrieval_query
from app.ai.errors import InvalidQuestionError
from app.ai.retriever import KnowledgeRetriever
from app.core.config import Settings, get_settings
from app.knowledge.context import build_context, relevant_documents
from app.schemas.ai_schema import KnowledgeAnswer
from app.services.ai_service import AIService, create_ai_service, get_ai_service
from app.services.knowledge_service import KnowledgeService

NO_VERIFIED_INFO = "I don't have verified portfolio information to answer that question."
PERSONAL_REFERENCE = re.compile(
    r"\b(?:developer|portfolio owner|candidate|their|them|they|he|him|his|she|her|you|your|"
    r"my|mine)\b",
    re.IGNORECASE,
)
GENERAL_FORM = re.compile(
    r"^(?:what|why|how|when|where|explain|define|compare|describe|is|are|can|does|do)\b",
    re.IGNORECASE,
)
PORTFOLIO_TOPIC_QUERY = re.compile(
    r"^(?:what|which|list|show|describe|tell me about)\b.*\b(?:projects|qualifications|certifications|experience|education)\b",
    re.IGNORECASE,
)
PORTFOLIO_ENTITY = re.compile(
    r"\b(?:didula|tripsmart|golden treat|the last run|rawana|raawana|numberbound|hi\.?ch|"
    r"flagguessingapp|smart restaurant 360|manufacturing erp|salesman tracking|"
    r"student performance tracking)\b",
    re.IGNORECASE,
)


class KnowledgeAIService:
    def __init__(
        self,
        settings: Settings,
        ai_service: AIService | None,
        knowledge_service: KnowledgeService,
        retriever: KnowledgeRetriever | None = None,
    ):
        self.settings = settings
        self.ai_service = ai_service
        self.knowledge_service = knowledge_service
        self.retriever = retriever

    def _ai(self) -> AIService:
        if self.ai_service is None:
            self.ai_service = get_ai_service() if self.settings is get_settings() else create_ai_service(self.settings)
        return self.ai_service

    async def answer(self, question: str, mode: str = "auto", history: list[BaseMessage] | None = None) -> KnowledgeAnswer:
        if not isinstance(question, str) or not question.strip():
            raise InvalidQuestionError("Question must contain text.")
        question = question.strip()
        if len(question) > self.settings.llm_max_question_chars:
            raise InvalidQuestionError("Question exceeds the configured length limit.")
        if mode not in {"auto", "general", "direct_context", "rag"}:
            raise ValueError("Unknown knowledge mode.")
        history = list(history or [])
        if mode == "auto":
            if GENERAL_FORM.search(question) and not PERSONAL_REFERENCE.search(question) and not PORTFOLIO_TOPIC_QUERY.search(question) and not PORTFOLIO_ENTITY.search(question):
                mode = "general"
            else:
                mode = self.settings.knowledge_mode

        if mode == "general":
            result = await self._ai().generate_response(question, history=history) if history else await self._ai().generate_response(question)
            return KnowledgeAnswer(**result.model_dump(), mode="general", sources=[])

        retrieval_query = contextualize_retrieval_query(question, history)
        if mode == "direct_context":
            documents = relevant_documents(retrieval_query, self.knowledge_service.load_documents())
        else:
            if self.retriever is None:
                from app.ai.embeddings import create_embeddings

                self.retriever = KnowledgeRetriever(self.settings, create_embeddings(self.settings))
            documents = await self.retriever.retrieve(retrieval_query)
            if self.settings.admin_knowledge_enabled:
                documents.extend(relevant_documents(retrieval_query, self.knowledge_service.load_documents()))

        if not documents:
            return KnowledgeAnswer(answer=NO_VERIFIED_INFO, model=self.settings.groq_model, mode=mode, sources=[])
        context, sources = build_context(documents, self.settings.rag_max_context_chars)
        result = await self._ai().generate_grounded(question, context, history=history) if history else await self._ai().generate_grounded(question, context)
        return KnowledgeAnswer(**result.model_dump(), mode=mode, sources=sources)


def get_knowledge_ai_service(settings: Settings | None = None) -> KnowledgeAIService:
    if settings is None:
        return _get_default_knowledge_ai_service()
    return KnowledgeAIService(settings, None, KnowledgeService(settings.knowledge_path))


@lru_cache
def _get_default_knowledge_ai_service() -> KnowledgeAIService:
    settings = get_settings()
    return KnowledgeAIService(settings, None, KnowledgeService(settings.knowledge_path))
