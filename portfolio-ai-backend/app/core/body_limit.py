"""Reject oversized chat JSON before parsing or invoking application services."""

from starlette.responses import JSONResponse


class ChatBodyLimitMiddleware:
    def __init__(self, app, max_bytes: int, path: str = "/api/v1/chat", path_prefix: bool = False):
        self.app = app
        self.max_bytes = max_bytes
        self.path = path
        self.path_prefix = path_prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        matches = scope["path"].startswith(self.path) if self.path_prefix else scope["path"] == self.path
        if not matches or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        async def reject():
            response = JSONResponse(
                status_code=413,
                content={"error": {"code": "REQUEST_TOO_LARGE", "message": "Request body is too large."}},
            )
            await response(scope, receive, send)

        headers = dict(scope.get("headers", []))
        try:
            if int(headers.get(b"content-length", b"0")) > self.max_bytes:
                await reject()
                return
        except ValueError:
            pass

        chunks = []
        size = 0
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunks.append(event)
            size += len(event.get("body", b""))
            if size > self.max_bytes:
                await reject()
                return
            if not event.get("more_body", False):
                break

        async def replay():
            if chunks:
                return chunks.pop(0)
            return await receive()

        await self.app(scope, replay, send)
