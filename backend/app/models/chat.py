from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    chatbot_id: str
    session_id: str
    message: str
    history: List[HistoryMessage] = Field(default_factory=list)
    visitor_id: str = ""


class ChatResponse(BaseModel):
    content: str
    session_id: str
    tokens_used: Optional[int] = None
