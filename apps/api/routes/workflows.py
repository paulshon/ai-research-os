"""
Workflows Routes — 연구 워크플로우 관리
=========================================
8단계 연구 워크플로우 기반 태스크 생성·관리·진행률 추적.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

WORKFLOW_PHASES = [
    {"value": "planning", "label": "기획", "order": 1},
    {"value": "literature_review", "label": "문헌 검토", "order": 2},
    {"value": "methodology", "label": "방법론 설계", "order": 3},
    {"value": "data_collection", "label": "데이터 수집", "order": 4},
    {"value": "analysis", "label": "분석", "order": 5},
    {"value": "writing", "label": "작성", "order": 6},
    {"value": "revision", "label": "수정·교정", "order": 7},
    {"value": "submission", "label": "제출", "order": 8},
]

DEFAULT_TASKS = {
    "planning": [
        "연구 주제 선정 및 범위 확정",
        "연구문제(RQ) / 가설 작성",
        "초기 논문 구조 설계",
        "연구 일정 수립",
    ],
    "literature_review": [
        "핵심 키워드 선정",
        "데이터베이스 검색 (Google Scholar, RISS, Web of Science)",
        "선행연구 정리 및 매트릭스 작성",
        "이론적 프레임워크 도출",
    ],
    "methodology": [
        "연구 설계 확정 (양적/질적/혼합)",
        "표본 선정 및 크기 산정",
        "측정 도구 선정 또는 개발",
        "IRB 승인 (해당 시)",
    ],
    "data_collection": [
        "설문/인터뷰/실험 실시",
        "데이터 수집 완료 확인",
        "원시 데이터 정리 및 코딩",
    ],
    "analysis": [
        "기술통계 분석",
        "가설 검증 (추론통계)",
        "결과 표/그래프 작성",
        "분석 결과 해석",
    ],
    "writing": [
        "서론 작성",
        "이론적 배경 작성",
        "연구방법 작성",
        "결과 작성",
        "결론 및 논의 작성",
        "참고문헌 정리",
    ],
    "revision": [
        "AI 멘토링 피드백 반영",
        "문법·맞춤법 교정",
        "인용 형식 일관성 점검",
        "최종 검증 엔진 실행",
    ],
    "submission": [
        "최종 포맷 확인",
        "제출 서류 준비",
        "논문 제출",
    ],
}


class TaskCreate(BaseModel):
    title: str
    phase: str
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    order: int = 0


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


def _headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


@router.get("/phases")
async def get_phases():
    """워크플로우 단계 목록을 반환합니다."""
    return {"phases": WORKFLOW_PHASES}


@router.post("/{project_id}/init")
async def init_workflow(project_id: str):
    """프로젝트에 기본 워크플로우 태스크를 일괄 생성합니다."""
    tasks = []
    order = 0
    for phase_key, task_titles in DEFAULT_TASKS.items():
        for title in task_titles:
            tasks.append({
                "project_id": project_id,
                "title": title,
                "phase": phase_key,
                "status": "pending",
                "order": order,
            })
            order += 1

    if not SUPABASE_URL:
        return {"status": "initialized", "count": len(tasks), "note": "Supabase 미연결", "tasks": tasks}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/workflow_tasks",
            json=tasks,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "initialized", "count": len(tasks), "tasks": resp.json()}


@router.get("/{project_id}")
async def get_tasks(project_id: str, phase: Optional[str] = None):
    """프로젝트의 워크플로우 태스크 목록과 진행률을 반환합니다."""
    if not SUPABASE_URL:
        return {"project_id": project_id, "tasks": [], "progress": {}, "note": "Supabase 미연결"}

    url = f"{SUPABASE_URL}/rest/v1/workflow_tasks?project_id=eq.{project_id}&select=*&order=order.asc"
    if phase:
        url += f"&phase=eq.{phase}"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=_headers())
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    tasks = resp.json()

    # 진행률 계산
    total = len(tasks)
    done = sum(1 for t in tasks if t.get("status") == "done")
    by_phase: dict[str, dict] = {}
    for t in tasks:
        p = t.get("phase", "unknown")
        if p not in by_phase:
            by_phase[p] = {"total": 0, "done": 0}
        by_phase[p]["total"] += 1
        if t.get("status") == "done":
            by_phase[p]["done"] += 1

    progress = {
        "overall": round(done / total * 100, 1) if total else 0,
        "by_phase": {k: round(v["done"] / v["total"] * 100, 1) if v["total"] else 0 for k, v in by_phase.items()},
    }

    return {"project_id": project_id, "tasks": tasks, "progress": progress}


@router.post("/{project_id}/tasks")
async def create_task(project_id: str, body: TaskCreate):
    """워크플로우 태스크를 개별 생성합니다."""
    payload = body.model_dump()
    payload["project_id"] = project_id
    payload["status"] = "pending"

    if not SUPABASE_URL:
        return {"status": "created", "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/workflow_tasks",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    """태스크 상태 또는 정보를 수정합니다."""
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다.")

    if not SUPABASE_URL:
        return {"status": "updated", "id": task_id, "note": "Supabase 미연결", "data": payload}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/workflow_tasks?id=eq.{task_id}",
            json=payload,
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """태스크를 삭제합니다."""
    if not SUPABASE_URL:
        return {"status": "deleted", "id": task_id}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/workflow_tasks?id=eq.{task_id}",
            headers=_headers(),
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "deleted", "id": task_id}
