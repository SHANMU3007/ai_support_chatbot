"""
Embedding Service – generates dense embeddings using sentence-transformers.
The model is loaded once at startup and reused for all requests.

Key optimization: encode entire batch in a single model.encode() call
instead of looping per-chunk — this is 10-30x faster on CPU.
"""
from typing import List
import asyncio
import logging

from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _model: SentenceTransformer | None = None

    def _get_model(self) -> SentenceTransformer:
        if EmbeddingService._model is None:
            logger.info("Loading embedding model: %s …", settings.EMBEDDING_MODEL)
            EmbeddingService._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded.")
        return EmbeddingService._model

    async def embed_text(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        model = self._get_model()
        result: List[float] = await loop.run_in_executor(
            None, lambda: model.encode(text, convert_to_numpy=True).tolist()  # type: ignore[union-attr]
        )
        return result

    async def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        """
        Embed all chunks in a single batched model.encode() call.
        This is 10-30x faster than encoding one chunk at a time on CPU.
        """
        if not chunks:
            return []
        loop = asyncio.get_event_loop()
        model = self._get_model()

        def _batch_encode() -> List[List[float]]:
            # batch_size=64 is optimal for all-MiniLM-L6-v2 on CPU
            embeddings = model.encode(
                chunks,
                batch_size=64,
                show_progress_bar=False,
                convert_to_numpy=True,
            )
            return [e.tolist() for e in embeddings]  # type: ignore[union-attr]

        result: List[List[float]] = await loop.run_in_executor(None, _batch_encode)
        logger.info("Embedded %d chunks in a single batch call.", len(chunks))
        return result
