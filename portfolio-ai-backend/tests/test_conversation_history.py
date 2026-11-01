import asyncio

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableLambda

from app.ai.chains import build_chain, build_portfolio_chain
from app.ai.conversation import contextualize_retrieval_query
from app.core.config import Settings
from app.schemas.ai_schema import AIResult
from app.services.ai_service import AIService
from app.services.knowledge_ai_service import KnowledgeAIService
from app.services.knowledge_service import KnowledgeService
from langchain_core.documents import Document


def test_general_prompt_preserves_roles_and_current_message_once():
    captured = []

    async def model(messages):
        captured.extend(messages.to_messages())
        return AIMessage(content="Answer")

    service = AIService(Settings(_env_file=None), build_chain(RunnableLambda(model)))
    history = [HumanMessage(content="Explain Python"), AIMessage(content="Python is a language.")]
    asyncio.run(service.generate_response("How is it used?", history=history))
    assert [type(item) for item in captured] == [SystemMessage, HumanMessage, AIMessage, HumanMessage]
    assert [item.content for item in captured].count("How is it used?") == 1


def test_portfolio_prompt_preserves_history_and_context():
    captured = []

    async def model(messages):
        captured.extend(messages.to_messages())
        return AIMessage(content="Verified answer")

    service = AIService(
        Settings(_env_file=None),
        build_chain(RunnableLambda(model)),
        build_portfolio_chain(RunnableLambda(model)),
    )
    history = [HumanMessage(content="What projects?"), AIMessage(content="A weather app.")]
    asyncio.run(service.generate_grounded("Which technologies did it use?", "Python app", history=history))
    assert [type(item) for item in captured] == [SystemMessage, HumanMessage, AIMessage, HumanMessage]
    assert "Python app" in captured[-1].content
    assert "Which technologies did it use?" not in str(captured[:-1])


def test_rag_followup_retrieval_uses_recent_topic_without_extra_model_call(tmp_path):
    class FakeRetriever:
        def __init__(self):
            self.query = None

        async def retrieve(self, query):
            self.query = query
            return [Document(page_content="Weather app uses Python.", metadata={"source": "projects.md", "category": "projects"})]

    class FakeAI:
        def __init__(self):
            self.calls = []

        async def generate_grounded(self, question, context, history=None):
            self.calls.append((question, context, history))
            return AIResult(answer="It uses Python.", model="test-model")

    history = [HumanMessage(content="What projects has the developer built?"), AIMessage(content="A weather app.")]
    retriever = FakeRetriever()
    ai = FakeAI()
    settings = Settings(_env_file=None, KNOWLEDGE_PATH=str(tmp_path))
    service = KnowledgeAIService(settings, ai, KnowledgeService(tmp_path), retriever)
    result = asyncio.run(service.answer("Which technologies did that project use?", mode="rag", history=history))
    assert result.mode == "rag"
    assert result.sources[0].document == "projects.md"
    assert "weather app" in retriever.query.lower()
    assert ai.calls[0][0] == "Which technologies did that project use?"
    assert ai.calls[0][2] == history
    assert len(ai.calls) == 1
    assert contextualize_retrieval_query("Explain Kubernetes", history) == "Explain Kubernetes"
