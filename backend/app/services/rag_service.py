"""
RAG Service – orchestrates retrieval-augmented generation.
1. Embed the incoming question.
2. Query ChromaDB for relevant chunks.
3. Stream the AI response via Groq.
"""
from typing import AsyncIterator, List, Dict, Optional
import logging

from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.chroma_service import ChromaService
from app.services.ai_engine import AIEngine
from app.services.language_service import LanguageService

logger = logging.getLogger(__name__)

_NO_CONTEXT_REPLY: Dict[str, str] = {
    "en": "I couldn’t find this information in the uploaded knowledge base. Please upload the relevant document details or ask a question related to the available content.",
    "ta": "பதிவேற்றப்பட்ட அறிவுத்தளத்தில் இந்த தகவல் கிடைக்கவில்லை. தொடர்புடைய ஆவணத்தை பதிவேற்றவும் அல்லது உள்ளடக்கத்துடன் தொடர்புடைய கேள்வியை கேட்கவும்.",
    "hi": "अपलोड किए गए नॉलेज बेस में यह जानकारी नहीं मिली। कृपया संबंधित दस्तावेज़ अपलोड करें या उपलब्ध सामग्री से जुड़ा प्रश्न पूछें।",
}


class RagService:
    def __init__(self):
        self.embedding_svc = EmbeddingService()
        self.chroma_svc = ChromaService()
        self.ai_engine = AIEngine()
        self.language_svc = LanguageService()

    async def stream_response(
        self,
        chatbot_id: str,
        session_id: str,
        message: str,
        history: List[Dict[str, str]],
        visitor_id: str = "",
        language: str = "en",
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        # 1. Retrieve relevant context
        # For non-English queries, translate to English for better embedding/retrieval
        # (knowledge base is typically in English; original message is still sent to AI)
        if language not in ("en", "") and message.strip():
            try:
                english_query = await self.language_svc.translate(message, "en")
                logger.info("Translated query for retrieval: '%s' → '%s'", message[:60], english_query[:60])
            except Exception:
                english_query = message  # fall back to original on error
        else:
            english_query = message

        query_embedding = await self.embedding_svc.embed_text(english_query)
        chunks = await self.chroma_svc.query(
            chatbot_id=chatbot_id,
            query_embedding=query_embedding,
            n_results=settings.CONTEXT_CHUNKS,
            min_similarity=settings.RAG_MIN_SIMILARITY,
        )
        context = "\n\n---\n\n".join(chunks) if chunks else ""

        logger.info(
            "RAG query for chatbot=%s session=%s  chunks_retrieved=%d",
            chatbot_id,
            session_id,
            len(chunks),
        )

        # 2. Stream AI response via Groq AI Engine
        async for chunk in self.ai_engine.stream(
            message=message,
            context=context,
            history=history,
            language=language,
            system_prompt=system_prompt,
        ):
            yield chunk
