from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.chroma_service import ChromaService

router = APIRouter()
chroma_service = ChromaService()


@router.get("/status/{chatbot_id}")
async def embedding_status(chatbot_id: str):
    """Return the number of embedded chunks for a chatbot."""
    count = await chroma_service.count_chunks(chatbot_id)
    return JSONResponse({"chatbot_id": chatbot_id, "chunk_count": count})
