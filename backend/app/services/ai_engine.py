"""
AI Engine – powers all chat responses via Groq (with automatic fallback).
Drop-in streaming inference layer; used by RAGEngine for context-aware replies.
Handles rate-limit errors by:
  1. Retrying once after a short delay
  2. Falling back to a smaller / cheaper model
  3. Returning a clear, user-friendly error only as a last resort
"""
from typing import Any, AsyncIterator, Dict, List, Optional, cast
import asyncio
import logging

from groq import AsyncGroq, RateLimitError

from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TEMPLATE = """You are an intelligent, friendly customer-support AI assistant.

Context from Knowledge Base:
{context}

RULES & BEHAVIOR:
- GREETINGS & CONVERSATION: If the user greets you (e.g. "hi", "hello", "good day"), greet them back warmly, introduce yourself as the business support assistant, and ask how you can help.
- ACCURACY: When the Context section contains relevant details, use them to provide precise, accurate, and concise answers.
- MISSING DOMAIN CONTEXT: If the user asks a specific question about product details, pricing, policies, or technical facts that are NOT covered in the Context above, politely state that this specific detail is not in your uploaded knowledge base, and offer to help with general questions or connect them with human support.
- OUT OF SCOPE: If the user asks completely unrelated topics (like writing unrelated code or random trivia), politely remind them that you are a customer support assistant for this business.
- TONE: Maintain a warm, polite, professional, and empathetic tone at all times. Keep responses concise."""

# Ordered list of models to try – primary first, then cheaper fallbacks.
_FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",       # much cheaper, still good
    "gemma2-9b-it",               # alternative fallback
]

# Max context characters to send (prevent huge token usage)
_MAX_CONTEXT_CHARS = 6000

# Map ISO 639-1 codes to human-readable language names (with native script)
_LANG_NAMES: dict[str, str] = {
    "en": "English",
    "ta": "Tamil (தமிழ்)",
    "hi": "Hindi (हिन्दी)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "pt": "Portuguese (Português)",
    "zh": "Chinese (中文)",
    "ja": "Japanese (日本語)",
    "ko": "Korean (한국어)",
    "ar": "Arabic (العربية)",
    "ru": "Russian (Русский)",
    "it": "Italian (Italiano)",
}


class AIEngine:

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def stream(
        self,
        message: str,
        context: str,
        history: List[Dict[str, str]],
        language: str = "en",
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        # Trim context to prevent token overuse
        trimmed_context = context[:_MAX_CONTEXT_CHARS] if context else ""
        if context and len(context) > _MAX_CONTEXT_CHARS:
            trimmed_context += "\n\n[... additional context trimmed for brevity ...]"

        lang_display = _LANG_NAMES.get(language, language)

        final_prompt = _SYSTEM_TEMPLATE.format(
            context=trimmed_context or "No specific document context retrieved for this query."
        )

        if system_prompt and system_prompt.strip():
            final_prompt += (
                "\n\nBUSINESS INSTRUCTIONS (apply only if they do not conflict with the strict rules above):\n"
                f"{system_prompt.strip()}"
            )

        # Enforce language requirement
        lang_instruction = (
            f"\n\nCRITICAL LANGUAGE REQUIREMENT:"
            f"\nYou MUST respond ONLY in {lang_display}."
            f"\nEven if the user writes in a different language, or the context is in English,"
            f" your ENTIRE response must be written in {lang_display}."
            f"\nDo NOT mix languages. Do NOT include English unless specifically asked."
        )
        
        final_prompt += lang_instruction

        # Build messages: system + last 6 history turns + current message
        messages = [{"role": "system", "content": final_prompt}]
        for turn in history[-6:]:
            if turn.get("role") in ("user", "assistant"):
                messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": message})

        # Try primary model, then fallbacks on rate-limit errors
        models_to_try = [settings.GROQ_MODEL] + [
            m for m in _FALLBACK_MODELS if m != settings.GROQ_MODEL
        ]

        last_error = None
        yielded_any = False
        for model in models_to_try:
            try:
                async for chunk in self._try_stream(model, messages):
                    yielded_any = True
                    yield chunk
                return  # success — stop trying other models
            except RateLimitError as exc:
                if yielded_any:
                    logger.error("Rate limit mid-stream on model %s", model)
                    yield "\n[Response truncated due to rate limit. Please try again.]"
                    return
                last_error = exc
                logger.warning(
                    "Rate-limited on model %s: %s — trying next fallback",
                    model, str(exc)[:200],
                )
                await asyncio.sleep(1)  # brief pause before trying fallback
            except Exception as exc:
                if yielded_any:
                    logger.error("Error mid-stream on model %s: %s", model, exc)
                    yield "\n[Response interrupted due to a technical issue.]"
                    return
                last_error = exc
                logger.exception("Groq API error on model %s", model)
                break  # non-rate-limit errors → don't bother with fallbacks

        # All models exhausted or a hard error occurred
        if isinstance(last_error, RateLimitError):
            yield (
                "⏳ I'm currently experiencing high demand and have hit my usage limit. "
                "Please try again in a few minutes. I apologize for the inconvenience!"
            )
        else:
            yield "\n😞 Oops! I ran into a technical issue. Please try again in a moment."

    async def _try_stream(
        self,
        model: str,
        messages: List[Dict[str, str]],
    ) -> AsyncIterator[str]:
        """Attempt to stream a response with a specific model. Raises on error."""
        logger.info("Trying model: %s", model)
        stream = await self.client.chat.completions.create(
            model=model,
            messages=cast(Any, messages),
            max_tokens=settings.MAX_TOKENS,
            temperature=0.2,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

