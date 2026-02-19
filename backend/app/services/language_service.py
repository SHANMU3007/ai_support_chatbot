"""
Language Service – detects the language of a message and optionally
translates it to English for processing, then translates the reply back.
"""
import logging

import anthropic
from langdetect import detect, LangDetectException  # type: ignore[import-untyped]

from app.config import settings

logger = logging.getLogger(__name__)


class LanguageService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    def detect_language(self, text: str) -> str:
        """Returns ISO 639-1 language code, e.g. 'en', 'fr', 'de'. Defaults to 'en'."""
        try:
            return detect(text)
        except LangDetectException:
            return "en"

    async def translate(self, text: str, target_lang: str = "en") -> str:
        """Translate *text* to *target_lang* using Claude."""
        if not text.strip():
            return text
        prompt = (
            f"Translate the following text to {target_lang}. "
            f"Return ONLY the translated text, no explanation.\n\n{text}"
        )
        message = await self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        content_block = message.content[0]
        if not isinstance(content_block, anthropic.types.TextBlock):
            return text
        return content_block.text.strip()
