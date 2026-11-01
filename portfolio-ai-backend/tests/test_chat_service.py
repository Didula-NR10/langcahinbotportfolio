import asyncio

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.ai.errors import ModelTimeoutError
from app.core.config import Settings
from app.schemas.ai_schema import KnowledgeAnswer, SourceReference
from app.services.chat_service import ChatService
from app.services.session_service import SessionConflictError, SessionService


class FakeKnowledge:
    def __init__(self):
        self.calls = []

    async def answer(self, question, mode="auto", history=None):
        self.calls.append((question, mode, list(history or [])))
        actual_mode = "direct_context" if "developer" in question or mode == "direct_context" else "general"
        sources = [SourceReference(document="projects.md", category="projects")] if actual_mode == "direct_context" else []
        return KnowledgeAnswer(answer=f"Answer to {question}", model="test-model", mode=actual_mode, sources=sources)


def make_chat(knowledge=None, **overrides):
    settings = Settings(_env_file=None, app_environment="testing", **overrides)
    sessions = SessionService(settings)
    knowledge = knowledge or FakeKnowledge()
    return ChatService(settings, sessions, knowledge), knowledge


def test_multiturn_followup_passes_history_and_mode():
    chat, knowledge = make_chat()
    first = asyncio.run(chat.chat("What projects has this developer completed?"))
    second = asyncio.run(chat.chat("Which technologies were used in the first one?", first.session_id))
    assert first.mode == second.mode == "direct_context"
    assert second.session_id == first.session_id
    assert [type(message) for message in knowledge.calls[1][2]] == [HumanMessage, AIMessage]
    assert knowledge.calls[1][1] == "direct_context"
    assert [message.content for message in chat.sessions.history(first.session_id)][-2:] == [
        "Which technologies were used in the first one?", second.answer
    ]


def test_general_and_portfolio_responses_keep_correct_sources():
    chat, _ = make_chat()
    general = asyncio.run(chat.chat("Explain Docker"))
    portfolio = asyncio.run(chat.chat("What does the developer build?"))
    assert general.mode == "general" and general.sources == []
    assert portfolio.mode == "direct_context"
    assert portfolio.sources[0].document == "projects.md"


def test_failed_new_request_does_not_leave_session():
    class FailingKnowledge:
        async def answer(self, *args, **kwargs):
            raise ModelTimeoutError("The model request timed out.")

    chat, _ = make_chat(FailingKnowledge(), CHAT_MAX_ACTIVE_SESSIONS=1)
    with pytest.raises(ModelTimeoutError):
        asyncio.run(chat.chat("Explain Docker"))
    assert len(chat.sessions._sessions) == 0


def test_overlapping_turns_conflict_but_other_sessions_proceed():
    async def exercise():
        started = asyncio.Event()
        release = asyncio.Event()

        class SlowKnowledge(FakeKnowledge):
            async def answer(self, question, mode="auto", history=None):
                if question == "Slow turn":
                    started.set()
                    await release.wait()
                return await super().answer(question, mode, history)

        chat, _ = make_chat(SlowKnowledge())
        initial = await chat.chat("Explain Docker")
        slow = asyncio.create_task(chat.chat("Slow turn", initial.session_id))
        await started.wait()
        with pytest.raises(SessionConflictError):
            await chat.chat("Overlapping turn", initial.session_id)
        other = await chat.chat("Another visitor")
        assert other.session_id != initial.session_id
        release.set()
        await slow
        assert len(chat.sessions.history(initial.session_id)) == 4

    asyncio.run(exercise())
