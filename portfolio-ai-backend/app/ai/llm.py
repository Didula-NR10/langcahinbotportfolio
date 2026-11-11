from functools import lru_cache

from langchain_groq import ChatGroq

from app.ai.errors import InvalidModelConfigurationError, MissingCredentialsError
from app.core.config import Settings, get_settings


def create_llm(settings: Settings) -> ChatGroq:
    key = settings.groq_api_key
    if key is None or not key.get_secret_value().strip():
        raise MissingCredentialsError("Set GROQ_API_KEY before using the AI engine.")

    is_reasoning_model = settings.groq_model.startswith("openai/gpt-oss-")
    try:
        return ChatGroq(
            model=settings.groq_model,
            api_key=key,
            temperature=settings.llm_temperature,
            max_tokens=max(settings.llm_max_output_tokens, 2048) if is_reasoning_model else settings.llm_max_output_tokens,
            **({"reasoning_effort": "low"} if is_reasoning_model else {}),
            timeout=settings.llm_timeout_seconds,
            max_retries=settings.llm_max_retries,
        )
    except (ValueError, TypeError) as exc:
        raise InvalidModelConfigurationError("Invalid Groq model configuration.") from exc


@lru_cache
def get_llm() -> ChatGroq:
    return create_llm(get_settings())
