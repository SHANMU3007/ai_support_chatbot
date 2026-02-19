"""
RAG Service – orchestrates retrieval-augmented generation.
1. Embed the incoming question.
2. Query ChromaDB for relevant chunks.
3. Stream the Claude response.
"""
from typing import AsyncIterator, List, Dict
import logging

from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.chroma_service import ChromaService
from app.services.claude_service import ClaudeService

logger = logging.getLogger(__name__)


class RagService:
    def __init__(self):
        self.embedding_svc = EmbeddingService()
        self.chroma_svc = ChromaService()
        self.claude_svc = ClaudeService()

    async def stream_response(
        self,
        chatbot_id: str,
        session_id: str,
        message: str,
        history: List[Dict[str, str]],
        visitor_id: str = "",
    ) -> AsyncIterator[str]:
        # 1. Retrieve relevant context
        query_embedding = await self.embedding_svc.embed_text(message)
        chunks = await self.chroma_svc.query(
            chatbot_id=chatbot_id,
            query_embedding=query_embedding,
            n_results=settings.CONTEXT_CHUNKS,
        )
        context = "\n\n---\n\n".join(chunks) if chunks else ""

        logger.info(
            "RAG query for chatbot=%s session=%s  chunks_retrieved=%d",
            chatbot_id,
            session_id,
            len(chunks),
        )

        # 2. Stream Claude response
        async for chunk in self.claude_svc.stream(
            message=message,
            context=context,
            history=history,
        ):
            yield chunk
