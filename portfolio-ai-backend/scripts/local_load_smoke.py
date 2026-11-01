"""Small, provider-free admission and latency smoke test."""

import asyncio
import statistics
import time
import tracemalloc
from collections import Counter

import httpx

from app.core.config import Settings
from app.main import create_app
from app.schemas.ai_schema import KnowledgeAnswer
from app.services.chat_service import ChatService


class MockKnowledge:
    async def answer(self, _question, mode="auto", history=None):
        await asyncio.sleep(0.05)
        return KnowledgeAnswer(answer="Mocked answer", model="mock", mode="general", sources=[])


async def main():
    settings = Settings(_env_file=None, app_environment="testing", RATE_LIMIT_REQUESTS_PER_MINUTE=100,
                        RATE_LIMIT_REQUESTS_PER_HOUR=100, GLOBAL_REQUESTS_PER_MINUTE=100,
                        MAX_CONCURRENT_CHAT_REQUESTS=4)
    app = create_app(settings)
    app.state.chat_service = ChatService(settings, app.state.sessions, MockKnowledge())
    tracemalloc.start()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        async def send_one():
            start = time.perf_counter()
            response = await client.post("/api/v1/chat", json={"message": "A mocked question"})
            return response.status_code, (time.perf_counter() - start) * 1000

        results = await asyncio.gather(*(send_one() for _ in range(20)))
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    counts = Counter(status for status, _ in results)
    latencies = [latency for _, latency in results]
    print(f"requests=20 status_counts={dict(counts)} p50_ms={statistics.median(latencies):.1f} "
          f"max_ms={max(latencies):.1f} peak_traced_kib={peak / 1024:.1f} "
          f"sessions={len(app.state.sessions._sessions)}")
    assert counts[200] > 0 and counts[429] > 0
    assert app.state.chat_limiter.active == 0


if __name__ == "__main__":
    asyncio.run(main())
