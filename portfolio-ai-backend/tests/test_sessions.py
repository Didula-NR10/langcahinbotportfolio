from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError
from langchain_core.messages import AIMessage, HumanMessage

from app.core.config import Settings
from app.services.session_service import (
    SessionCapacityError, SessionConflictError, SessionExpiredError, SessionNotFoundError, SessionService,
)


def make_sessions(**overrides):
    now = [datetime(2026, 1, 1, tzinfo=timezone.utc)]
    settings = Settings(_env_file=None, app_environment="testing", **overrides)
    return SessionService(settings, clock=lambda: now[0]), now


def test_unique_sessions_and_isolated_ordered_history():
    sessions, _ = make_sessions()
    first = sessions.begin()
    second = sessions.begin()
    assert first.session_id != second.session_id
    assert len(first.session_id) >= 32
    sessions.complete(first, "First question", "First answer", "general")
    sessions.complete(second, "Other question", "Other answer", "direct_context")
    continued = sessions.begin(first.session_id)
    assert [type(item) for item in continued.history] == [HumanMessage, AIMessage]
    assert [item.content for item in continued.history] == ["First question", "First answer"]
    assert "Other question" not in [item.content for item in continued.history]
    sessions.abort(continued)


def test_history_trims_complete_exchanges():
    sessions, _ = make_sessions(CHAT_MAX_HISTORY_MESSAGES=4, CHAT_MAX_HISTORY_CHARS=100)
    turn = sessions.begin()
    session_id = turn.session_id
    for number in range(4):
        sessions.complete(turn, f"Question {number}", f"Answer {number}", "general")
        if number < 3:
            turn = sessions.begin(session_id)
    assert [message.content for message in sessions.history(session_id)] == [
        "Question 2", "Answer 2", "Question 3", "Answer 3"
    ]


def test_expiration_cleanup_and_active_request_protection():
    sessions, now = make_sessions(CHAT_SESSION_TTL_MINUTES=1)
    active = sessions.begin()
    old = sessions.begin()
    sessions.complete(old, "Question", "Answer", "general")
    now[0] += timedelta(minutes=2)
    assert sessions.cleanup() == 1
    with pytest.raises(SessionNotFoundError):
        sessions.begin(old.session_id)
    with pytest.raises(SessionConflictError):
        sessions.begin(active.session_id)
    sessions.complete(active, "Still working", "Done", "general")
    continued = sessions.begin(active.session_id)
    sessions.abort(continued)


def test_expired_id_reports_expiration():
    sessions, now = make_sessions(CHAT_SESSION_TTL_MINUTES=1)
    turn = sessions.begin()
    sessions.complete(turn, "Question", "Answer", "general")
    now[0] += timedelta(minutes=2)
    with pytest.raises(SessionExpiredError):
        sessions.begin(turn.session_id)


def test_capacity_and_failed_new_session_cleanup():
    sessions, _ = make_sessions(CHAT_MAX_ACTIVE_SESSIONS=1)
    first = sessions.begin()
    with pytest.raises(SessionCapacityError):
        sessions.begin()
    sessions.abort(first)
    replacement = sessions.begin()
    assert replacement.session_id != first.session_id
    sessions.abort(replacement)


def test_same_session_conflicts_while_other_session_can_start():
    sessions, _ = make_sessions()
    first = sessions.begin()
    with pytest.raises(SessionConflictError):
        sessions.begin(first.session_id)
    second = sessions.begin()
    sessions.complete(second, "Other", "Answer", "general")
    sessions.abort(first)


@pytest.mark.parametrize("overrides", [
    {"CHAT_MAX_MESSAGE_LENGTH": 0},
    {"CHAT_MAX_HISTORY_MESSAGES": 3},
    {"CHAT_MAX_HISTORY_CHARS": 0},
    {"CHAT_SESSION_TTL_MINUTES": 0},
    {"CHAT_MAX_ACTIVE_SESSIONS": 0},
])
def test_invalid_chat_limits_rejected(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)
