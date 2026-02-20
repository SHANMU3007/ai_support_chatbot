"""
AI Engine – powers all chat responses via Groq (llama-3.3-70b-versatile).
Drop-in streaming inference layer; used by RAGEngine for context-aware replies.
"""
from typing import AsyncIterator, Dict, List
import logging

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TEMPLATE = """You are a customer-support assistant for a specific business. 
You must ONLY answer questions using the information provided in the Context section below.

STRICT RULES:
- ONLY use information from the Context to answer questions.
- If the user's question is NOT related to the business or the Context, politely say:
  "I'm sorry, I can only help with questions related to our business. Is there anything else I can assist you with regarding our services?"
- Do NOT answer general knowledge questions (e.g. science, history, geography, etc.)
- Do NOT make up information that is not in the Context.
- Be warm, professional, and helpful for business-related queries.
- Keep answers concise but complete.
- If users greet you, greet back and ask how you can help with the business services.
- If users seem frustrated, be empathetic and offer to connect them with a human agent.

Context:
{context}"""


class AIEngine:

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def stream(
        self,
        message: str,
        context: str,
        history: List[Dict[str, str]],
    ) -> AsyncIterator[str]:
        system_prompt = _SYSTEM_TEMPLATE.format(context=context or "No context available. You must tell the user you can only answer questions about this business.")

        # Build messages: system + last 6 history turns + current message
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
            logger.exception("Groq API error")
            yield f"\n😞 Oops! I ran into a technical issue. Please try again in a moment."
