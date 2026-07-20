"""
Projects Routes — 프로젝트 CRUD (v4)
=====================================
감사보고서 해결:
 - 2.2 (IDOR): 모든 엔드포인트가 인증(get_current_user)을 요구하고,
   owner_id 로 스코프를 강제한다. 타인의 프로젝트 조회/수정/삭제 불가.
 - 3.1 (스키마 불일치): 실제 projects 테이블 컬럼(owner_id, workspace_id,
   title, data jsonb)에 맞춘다. 부가 필드(description/thesis_type/...)는
   data JSONB 에 저장한다. 존재하지 않는 chapters/sections 테이블 참조 제거
   (구조는 data 안에 보관).
 - 3.2 (환경변수): SUPABASE_SERVICE_ROLE_KEY 로 통일(config 와 일치).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Any
import httpx
import os

from app.auth import get_current_user

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# 실제 테이블의 1급(top-level) 컬럼. 그 외는 data JSONB 로 들어간다.
TOP_LEVEL = {"workspace_id", "title"}
EXTRA_FIELDS = {
    "description", "thesis_type", "status", "university",
    "department", "advisor", "deadline", "keywords", "language",
}


def _headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


class ProjectCreate(BaseModel):
    workspace_id: Optional[str] = None
    title: str = "새 프로젝트"
    description: Optional[str] = None
    thesis_type: str = "quantitative"
    university: Optional[str] = None
    department: Optional[str] = None
    advisor: Optional[str] = None
    deadline: Optional[str] = None
    keywords: list[str] = []
    language: str = "ko"


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thesis_type: Optional[str] = None
    status: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    advisor: Optional[str] = None
    deadline: Optional[str] = None
    keywords: Optional[list[str]] = None


def _to_row(payload: dict[str, Any]) -> dict[str, Any]:
    """입력을 실제 스키마(top-level + data jsonb)로 변환."""
    row: dict[str, Any] = {}
    data: dict[str, Any] = {}
    for k, v in payload.items():
        if v is None:
            continue
        if k in TOP_LEVEL:
            row[k] = v
        elif k in EXTRA_FIELDS:
            data[k] = v
    if data:
        row["data"] = data
    return row


# ── Projects ──

@router.post("/")
async def create_project(body: ProjectCreate, user_id: str = Depends(get_current_user)):
    """새 프로젝트 생성. owner_id 는 인증된 사용자로 강제."""
    row = _to_row(body.model_dump())
    row["owner_id"] = user_id  # NOT NULL · 소유권 강제
    if not SUPABASE_URL:
        return {"status": "created", "note": "Supabase 미연결 — 로컬 모드", "data": row}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/projects", json=row, headers=_headers()
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.get("/")
async def list_projects(
    workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)
):
    """본인 소유 프로젝트만 반환(owner_id 스코프)."""
    if not SUPABASE_URL:
        return {"projects": [], "note": "Supabase 미연결 — 로컬 모드"}

    url = (
        f"{SUPABASE_URL}/rest/v1/projects"
        f"?select=*&owner_id=eq.{user_id}&order=updated_at.desc"
    )
    if workspace_id:
        url += f"&workspace_id=eq.{workspace_id}"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=_headers())
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"projects": resp.json()}


@router.get("/{project_id}")
async def get_project(project_id: str, user_id: str = Depends(get_current_user)):
    """프로젝트 상세. 본인 소유만 조회 가능(없거나 타인 소유면 404)."""
    if not SUPABASE_URL:
        return {"project": None, "note": "Supabase 미연결"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/projects"
            f"?id=eq.{project_id}&owner_id=eq.{user_id}&select=*",
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    projects = resp.json()
    if not projects:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    # 챕터/섹션 구조는 data JSONB 안에 보관(별도 테이블 없음).
    return {"project": projects[0]}


@router.patch("/{project_id}")
async def update_project(
    project_id: str, body: ProjectUpdate, user_id: str = Depends(get_current_user)
):
    """프로젝트 수정. owner_id 스코프로 타인 프로젝트 수정 차단."""
    incoming = {k: v for k, v in body.model_dump().items() if v is not None}
    if not incoming:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다.")
    payload = _to_row(incoming)
    if not payload:
        raise HTTPException(status_code=400, detail="유효한 수정 필드가 없습니다.")

    if not SUPABASE_URL:
        return {"status": "updated", "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/projects"
            f"?id=eq.{project_id}&owner_id=eq.{user_id}",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    updated = resp.json()
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return updated


@router.delete("/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_current_user)):
    """프로젝트 삭제. owner_id 스코프로 타인 프로젝트 삭제 차단."""
    if not SUPABASE_URL:
        return {"status": "deleted", "id": project_id, "note": "Supabase 미연결"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/projects"
            f"?id=eq.{project_id}&owner_id=eq.{user_id}",
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "deleted", "id": project_id}
