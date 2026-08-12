"""
Citations Routes — DOI 검색 & 인용 관리
========================================
CrossRef API를 통한 DOI 기반 논문 검색 및 인용 CRUD.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter()

CROSSREF_API = "https://api.crossref.org/works"


class CitationCreate(BaseModel):
    project_id: str
    doi: Optional[str] = None
    title: str
    authors: list[str] = []
    year: int = 0
    journal: Optional[str] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    url: Optional[str] = None
    format: str = "apa7"


class DOILookupResponse(BaseModel):
    found: bool
    title: Optional[str] = None
    authors: list[str] = []
    year: Optional[int] = None
    journal: Optional[str] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None


@router.get("/lookup/{doi:path}", response_model=DOILookupResponse)
async def lookup_doi(doi: str):
    """CrossRef API를 통해 DOI로 논문 메타데이터를 검색합니다."""
    url = f"{CROSSREF_API}/{doi}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            url,
            headers={"User-Agent": "AIResearchOS/0.1 (mailto:contact@ai-research-os.com)"},
        )

    if not resp.is_success:
        return DOILookupResponse(found=False)

    data = resp.json()
    msg = data.get("message", {})

    title_list = msg.get("title", [])
    author_list = msg.get("author", [])
    published = msg.get("published-print") or msg.get("published-online") or {}
    date_parts = published.get("date-parts", [[0]])
    container = msg.get("container-title", [])

    return DOILookupResponse(
        found=True,
        title=title_list[0] if title_list else None,
        authors=[
            f"{a.get('given', '')} {a.get('family', '')}".strip()
            for a in author_list
        ],
        year=date_parts[0][0] if date_parts and date_parts[0] else None,
        journal=container[0] if container else None,
        volume=msg.get("volume"),
        pages=msg.get("page"),
        doi=msg.get("DOI"),
    )


@router.post("/")
async def create_citation(citation: CitationCreate):
    """인용 항목을 생성합니다. (Supabase 연동 예정)"""
    # TODO: Supabase INSERT
    return {"status": "created", "data": citation.model_dump()}


@router.get("/{project_id}")
async def list_citations(project_id: str):
    """프로젝트의 모든 인용 목록을 반환합니다."""
    # TODO: Supabase SELECT
    return {"project_id": project_id, "citations": []}


@router.delete("/{citation_id}")
async def delete_citation(citation_id: str):
    """인용 항목을 삭제합니다."""
    # TODO: Supabase DELETE
    return {"status": "deleted", "id": citation_id}
