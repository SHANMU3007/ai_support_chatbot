"""
Claude Service – wraps the Anthropic Python SDK for streaming chat.
"""
from typing import AsyncIterator, Dict, List
import anthropic
from anthropic.types import MessageParam
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TEMPLATE = """You are a helpful AI customer-support assistant.
Use ONLY the information in the context section below to answer the user's question.
If the answer is not found in the context, say you don't have the information but offer to escalate.
Be concise, friendly, and professional.

Context:
{context}"""


class ClaudeService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def stream(
        self,
        message: str,
        context: str,
        history: List[Dict[str, str]],
    ) -> AsyncIterator[str]:
        system_prompt = _SYSTEM_TEMPLATE.format(context=context or "No context available.")

        # Build messages list (history + current message)
        messages: List[MessageParam] = []
        for turn in history[-6:]:  # keep last 6 turns
            if turn.get("role") in ("user", "assistant"):
                messages.append({"role": turn["role"], "content": turn["content"]})  # type: ignore[typeddict-item]
        messages.append({"role": "user", "content": message})

        try:
            async with self.client.messages.stream(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.MAX_TOKENS,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text_chunk in stream.text_stream:
                    yield text_chunk
        except anthropic.APIError as exc:
            logger.exception("Anthropic API error")
            yield f"\n[Error: {exc.message}]"
