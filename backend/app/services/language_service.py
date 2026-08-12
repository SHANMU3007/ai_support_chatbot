"""
Language Service – detects the language of a message and optionally
translates it to English for processing, then translates the reply back.
"""
import logging

from groq import AsyncGroq
from langdetect import detect, LangDetectException  # type: ignore[import-untyped]

from app.config import settings

logger = logging.getLogger(__name__)

_LANG_NAMES: dict[str, str] = {
    "en": "English",
    "ta": "Tamil (தமிழ்)",
    "hi": "Hindi (हिन्दी)",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
    "it": "Italian",
}


class LanguageService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    def detect_language(self, text: str) -> str:
        """Returns ISO 639-1 language code, e.g. 'en', 'ta', 'hi'. Defaults to 'en'."""
        try:
            return detect(text)
        except LangDetectException:
            return "en"

    async def translate(self, text: str, target_lang: str = "en") -> str:
        """Translate *text* to *target_lang* using Groq."""
        if not text.strip():
            return text
        lang_display = _LANG_NAMES.get(target_lang, target_lang)
        prompt = (
            f"Translate the following text to {lang_display}. "
            f"Return ONLY the translated text, no explanation, no extra commentary.\n\n{text}"
        )
        response = await self.client.chat.completions.create(
            model=settings.GROQ_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return (response.choices[0].message.content or text).strip()
