"""
Validation Routes — 논문 검증 엔진
====================================
7개 카테고리 자동 검증: 논리·방법론·인용·구조·어조·환각·표절
Gemini AI를 활용한 검증 + 결과 저장.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import json
import os

router = APIRouter()

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

VALIDATION_SYSTEM_PROMPT = """당신은 학술 논문 검증 전문가입니다. 주어진 논문 내용을 분석하여 JSON 배열 형태로 검증 결과를 반환합니다.
각 항목의 형식:
{
  "type": "logic|methodology|citation|structure|tone|hallucination|plagiarism",
  "severity": "error|warning|info",
  "message": "문제 설명 (한국어)",
  "suggestion": "개선 제안 (한국어)"
}

검증 기준:
1. logic: 연구문제↔가설↔결론의 일관성
2. methodology: 연구 설계의 적절성, 표본 크기, 분석 방법
3. citation: 인용 형식 일관성, 출처 누락
4. structure: 필수 섹션 누락 여부 (서론, 연구방법, 결과, 결론)
5. tone: 학술적 문체 적합성, 비격식 표현
6. hallucination: AI 생성 내용에서 사실과 다를 수 있는 부분
7. plagiarism: 인용 없는 일반적이지 않은 주장

반드시 유효한 JSON 배열만 반환하세요. 다른 텍스트는 포함하지 마세요."""


class ValidateRequest(BaseModel):
    project_id: str
    content: str
    thesis_type: str = "quantitative"
    chapter_id: Optional[str] = None
    section_id: Optional[str] = None
    validation_types: list[str] = [
        "logic", "methodology", "citation", "structure", "tone"
    ]
    model: str = "gemini-2.5-flash"


class ValidationItem(BaseModel):
    type: str
    severity: str
    message: str
    suggestion: Optional[str] = None


class ValidateResponse(BaseModel):
    ok: bool
    project_id: str
    results: list[ValidationItem]
    total_errors: int
    total_warnings: int
    total_info: int


@router.post("/run", response_model=ValidateResponse)
async def run_validation(
    req: ValidateRequest,
    x_gemini_key: str = Header(..., alias="X-Gemini-Key"),
):
    """논문 내용에 대해 AI 기반 검증을 수행합니다."""
    url = f"{GEMINI_BASE}/{req.model}:generateContent"

    user_prompt = f"""다음 논문 내용을 검증해 주세요.

논문 유형: {req.thesis_type}
검증 카테고리: {', '.join(req.validation_types)}

---
{req.content[:15000]}
---

위 내용에 대한 검증 결과를 JSON 배열로 반환하세요."""

    body = {
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": VALIDATION_SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 8192,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            url,
            json=body,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": x_gemini_key,
            },
        )

    if not resp.is_success:
        data = resp.json()
        error_msg = data.get("error", {}).get("message", "Gemini API 오류")
        raise HTTPException(status_code=resp.status_code, detail=error_msg)

    data = resp.json()
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    raw_text = "".join(p.get("text", "") for p in parts).strip()

    # JSON 파싱 (Gemini가 ```json 래핑할 수 있음)
    clean = raw_text
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[-1]
    if clean.endswith("```"):
        clean = clean.rsplit("```", 1)[0]
    clean = clean.strip()

    try:
        items_raw = json.loads(clean)
    except json.JSONDecodeError:
        items_raw = [
            {"type": "structure", "severity": "info", "message": "검증 결과를 파싱할 수 없습니다. AI 응답을 확인하세요.", "suggestion": raw_text[:500]}
        ]

    results = []
    for item in items_raw:
        results.append(ValidationItem(
            type=item.get("type", "structure"),
            severity=item.get("severity", "info"),
            message=item.get("message", ""),
            suggestion=item.get("suggestion"),
        ))

    # Supabase에 결과 저장 (선택적)
    if SUPABASE_URL and results:
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        }
        rows = [
            {
                "project_id": req.project_id,
                "type": r.type,
                "severity": r.severity,
                "message": r.message,
                "chapter_id": req.chapter_id,
                "section_id": req.section_id,
                "suggestion": r.suggestion,
            }
            for r in results
        ]
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/validation_results",
                json=rows,
                headers=headers,
            )

    return ValidateResponse(
        ok=True,
        project_id=req.project_id,
        results=results,
        total_errors=sum(1 for r in results if r.severity == "error"),
        total_warnings=sum(1 for r in results if r.severity == "warning"),
        total_info=sum(1 for r in results if r.severity == "info"),
    )


@router.get("/{project_id}")
async def get_validation_results(project_id: str):
    """프로젝트의 검증 이력을 조회합니다."""
    if not SUPABASE_URL:
        return {"project_id": project_id, "results": [], "note": "Supabase 미연결"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/validation_results?project_id=eq.{project_id}&select=*&order=created_at.desc",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            },
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"project_id": project_id, "results": resp.json()}
