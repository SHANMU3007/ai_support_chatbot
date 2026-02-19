"""
Embedding Service – generates dense embeddings using sentence-transformers.
The model is loaded once at startup and reused for all requests.
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
        if self._model is None:
            logger.info("Loading embedding model: %s …", settings.EMBEDDING_MODEL)
            EmbeddingService._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded.")
        assert EmbeddingService._model is not None
        return EmbeddingService._model

    async def embed_text(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        model = self._get_model()
        result: List[float] = await loop.run_in_executor(
            None, lambda: model.encode(text, convert_to_numpy=True).tolist()  # type: ignore[union-attr]
        )
        return result

    async def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        loop = asyncio.get_event_loop()
        model = self._get_model()
        result: List[List[float]] = await loop.run_in_executor(
            None, lambda: [model.encode(c, convert_to_numpy=True).tolist() for c in chunks]  # type: ignore[union-attr]
        )
        return result
