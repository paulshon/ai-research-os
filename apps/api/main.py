"""
AI Research OS — FastAPI Backend
================================
Deployed to Hugging Face Spaces (Docker SDK).
Handles:
- AI orchestration (Gemini proxy)
- PDF/DOCX parsing
- Research workflow engine
- Citation management (CrossRef DOI)
- Validation pipeline (7-category)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.config import settings
from routes import ai, projects, citations, validation, workflows, parsers


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AI Research OS API starting on HF Spaces...")
    yield
    print("👋 AI Research OS API shutting down...")


app = FastAPI(
    title="AI Research OS API",
    description="Backend for the AI Research Operating System",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — Vercel frontend + 프리뷰 도메인 + HF Spaces 프록시 허용
# 감사 3.3: Starlette CORSMiddleware 는 allow_origins 를 정확 매칭하므로
# "https://*.vercel.app" 리터럴은 어떤 프리뷰와도 매칭되지 않는다.
# → 프리뷰 와일드카드는 allow_origin_regex 로, 고정 출처는 allow_origins 로 처리.
FRONTEND_URL = os.getenv("FRONTEND_URL", settings.FRONTEND_URL)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "app://.",  # Electron
    ],
    allow_origin_regex=r"https://([a-z0-9-]+\.)*vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(citations.router, prefix="/citations", tags=["Citations"])
app.include_router(validation.router, prefix="/validation", tags=["Validation"])
app.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
app.include_router(parsers.router, prefix="/parsers", tags=["Parsers"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-research-os-api"}
