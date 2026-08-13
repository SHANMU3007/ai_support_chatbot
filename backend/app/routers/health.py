from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    return JSONResponse({"status": "ok", "service": "chatbot-ai-backend"})


@router.get("/health/detailed")
async def health_detailed():
    """Detailed health check — shows DB, ChromaDB, and embedding model status."""
    result: dict = {"status": "ok"}

    # 1. Database check
    try:
        from app.database import engine
        import sqlalchemy as sa
        async with engine.begin() as conn:
            await conn.execute(sa.text("SELECT 1"))
        result["database"] = "ok"
    except Exception as exc:
        result["database"] = f"ERROR: {exc}"
        result["status"] = "degraded"

    # 2. ChromaDB check
    try:
        from app.services.chroma_service import ChromaService
        svc = ChromaService()
        svc._get_client()
        result["chromadb"] = "ok"
    except Exception as exc:
        result["chromadb"] = f"ERROR: {exc}"
        result["status"] = "degraded"

    # 3. Embedding model check
    try:
        from app.services.embedding_service import EmbeddingService
        EmbeddingService()._get_model()
        result["embedding_model"] = "ok"
    except Exception as exc:
        result["embedding_model"] = f"ERROR: {exc}"
        result["status"] = "degraded"

    # 4. Env vars check
    result["env"] = {
        "GROQ_API_KEY": "set" if os.environ.get("GROQ_API_KEY") else "MISSING",
        "DATABASE_URL": "set" if os.environ.get("DATABASE_URL") else "MISSING",
        "CHROMA_PERSIST_PATH": os.environ.get("CHROMA_PERSIST_PATH", "/data/chroma"),
    }

    return JSONResponse(result, status_code=200 if result["status"] == "ok" else 207)
