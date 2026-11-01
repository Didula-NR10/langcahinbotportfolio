"""Verify Supabase Auth JWTs and a server-managed administrator allowlist."""

from functools import lru_cache
import asyncio
from uuid import UUID

import jwt
from fastapi import HTTPException, Request
from starlette.responses import JSONResponse
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError


@lru_cache(maxsize=8)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_jwk_set=True, lifespan=300, timeout=5)


def verify_admin_token(token: str, settings) -> UUID:
    if not token or len(token) > 8192:
        raise HTTPException(401, "Invalid administrator token.")
    try:
        key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token, key.key, algorithms=["RS256", "ES256", "EdDSA"],
            audience="authenticated", issuer=f"{settings.supabase_url.rstrip('/')}/auth/v1",
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            leeway=30,
        )
        user_id = UUID(claims["sub"])
    except PyJWKClientConnectionError as exc:
        raise HTTPException(503, "Administrator authentication is temporarily unavailable.") from exc
    except (jwt.PyJWTError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(401, "Invalid administrator token.") from exc
    except Exception as exc:
        raise HTTPException(503, "Administrator authentication is temporarily unavailable.") from exc
    if claims.get("role") != "authenticated" or user_id not in settings.admin_user_ids:
        raise HTTPException(403, "Administrator access required.")
    return user_id


def require_admin(request: Request) -> UUID:
    if hasattr(request.state, "admin_user_id"):
        return request.state.admin_user_id
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Administrator authentication required.", headers={"WWW-Authenticate": "Bearer"})
    return verify_admin_token(token.strip(), request.app.state.settings)


class AdminAuthMiddleware:
    def __init__(self, app, settings):
        self.app = app
        self.settings = settings

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/v1/admin/") or scope["method"] == "OPTIONS":
            await self.app(scope, receive, send)
            return
        authorizations = [value for name, value in scope.get("headers", []) if name.lower() == b"authorization"]
        if len(authorizations) != 1:
            response = JSONResponse(status_code=401, content={"error": {"code": "UNAUTHORIZED", "message": "Administrator authentication required."}})
            await response(scope, receive, send)
            return
        authorization = authorizations[0].decode("ascii", errors="ignore")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            response = JSONResponse(status_code=401, content={"error": {"code": "UNAUTHORIZED", "message": "Administrator authentication required."}})
            await response(scope, receive, send)
            return
        try:
            user_id = await asyncio.to_thread(verify_admin_token, token.strip(), self.settings)
        except HTTPException as exc:
            code = "FORBIDDEN" if exc.status_code == 403 else "SERVICE_UNAVAILABLE" if exc.status_code == 503 else "UNAUTHORIZED"
            response = JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": str(exc.detail)}})
            await response(scope, receive, send)
            return
        scope.setdefault("state", {})["admin_user_id"] = user_id
        await self.app(scope, receive, send)
