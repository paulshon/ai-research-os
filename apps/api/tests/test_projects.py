"""v4: 실제 단위 테스트 (감사 Medium — tests/ 가 __init__.py 뿐이던 문제 해결)."""
import asyncio

import pytest
from fastapi import HTTPException

from app.auth import get_current_user
from routes.projects import _to_row


def test_to_row_splits_top_level_and_data():
    """부가 필드는 data JSONB 로, 1급 컬럼은 그대로 (감사 3.1 스키마 정합)."""
    row = _to_row(
        {
            "workspace_id": "ws-1",
            "title": "내 논문",
            "thesis_type": "qualitative",
            "university": "X대학교",
            "keywords": ["AI", "창작"],
            "ignored_none": None,
        }
    )
    assert row["workspace_id"] == "ws-1"
    assert row["title"] == "내 논문"
    # 존재하지 않는 컬럼은 top-level 로 새지 않고 data 에 들어간다.
    assert "thesis_type" not in row
    assert row["data"]["thesis_type"] == "qualitative"
    assert row["data"]["university"] == "X대학교"
    assert row["data"]["keywords"] == ["AI", "창작"]
    # None 값은 제외된다.
    assert "ignored_none" not in row and "ignored_none" not in row.get("data", {})


def test_to_row_no_extra_means_no_data_key():
    row = _to_row({"title": "t"})
    assert row == {"title": "t"}


def test_get_current_user_rejects_unauthenticated():
    """인증 헤더가 전혀 없으면 401 (감사 2.2 IDOR 방지)."""
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_current_user(authorization=None, x_user_id=None, x_internal_key=None))
    assert exc.value.status_code == 401


def test_get_current_user_trusts_internal_proxy(monkeypatch):
    """내부 키 일치 시 X-User-Id 를 신뢰한다."""
    import app.auth as auth_mod
    monkeypatch.setattr(auth_mod, "INTERNAL_API_KEY", "secret-123")
    uid = asyncio.run(
        get_current_user(authorization=None, x_user_id="user_abc", x_internal_key="secret-123")
    )
    assert uid == "user_abc"


def test_get_current_user_rejects_wrong_internal_key(monkeypatch):
    import app.auth as auth_mod
    monkeypatch.setattr(auth_mod, "INTERNAL_API_KEY", "secret-123")
    with pytest.raises(HTTPException):
        asyncio.run(
            get_current_user(authorization=None, x_user_id="user_abc", x_internal_key="WRONG")
        )
