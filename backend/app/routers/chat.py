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
    # Convert HistoryMessage pydantic objects to plain dicts for the AI engine
    history_dicts = [
        {"role": h.role, "content": h.content}
        for h in request.history
    ]

    async def event_stream():
        try:
            async for chunk in rag_service.stream_response(
                chatbot_id=request.chatbot_id,
                session_id=request.session_id,
                message=request.message,
                history=history_dicts,
                visitor_id=request.visitor_id,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Error in chat stream")
            yield f"data: {json.dumps({'error': str(exc), 'content': '😞 Something went wrong. Please try again.'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/telegram")
async def telegram_chat(request: ChatRequest):
    """
    Non-streaming endpoint for Telegram / n8n integration.
    Returns a plain JSON response with the full AI reply.
    """
    history_dicts = [
        {"role": h.role, "content": h.content}
        for h in request.history
    ]

    full_response = ""
    try:
        async for chunk in rag_service.stream_response(
            chatbot_id=request.chatbot_id,
            session_id=request.session_id,
            message=request.message,
            history=history_dicts,
            visitor_id=request.visitor_id,
        ):
            full_response += chunk
    except Exception as exc:
        logger.exception("Error in telegram chat")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "reply": "😞 Something went wrong. Please try again."},
        )

    return JSONResponse(content={
        "reply": full_response,
        "chatbot_id": request.chatbot_id,
        "session_id": request.session_id,
    })
