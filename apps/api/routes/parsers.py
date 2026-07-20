"""
Parsers Routes — 문서 파싱 & 분석
===================================
PDF, DOCX, HWP 등 학술 문서를 파싱하여 구조화된 데이터로 변환.
논문 분석기(Analyzer) 엔진의 백엔드.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import tempfile
import os

router = APIRouter()

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

ANALYZER_SYSTEM_PROMPT = """당신은 학술 논문 구조 분석 전문가입니다. 주어진 논문 텍스트를 분석하여 다음 JSON 형식으로 반환합니다:
{
  "title": "논문 제목",
  "abstract": "초록 요약",
  "thesis_type": "quantitative|qualitative|mixed|experimental",
  "chapters": [
    {
      "title": "챕터 제목",
      "order": 0,
      "sections": [
        {"title": "섹션 제목", "order": 0, "summary": "내용 요약"}
      ]
    }
  ],
  "research_questions": ["RQ1", "RQ2"],
  "methodology": "방법론 요약",
  "references_count": 0,
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "suggestions": ["개선제안1", "개선제안2"]
}
반드시 유효한 JSON만 반환하세요."""


class ParseTextRequest(BaseModel):
    content: str
    model: str = "gemini-2.5-flash"


class ExtractedStructure(BaseModel):
    title: Optional[str] = None
    abstract_text: Optional[str] = None
    thesis_type: Optional[str] = None
    chapters: list[dict] = []
    research_questions: list[str] = []
    methodology: Optional[str] = None
    references_count: int = 0
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []
    raw_text: Optional[str] = None


@router.post("/text", response_model=ExtractedStructure)
async def parse_text(
    req: ParseTextRequest,
    x_gemini_key: str = Header(..., alias="X-Gemini-Key"),
):
    """텍스트 형태의 논문을 AI로 분석하여 구조를 추출합니다."""
    url = f"{GEMINI_BASE}/{req.model}:generateContent"

    user_prompt = f"""다음 논문 텍스트를 분석하여 구조를 추출해 주세요.

---
{req.content[:30000]}
---"""

    body = {
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": ANALYZER_SYSTEM_PROMPT}]},
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
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
        raise HTTPException(
            status_code=resp.status_code,
            detail=data.get("error", {}).get("message", "Gemini API 오류"),
        )

    data = resp.json()
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    raw_text = "".join(p.get("text", "") for p in parts).strip()

    # JSON 파싱
    import json
    clean = raw_text
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[-1]
    if clean.endswith("```"):
        clean = clean.rsplit("```", 1)[0]
    clean = clean.strip()

    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        return ExtractedStructure(raw_text=raw_text)

    return ExtractedStructure(
        title=parsed.get("title"),
        abstract_text=parsed.get("abstract"),
        thesis_type=parsed.get("thesis_type"),
        chapters=parsed.get("chapters", []),
        research_questions=parsed.get("research_questions", []),
        methodology=parsed.get("methodology"),
        references_count=parsed.get("references_count", 0),
        strengths=parsed.get("strengths", []),
        weaknesses=parsed.get("weaknesses", []),
        suggestions=parsed.get("suggestions", []),
    )


@router.post("/pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """PDF 파일을 업로드하여 텍스트를 추출합니다."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 지원합니다.")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PyMuPDF가 설치되어 있지 않습니다. pip install PyMuPDF",
        )

    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(content)
        tmp.flush()

        doc = fitz.open(tmp.name)
        pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            pages.append({"page": page_num + 1, "text": text})
        doc.close()

    full_text = "\n\n".join(p["text"] for p in pages)

    return {
        "filename": file.filename,
        "pages": len(pages),
        "total_chars": len(full_text),
        "text": full_text[:50000],  # 최대 50K 문자
        "page_texts": pages[:5],  # 미리보기: 처음 5페이지
    }


@router.post("/docx")
async def parse_docx(file: UploadFile = File(...)):
    """DOCX 파일을 업로드하여 텍스트를 추출합니다."""
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="DOCX 파일만 지원합니다.")

    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="python-docx가 설치되어 있지 않습니다. pip install python-docx",
        )

    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as tmp:
        tmp.write(content)
        tmp.flush()

        doc = Document(tmp.name)
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append({
                    "text": para.text.strip(),
                    "style": para.style.name if para.style else "Normal",
                })

    full_text = "\n\n".join(p["text"] for p in paragraphs)

    return {
        "filename": file.filename,
        "paragraphs": len(paragraphs),
        "total_chars": len(full_text),
        "text": full_text[:50000],
        "structure": paragraphs[:30],  # 미리보기: 처음 30 문단
    }
