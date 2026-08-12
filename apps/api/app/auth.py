"""
인증 의존성 (v4) — 감사보고서 2.2 해결
=======================================
프로젝트/AI 엔드포인트가 사용자 신원을 확인하도록 한다. 두 가지 신뢰 경로:

  1) 신뢰된 내부 프록시(Next.js): INTERNAL_API_KEY 가 설정되어 있고
     X-Internal-Key 헤더가 일치하면, Next 가 이미 Clerk 세션을 검증했으므로
     X-User-Id 헤더의 사용자 신원을 신뢰한다.
  2) 직접 호출: Authorization: Bearer <Clerk JWT> 를 JWKS 로 검증한다.

둘 다 실패하면 401. 검증된 Clerk user id(sub)를 반환한다.
"""
from __future__ import annotations

import os
import time
from typing import Optional

import httpx
from fastapi import Header, HTTPException
from jose import jwt
from jose.utils import base64url_decode  # noqa: F401  (간접 의존 보장)

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")
CLERK_ISSUER = os.getenv("CLERK_ISSUER", "")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

if not CLERK_JWKS_URL and CLERK_ISSUER:
    CLERK_JWKS_URL = CLERK_ISSUER.rstrip("/") + "/.well-known/jwks.json"

_jwks_cache: dict = {"keys": None, "ts": 0.0}
_JWKS_TTL = 3600.0


def _get_jwks() -> Optional[dict]:
    if not CLERK_JWKS_URL:
        return None
    now = time.time()
    if _jwks_cache["keys"] is None or now - _jwks_cache["ts"] > _JWKS_TTL:
        try:
            resp = httpx.get(CLERK_JWKS_URL, timeout=10)
            resp.raise_for_status()
            _jwks_cache["keys"] = resp.json()
            _jwks_cache["ts"] = now
        except Exception:
            return _jwks_cache["keys"]
    return _jwks_cache["keys"]


def _verify_clerk_jwt(token: str) -> str:
    jwks = _get_jwks()
    if not jwks:
        raise HTTPException(status_code=401, detail="Auth not configured (CLERK_JWKS_URL/CLERK_ISSUER)")
    try:
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == header.get("kid")), None)
        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")
        claims = jwt.decode(
            token,
            key,
            algorithms=[key.get("alg", "RS256")],
            options={"verify_aud": False},
            issuer=CLERK_ISSUER or None,
        )
        sub = claims.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return str(sub)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Token verification failed: {exc}") from exc


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_internal_key: Optional[str] = Header(default=None, alias="X-Internal-Key"),
) -> str:
    """검증된 사용자 id 를 반환. 미인증이면 401."""
    # 1) 신뢰된 내부 프록시
    if INTERNAL_API_KEY and x_internal_key and x_internal_key == INTERNAL_API_KEY and x_user_id:
        return x_user_id
    # 2) Clerk JWT 직접 검증
    if authorization and authorization.lower().startswith("bearer "):
        return _verify_clerk_jwt(authorization.split(" ", 1)[1].strip())
    raise HTTPException(status_code=401, detail="Authentication required")
