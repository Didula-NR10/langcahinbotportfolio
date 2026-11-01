import logging
from functools import lru_cache

from groq import APIConnectionError, APITimeoutError, AuthenticationError, NotFoundError, RateLimitError
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable

from app.ai.chains import build_chain, build_portfolio_chain
from app.ai.errors import (
    AIEngineError,
    InvalidModelConfigurationError,
    InvalidQuestionError,
    ModelAuthenticationError,
    ModelConnectionError,
    ModelRateLimitError,
    ModelServiceError,
    ModelTimeoutError,
)
from app.ai.llm import create_llm, get_llm
from app.core.config import Settings, get_settings
from app.schemas.ai_schema import AIResult

logger = logging.getLogger("portfolio_ai")


class AIService:
    def __init__(self, settings: Settings, chain: Runnable, portfolio_chain: Runnable | None = None):
        self._settings = settings
        self._chain = chain
        self._portfolio_chain = portfolio_chain

    def _validate_question(self, question: str) -> str:
        if not isinstance(question, str) or not question.strip():
            raise InvalidQuestionError("Question must contain text.")
        question = question.strip()
        if len(question) > self._settings.llm_max_question_chars:
            raise InvalidQuestionError("Question exceeds the configured length limit.")
        return question

    async def generate_response(self, question: str, history: list[BaseMessage] | None = None) -> AIResult:
        return await self._invoke(self._chain, {"question": self._validate_question(question), "history": history or []})

    async def generate_grounded(self, question: str, context: str, history: list[BaseMessage] | None = None) -> AIResult:
        if self._portfolio_chain is None:
            raise ModelServiceError("The portfolio model chain is unavailable.")
        if not context.strip():
            raise InvalidQuestionError("Verified portfolio context is required.")
        return await self._invoke(
            self._portfolio_chain, {"question": self._validate_question(question), "context": context, "history": history or []}
        )

    async def _invoke(self, chain: Runnable, inputs: dict) -> AIResult:
        try:
            answer, usage = await chain.ainvoke(inputs)
        except AIEngineError:
            raise
        except AuthenticationError as exc:
            logger.warning("Groq authentication failed")
            raise ModelAuthenticationError("Groq rejected the API credentials.") from exc
        except RateLimitError as exc:
            logger.warning("Groq rate limit reached")
            raise ModelRateLimitError("Groq is rate limiting requests. Try again later.") from exc
        except APITimeoutError as exc:
            logger.warning("Groq request timed out")
            raise ModelTimeoutError("The model request timed out.") from exc
        except APIConnectionError as exc:
            logger.warning("Groq connection failed")
            raise ModelConnectionError("Could not connect to Groq.") from exc
        except NotFoundError as exc:
            logger.error("Configured Groq model was not found")
            raise InvalidModelConfigurationError("The configured Groq model is unavailable.") from exc
        except Exception as exc:
            logger.error("Model request failed: %s", type(exc).__name__)
            raise ModelServiceError("The model service is unavailable.") from exc

        if not isinstance(answer, str) or not answer.strip():
            raise ModelServiceError("The model returned an invalid response.")
        if usage is not None:
            logger.info(
                "Groq token usage: input=%s output=%s total=%s",
                usage.input_tokens, usage.output_tokens, usage.total_tokens,
            )
        answer = answer.strip()
        if len(answer) > self._settings.llm_max_response_chars:
            answer = answer[:self._settings.llm_max_response_chars].rstrip() + "…"
        return AIResult(answer=answer, model=self._settings.groq_model, usage=usage)


@lru_cache
def get_ai_service() -> AIService:
    model = get_llm()
    return AIService(get_settings(), build_chain(model), build_portfolio_chain(model))


def create_ai_service(settings: Settings) -> AIService:
    model = create_llm(settings)
    return AIService(settings, build_chain(model), build_portfolio_chain(model))
