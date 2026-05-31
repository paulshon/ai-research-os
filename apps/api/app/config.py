from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    FRONTEND_URL: str = "http://localhost:3000"
    API_PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/ai_research_os"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Auth
    SUPABASE_JWT_SECRET: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI (fallback for system tasks)
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
