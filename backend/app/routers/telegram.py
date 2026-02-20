"""
Telegram integration router – start/stop/status of Telegram bots.
Called from the Next.js frontend when a user saves their Telegram token.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.telegram_bot import start_bot, stop_bot, get_running_bots
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class TelegramConnectRequest(BaseModel):
    chatbot_id: str
    token: str
    business_name: str = "Our Business"


class TelegramDisconnectRequest(BaseModel):
    chatbot_id: str


@router.post("/connect")
async def connect_telegram(request: TelegramConnectRequest):
    """Start a Telegram bot for a chatbot."""
    success = await start_bot(
        chatbot_id=request.chatbot_id,
        token=request.token,
        business_name=request.business_name,
        backend_url=settings.FASTAPI_URL,
    )
    if success:
        return {"status": "connected", "message": f"Telegram bot started for {request.business_name}"}
    raise HTTPException(status_code=400, detail="Failed to start Telegram bot. Please check your bot token.")


@router.post("/disconnect")
async def disconnect_telegram(request: TelegramDisconnectRequest):
    """Stop a Telegram bot for a chatbot."""
    await stop_bot(request.chatbot_id)
    return {"status": "disconnected", "message": "Telegram bot stopped."}


@router.get("/status")
async def telegram_status():
    """Get all running Telegram bots."""
    bots = get_running_bots()
    return {"running_bots": bots, "count": len(bots)}


@router.get("/status/{chatbot_id}")
async def telegram_bot_status(chatbot_id: str):
    """Check if a specific chatbot has an active Telegram bot."""
    bots = get_running_bots()
    is_running = chatbot_id in bots
    return {"chatbot_id": chatbot_id, "is_running": is_running}
