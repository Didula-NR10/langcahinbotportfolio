import asyncio

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableLambda

from app.ai.chains import build_chain
from app.ai.errors import EmptyModelResponseError, InvalidQuestionError
from app.core.config import Settings
from app.schemas.ai_schema import TokenUsage
from app.services.ai_service import AIService


def settings(**overrides) -> Settings:
    return Settings(_env_file=None, app_environment="testing", **overrides)


def test_chain_formats_input_and_normalizes_response():
    captured = []

    async def model(messages):
        captured.extend(messages.to_messages())
        return AIMessage(
            content="  Python is a programming language.  ",
            usage_metadata={"input_tokens": 12, "output_tokens": 8, "total_tokens": 20},
        )

    service = AIService(settings(), build_chain(RunnableLambda(model)))
    result = asyncio.run(service.generate_response("  What is Python?  "))

    assert isinstance(captured[0], SystemMessage)
    assert isinstance(captured[1], HumanMessage)
    assert captured[1].content == "What is Python?"
    assert result.answer == "Python is a programming language."
    assert result.model == "openai/gpt-oss-20b"
    assert result.usage == TokenUsage(input_tokens=12, output_tokens=8, total_tokens=20)


@pytest.mark.parametrize("question", ["", "  \t  ", None])
def test_empty_question_is_rejected(question):
    service = AIService(settings(), RunnableLambda(lambda _: ("unused", None)))
    with pytest.raises(InvalidQuestionError):
        asyncio.run(service.generate_response(question))


def test_question_length_limit():
    service = AIService(settings(LLM_MAX_QUESTION_CHARS=5), RunnableLambda(lambda _: ("unused", None)))
    with pytest.raises(InvalidQuestionError):
        asyncio.run(service.generate_response("123456"))


def test_empty_model_response():
    service = AIService(settings(), build_chain(RunnableLambda(lambda _: AIMessage(content="  "))))
    with pytest.raises(EmptyModelResponseError):
        asyncio.run(service.generate_response("A question"))


def test_missing_usage_is_not_invented():
    service = AIService(settings(), build_chain(RunnableLambda(lambda _: AIMessage(content=" Answer "))))
    result = asyncio.run(service.generate_response("A question"))
    assert result.answer == "Answer"
    assert result.usage is None


def test_model_output_is_bounded():
    service = AIService(settings(LLM_MAX_RESPONSE_CHARS=100), build_chain(RunnableLambda(lambda _: AIMessage(content="a" * 200))))
    result = asyncio.run(service.generate_response("A question"))
    assert result.answer == "a" * 100 + "…"
