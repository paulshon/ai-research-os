"""
AI Routes — Gemini Proxy
=========================
Receives user's Gemini API key in Authorization header.
Proxies requests to Gemini API server-side for security.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter()

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GenerateRequest(BaseModel):
    engine: str = "structure"
    system_instruction: Optional[str] = None
    user_text: str
    model: str = "gemini-2.5-flash"
    max_output_tokens: int = 8192
    temperature: float = 0.7
    project_context: Optional[dict] = None


class GenerateResponse(BaseModel):
    ok: bool
    text: str
    engine: str
    tokens_used: Optional[int] = None


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    req: GenerateRequest,
    x_gemini_key: str = Header(..., alias="X-Gemini-Key"),
):
    """Proxy AI generation through FastAPI for security."""
    url = f"{GEMINI_BASE}/{req.model}:generateContent"

    body: dict = {
        "contents": [{"role": "user", "parts": [{"text": req.user_text}]}],
        "generationConfig": {
            "maxOutputTokens": req.max_output_tokens,
            "temperature": req.temperature,
        },
    }

    if req.system_instruction:
        body["systemInstruction"] = {
            "parts": [{"text": req.system_instruction}]
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

    data = resp.json()

    if not resp.is_success:
        error_msg = data.get("error", {}).get("message", "API error")
        raise HTTPException(status_code=resp.status_code, detail=error_msg)

    # Extract text from Gemini response
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    text = "".join(p.get("text", "") for p in parts)

    tokens = (
        data.get("usageMetadata", {}).get("totalTokenCount")
    )

    return GenerateResponse(
        ok=True,
        text=text,
        engine=req.engine,
        tokens_used=tokens,
    )
