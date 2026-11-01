"""Bounded, single-process conversation sessions."""

import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Callable, Literal

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from app.core.config import Settings


class SessionError(Exception):
    pass


class SessionNotFoundError(SessionError):
    pass


class SessionExpiredError(SessionError):
    pass


class SessionConflictError(SessionError):
    pass


class SessionCapacityError(SessionError):
    pass


@dataclass
class SessionRecord:
    session_id: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    history: list[BaseMessage] = field(default_factory=list)
    last_mode: Literal["general", "direct_context", "rag"] | None = None
    busy: bool = False


@dataclass(frozen=True)
class SessionTurn:
    record: SessionRecord
    is_new: bool
    history: tuple[BaseMessage, ...]
    last_mode: Literal["general", "direct_context", "rag"] | None

    @property
    def session_id(self) -> str:
        return self.record.session_id


class SessionService:
    def __init__(self, settings: Settings, clock: Callable[[], datetime] | None = None):
        self._settings = settings
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._sessions: dict[str, SessionRecord] = {}
        self._lock = RLock()
        self._ttl = timedelta(minutes=settings.chat_session_ttl_minutes)

    def _refresh(self, record: SessionRecord, now: datetime) -> None:
        record.last_activity = now
        record.expires_at = now + self._ttl

    def _cleanup_locked(self, now: datetime) -> int:
        expired = [key for key, record in self._sessions.items() if not record.busy and record.expires_at <= now]
        for key in expired:
            del self._sessions[key]
        return len(expired)

    def cleanup(self) -> int:
        with self._lock:
            return self._cleanup_locked(self._clock())

    def begin(self, session_id: str | None = None) -> SessionTurn:
        with self._lock:
            now = self._clock()
            if session_id is None:
                self._cleanup_locked(now)
                if len(self._sessions) >= self._settings.chat_max_active_sessions:
                    raise SessionCapacityError("The chat service is at session capacity. Try again later.")
                session_id = secrets.token_urlsafe(32)
                while session_id in self._sessions:
                    session_id = secrets.token_urlsafe(32)
                record = SessionRecord(session_id, now, now, now + self._ttl, busy=True)
                self._sessions[session_id] = record
                return SessionTurn(record, True, (), None)

            record = self._sessions.get(session_id)
            if record is None:
                raise SessionNotFoundError("Chat session was not found. Start a new conversation.")
            if not record.busy and record.expires_at <= now:
                del self._sessions[session_id]
                raise SessionExpiredError("Chat session expired. Start a new conversation.")
            if record.busy:
                raise SessionConflictError("Another message is already being processed for this session.")
            self._cleanup_locked(now)
            record.busy = True
            self._refresh(record, now)
            return SessionTurn(record, False, tuple(record.history), record.last_mode)

    def complete(self, turn: SessionTurn, user_message: str, answer: str, mode: Literal["general", "direct_context", "rag"]) -> None:
        with self._lock:
            record = self._sessions.get(turn.session_id)
            if record is not turn.record or not record.busy:
                raise SessionConflictError("Chat session changed during processing.")
            record.history.extend([HumanMessage(content=user_message), AIMessage(content=answer)])
            while len(record.history) > self._settings.chat_max_history_messages or sum(len(str(message.content)) for message in record.history) > self._settings.chat_max_history_chars:
                del record.history[:2]
            record.last_mode = mode
            self._refresh(record, self._clock())
            record.busy = False

    def abort(self, turn: SessionTurn) -> None:
        with self._lock:
            record = self._sessions.get(turn.session_id)
            if record is not turn.record:
                return
            if turn.is_new:
                del self._sessions[turn.session_id]
            else:
                self._refresh(record, self._clock())
                record.busy = False

    def history(self, session_id: str) -> tuple[BaseMessage, ...]:
        with self._lock:
            record = self._sessions.get(session_id)
            if record is None:
                raise SessionNotFoundError("Chat session was not found. Start a new conversation.")
            return tuple(record.history)

    def close(self) -> None:
        with self._lock:
            self._sessions.clear()
