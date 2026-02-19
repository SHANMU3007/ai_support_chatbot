from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
import json
import logging

from app.models.chat import ChatRequest
from app.services.rag_service import RagService

logger = logging.getLogger(__name__)
router = APIRouter()
rag_service = RagService()


@router.post("/message")
async def chat_message(request: ChatRequest):
    """
    Stream an AI response for the given message using RAG.
    Returns Server-Sent Events (text/event-stream).
    """
    async def event_stream():
        try:
            async for chunk in rag_service.stream_response(
                chatbot_id=request.chatbot_id,
                session_id=request.session_id,
                message=request.message,
                history=request.history,
                visitor_id=request.visitor_id,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Error in chat stream")
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
