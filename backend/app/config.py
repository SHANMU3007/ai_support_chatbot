from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    @field_validator("GROQ_API_KEY")
    @classmethod
    def groq_api_key_must_be_set(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "GROQ_API_KEY is not set or is empty. "
                "Set it as an environment variable or in the .env file."
            )
        return v.strip()
    # Smaller, faster model used only for NL2SQL (higher free-tier token quota)
    GROQ_NL2SQL_MODEL: str = "openai/gpt-oss-20b"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://chatbot:chatbot_pass@localhost:5432/chatbot_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # App
    FASTAPI_URL: str = "http://localhost:8000"
    NEXTJS_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://ai-support-chatbot-blush.vercel.app",
    ]
    LOG_LEVEL: str = "INFO"

    # Embedding model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Model
    MAX_TOKENS: int = 1024
    CONTEXT_CHUNKS: int = 8
    # Minimum cosine similarity for a chunk to be included in context.
    # 0.25 = only genuinely relevant chunks; prevents hallucinations from noise.
    RAG_MIN_SIMILARITY: float = 0.25


settings = Settings()
