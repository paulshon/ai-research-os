# ═══════════════════════════════════════════
# AI Research OS — FastAPI Backend
# Hugging Face Spaces Docker SDK
# ═══════════════════════════════════════════

FROM python:3.11-slim

# HF Spaces 필수: 비-root 사용자
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# 의존성 설치
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 소스 복사
COPY --chown=user . .

# HF Spaces는 반드시 포트 7860 사용
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
