"""
RAG Service – orchestrates retrieval-augmented generation.
1. Embed the incoming question.
2. Query ChromaDB for relevant chunks.
3. Stream the AI response via Groq.
"""
from typing import AsyncIterator, List, Dict, Optional
import logging

import sqlalchemy as sa

from app.config import settings
from app.database import engine
from app.services.embedding_service import EmbeddingService
from app.services.chroma_service import ChromaService
from app.services.ai_engine import AIEngine
from app.services.language_service import LanguageService
from app.utils.text_splitter import splitter

logger = logging.getLogger(__name__)


async def _get_postgres_fallback_context(chatbot_id: str, query: str) -> str:
    """Fallback context fetch directly from Postgres Document / RawExtractedText if ChromaDB has no chunks."""
    try:
        async with engine.connect() as conn:
            # 1. Fetch raw text from RawExtractedText
            result = await conn.execute(
                sa.text(
                    'SELECT "rawText" FROM "RawExtractedText" WHERE "chatbotId" = :cid ORDER BY "extractedAt" DESC'
                ),
                {"cid": chatbot_id},
            )
            raw_rows = result.scalars().all()
            texts = [r for r in raw_rows if r and r.strip()]

            if not texts:
                # Try Document table
                doc_result = await conn.execute(
                    sa.text(
                        'SELECT content FROM "Document" WHERE "chatbotId" = :cid AND status = \'DONE\' AND content != \'\' ORDER BY "createdAt" DESC'
                    ),
                    {"cid": chatbot_id},
                )
                texts = [r for r in doc_result.scalars().all() if r and r.strip()]

            if not texts:
                return ""

            # Combine texts and split into chunks
            all_text = "\n\n".join(texts)
            all_chunks = splitter.split(all_text)
            if not all_chunks:
                return all_text[:8000]

            # Simple keyword relevance scoring
            query_words = set(query.lower().split())
            scored_chunks = []
            for chunk in all_chunks:
                chunk_lower = chunk.lower()
                score = sum(1 for word in query_words if len(word) > 2 and word in chunk_lower)
                scored_chunks.append((score, chunk))

            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            # Pick top chunks; if top score is 0, pick first 6 chunks
            top_chunks = [c for s, c in scored_chunks[:6]]
            logger.info("Postgres fallback retrieved %d chunks for chatbot=%s", len(top_chunks), chatbot_id)
            return "\n\n---\n\n".join(top_chunks)
    except Exception as exc:
        logger.warning("Postgres fallback retrieval failed for chatbot=%s: %s", chatbot_id, exc)
        return ""


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

        if not context:
            logger.info("ChromaDB produced no context for chatbot=%s, attempting Postgres fallback...", chatbot_id)
            context = await _get_postgres_fallback_context(chatbot_id, english_query)

        logger.info(
            "RAG query for chatbot=%s session=%s  chunks_retrieved=%d context_len=%d",
            chatbot_id,
            session_id,
            len(chunks),
            len(context),
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

