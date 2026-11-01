"""Interactive, manual AI engine check: python -m scripts.test_ai_engine."""

import asyncio

from app.ai.errors import AIEngineError
from app.services.ai_service import get_ai_service


async def main() -> None:
    print("Portfolio AI - Engine Test")
    print("Enter a question, or type 'exit' to quit.")
    while True:
        try:
            question = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if question.lower() in {"exit", "quit"}:
            break
        try:
            result = await get_ai_service().generate_response(question)
            print(f"\nAI: {result.answer}")
        except AIEngineError as exc:
            print(f"\nError: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
