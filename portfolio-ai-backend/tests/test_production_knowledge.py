import asyncio

from app.core.config import Settings
from app.schemas.ai_schema import AIResult
from app.services.knowledge_ai_service import KnowledgeAIService, NO_VERIFIED_INFO
from app.services.knowledge_service import KnowledgeService


class CapturingAI:
    def __init__(self):
        self.context = None

    async def generate_grounded(self, question, context, history=None):
        self.context = context
        return AIResult(answer="The first project uses Expo and FastAPI.", model="test-model")


def test_published_projects_are_available_and_unknown_gpa_is_not_invented():
    settings = Settings(_env_file=None, app_environment="testing")
    ai = CapturingAI()
    service = KnowledgeAIService(settings, ai, KnowledgeService("app/knowledge"))
    project = asyncio.run(service.answer("What projects has this developer completed?"))
    assert project.mode == "direct_context"
    assert "TripSmart" in ai.context
    assert project.sources[0].document == "projects.md"

    ai.context = None
    unknown = asyncio.run(service.answer("What is the developer's GPA?"))
    assert unknown.answer == NO_VERIFIED_INFO
    assert unknown.sources == []
    assert ai.context is None
