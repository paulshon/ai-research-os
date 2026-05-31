"""
Projects Routes — 프로젝트 CRUD
================================
Supabase PostgreSQL 기반 프로젝트 관리 API.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers(token: str | None = None) -> dict:
    """Supabase REST API 헤더 생성"""
    h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    else:
        h["Authorization"] = f"Bearer {SUPABASE_SERVICE_KEY}"
    return h


class ProjectCreate(BaseModel):
    workspace_id: str
    title: str
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


class ChapterCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    order: int = 0


class SectionCreate(BaseModel):
    chapter_id: str
    title: str
    order: int = 0


# ── Projects ──

@router.post("/")
async def create_project(body: ProjectCreate):
    """새 프로젝트를 생성합니다."""
    if not SUPABASE_URL:
        return {"status": "created", "note": "Supabase 미연결 — 로컬 모드", "data": body.model_dump()}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/projects",
            json=body.model_dump(),
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.get("/")
async def list_projects(workspace_id: Optional[str] = None):
    """프로젝트 목록을 반환합니다."""
    if not SUPABASE_URL:
        return {"projects": [], "note": "Supabase 미연결 — 로컬 모드"}

    url = f"{SUPABASE_URL}/rest/v1/projects?select=*&order=updated_at.desc"
    if workspace_id:
        url += f"&workspace_id=eq.{workspace_id}"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=_headers())
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"projects": resp.json()}


@router.get("/{project_id}")
async def get_project(project_id: str):
    """프로젝트 상세 정보를 반환합니다 (챕터·섹션 포함)."""
    if not SUPABASE_URL:
        return {"project": None, "note": "Supabase 미연결"}

    async with httpx.AsyncClient(timeout=10) as client:
        # 프로젝트 기본 정보
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}&select=*",
            headers=_headers(),
        )
        if not resp.is_success:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        projects = resp.json()
        if not projects:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        project = projects[0]

        # 챕터 목록
        ch_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/chapters?project_id=eq.{project_id}&select=*&order=order.asc",
            headers=_headers(),
        )
        chapters = ch_resp.json() if ch_resp.is_success else []

        # 각 챕터의 섹션
        for ch in chapters:
            sec_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/sections?chapter_id=eq.{ch['id']}&select=id,title,order,word_count&order=order.asc",
                headers=_headers(),
            )
            ch["sections"] = sec_resp.json() if sec_resp.is_success else []

        project["chapters"] = chapters

    return {"project": project}


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate):
    """프로젝트 정보를 수정합니다."""
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다.")

    if not SUPABASE_URL:
        return {"status": "updated", "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """프로젝트를 삭제합니다 (CASCADE로 챕터·섹션도 삭제)."""
    if not SUPABASE_URL:
        return {"status": "deleted", "id": project_id, "note": "Supabase 미연결"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}",
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "deleted", "id": project_id}


# ── Chapters ──

@router.post("/{project_id}/chapters")
async def create_chapter(project_id: str, body: ChapterCreate):
    """챕터를 생성합니다."""
    payload = body.model_dump()
    payload["project_id"] = project_id

    if not SUPABASE_URL:
        return {"status": "created", "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/chapters",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


# ── Sections ──

@router.post("/chapters/{chapter_id}/sections")
async def create_section(chapter_id: str, body: SectionCreate):
    """섹션을 생성합니다."""
    payload = body.model_dump()
    payload["chapter_id"] = chapter_id

    if not SUPABASE_URL:
        return {"status": "created", "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/sections",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
