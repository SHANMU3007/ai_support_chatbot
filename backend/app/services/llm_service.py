"""
LLM Service – Groq-backed streaming chat (llama-3.3-70b-versatile).
Kept as a separate service for any code that imports LLMService directly.
"""
from __future__ import annotations

import logging
from typing import AsyncIterator, Dict, List

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TEMPLATE = """You are a helpful AI customer-support assistant.
Use ONLY the information in the context section below to answer the user's question.
If the answer is not found in the context, say you don't have the information but offer to escalate.
Be concise, friendly, and professional.

Context:
{context}"""


class LLMService:

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def stream(
        self,
        message: str,
        context: str,
        history: List[Dict[str, str]],
    ) -> AsyncIterator[str]:
        system_prompt = _SYSTEM_TEMPLATE.format(context=context or "No context available.")

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[-6:]:
            if turn.get("role") in ("user", "assistant"):
                messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": message})

        try:
            stream = await self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=settings.MAX_TOKENS,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            logger.exception("Groq LLM error")
            yield f"\n[Error: {exc}]"
