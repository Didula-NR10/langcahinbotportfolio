import asyncio

import pytest
from langchain_core.documents import Document

from app.core.config import Settings
from app.knowledge.context import build_context
from app.knowledge.errors import ContextLimitError
from app.schemas.ai_schema import AIResult
from app.services.knowledge_ai_service import KnowledgeAIService, NO_VERIFIED_INFO, get_knowledge_ai_service
from app.services.knowledge_service import KnowledgeService


class FakeAI:
    def __init__(self):
        self.calls = []

    async def generate_response(self, question):
        self.calls.append(("general", question))
        return AIResult(answer="A general technical answer.", model="test-model")

    async def generate_grounded(self, question, context):
        self.calls.append(("grounded", question, context))
        return AIResult(answer="A grounded portfolio answer.", model="test-model")


class FakeRetriever:
    def __init__(self, docs):
        self.docs = docs

    async def retrieve(self, _question):
        return self.docs


def make_service(tmp_path, ai=None, retriever=None, **overrides):
    settings = Settings(_env_file=None, app_environment="testing", KNOWLEDGE_PATH=str(tmp_path), **overrides)
    return KnowledgeAIService(settings, ai or FakeAI(), KnowledgeService(tmp_path), retriever)


def test_general_question_uses_existing_ai_engine(tmp_path):
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai).answer("What is the difference between Docker and Kubernetes?"))
    assert answer.mode == "general"
    assert answer.sources == []
    assert ai.calls == [("general", "What is the difference between Docker and Kubernetes?")]


def test_generic_project_question_stays_general(tmp_path):
    answer = asyncio.run(make_service(tmp_path).answer("What is a Python project?"))
    assert answer.mode == "general"


def test_implicit_portfolio_project_question_uses_knowledge(tmp_path):
    answer = asyncio.run(make_service(tmp_path).answer("What projects have been completed?"))
    assert answer.mode == "direct_context"


def test_direct_context_uses_verified_source(tmp_path):
    (tmp_path / "projects.md").write_text("# Projects\nBuilt a Python weather app.", encoding="utf-8")
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai).answer("What projects has the developer built?"))
    assert answer.mode == "direct_context"
    assert answer.sources[0].document == "projects.md"
    assert "Python weather app" in ai.calls[0][2]


def test_unknown_personal_fact_abstains(tmp_path):
    (tmp_path / "projects.md").write_text("# Projects\nBuilt a Python weather app.", encoding="utf-8")
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai).answer("What is the developer's GPA?"))
    assert answer.answer == NO_VERIFIED_INFO
    assert answer.sources == []
    assert ai.calls == []


def test_missing_verified_knowledge_abstains(tmp_path):
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai).answer("What projects has the developer built?"))
    assert answer.mode == "direct_context"
    assert answer.answer == NO_VERIFIED_INFO
    assert ai.calls == []


def test_empty_knowledge_does_not_initialize_provider_clients(tmp_path):
    settings = Settings(
        _env_file=None,
        app_environment="testing",
        KNOWLEDGE_PATH=str(tmp_path),
        GROQ_API_KEY="",
        EMBEDDING_API_KEY="",
    )
    answer = asyncio.run(get_knowledge_ai_service(settings).answer("What projects has the developer built?"))
    assert answer.answer == NO_VERIFIED_INFO


def test_ambiguous_question_takes_knowledge_path(tmp_path):
    answer = asyncio.run(make_service(tmp_path).answer("Tell me more about them"))
    assert answer.mode == "direct_context"


def test_rag_mode_uses_retrieved_sources(tmp_path):
    doc = Document(page_content="Built a Python app.", metadata={"source": "projects.md", "category": "projects"})
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai, FakeRetriever([doc])).answer("What projects?", mode="rag"))
    assert answer.mode == "rag"
    assert [source.document for source in answer.sources] == ["projects.md"]
    assert "Built a Python app" in ai.calls[0][2]


def test_empty_rag_retrieval_abstains(tmp_path):
    ai = FakeAI()
    answer = asyncio.run(make_service(tmp_path, ai, FakeRetriever([])).answer("What projects?", mode="rag"))
    assert answer.mode == "rag"
    assert answer.sources == []
    assert ai.calls == []


def test_context_budget_enforced():
    docs = [Document(page_content="x" * 500, metadata={"source": "projects.md", "category": "projects"})]
    context, sources = build_context(docs, 100)
    assert len(context) <= 100
    assert sources[0].document == "projects.md"
    with pytest.raises(ContextLimitError):
        build_context(docs, 10)
