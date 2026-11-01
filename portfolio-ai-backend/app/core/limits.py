"""Bounded, process-local admission controls for the public chat API."""

import hashlib
import hmac
import math
import secrets
import time
from collections import deque
from threading import Lock

from app.core.config import Settings


class ChatLimitExceeded(Exception):
    def __init__(self, retry_after: int):
        super().__init__("Chat capacity is temporarily unavailable.")
        self.retry_after = max(1, retry_after)


class ChatLimiter:
    def __init__(self, settings: Settings, clock=None):
        self.settings = settings
        self._clock = clock or time.monotonic
        self._salt = secrets.token_bytes(32)
        self._lock = Lock()
        self._clients: dict[bytes, deque[float]] = {}
        self._global: deque[float] = deque()
        self._active = 0

    def _identity(self, client_host: str) -> bytes:
        return hmac.new(self._salt, client_host.encode("utf-8"), hashlib.sha256).digest()

    def acquire(self, client_host: str) -> None:
        now = self._clock()
        identity = self._identity(client_host)
        with self._lock:
            for key, events in list(self._clients.items()):
                while events and events[0] <= now - 3600:
                    events.popleft()
                if not events:
                    del self._clients[key]
            while self._global and self._global[0] <= now - 60:
                self._global.popleft()

            events = self._clients.get(identity)
            if events is not None:
                minute_events = [stamp for stamp in events if stamp > now - 60]
                if len(minute_events) >= self.settings.rate_limit_requests_per_minute:
                    raise ChatLimitExceeded(math.ceil(60 - (now - minute_events[0])))
                if len(events) >= self.settings.rate_limit_requests_per_hour:
                    raise ChatLimitExceeded(math.ceil(3600 - (now - events[0])))
            if len(self._global) >= self.settings.global_requests_per_minute:
                raise ChatLimitExceeded(math.ceil(60 - (now - self._global[0])))
            if self._active >= self.settings.max_concurrent_chat_requests:
                raise ChatLimitExceeded(1)

            if events is None:
                events = deque()
                self._clients[identity] = events
            events.append(now)
            self._global.append(now)
            self._active += 1

    def release(self) -> None:
        with self._lock:
            self._active -= 1

    @property
    def active(self) -> int:
        with self._lock:
            return self._active
