"""Interactive knowledge-mode check: python -m scripts.test_knowledge."""

import asyncio

from app.ai.errors import AIEngineError
from app.core.config import get_settings
from app.knowledge.errors import KnowledgeError
from app.services.knowledge_ai_service import get_knowledge_ai_service


async def main() -> None:
    print("Portfolio AI - Knowledge Test")
    print("Modes: 1 General AI, 2 Direct Context, 3 RAG; type exit to quit.")
    services = {}
    while True:
        try:
            selected = input("\nMode [1/2/3]: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if selected.lower() in {"exit", "quit"}:
            return
        mode = {"1": "general", "2": "direct_context", "3": "rag"}.get(selected)
        if mode is None:
            print("Choose 1, 2, or 3.")
            continue
        question = input("Question: ").strip()
        try:
            if mode not in services:
                settings = get_settings()
                if mode == "rag":
                    settings = settings.model_copy(update={"knowledge_mode": "rag"})
                services[mode] = get_knowledge_ai_service(settings)
            service = services[mode]
            result = await service.answer(question, mode=mode)
            print(f"\nAnswer: {result.answer}\nMode: {result.mode}")
            print("Sources: " + (", ".join(source.document for source in result.sources) or "none"))
        except (AIEngineError, KnowledgeError) as exc:
            print(f"Error: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
