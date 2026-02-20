from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

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
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    LOG_LEVEL: str = "INFO"

    # Embedding model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Model
    MAX_TOKENS: int = 2048
    CONTEXT_CHUNKS: int = 5


settings = Settings()
