"""Explicit live test: python -m pytest scripts/live_groq_test.py -q."""

import asyncio

import pytest

from app.ai.errors import MissingCredentialsError
from app.services.ai_service import get_ai_service


def test_live_groq_response():
    try:
        service = get_ai_service()
    except MissingCredentialsError:
        pytest.skip("GROQ_API_KEY is not set")
    result = asyncio.run(service.generate_response("Explain REST APIs in one sentence."))
    assert result.answer.strip()
