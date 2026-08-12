from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    FRONTEND_URL: str = "http://localhost:3000"
    API_PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/ai_research_os"
    SUPABASE_URL: str = ""
    # v4: routes 와 일관되게 SUPABASE_SERVICE_ROLE_KEY 로 통일(감사 3.2).
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Auth (Clerk JWT 검증 / 신뢰된 내부 프록시)
    SUPABASE_JWT_SECRET: str = ""
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""
    INTERNAL_API_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI (fallback for system tasks)
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
