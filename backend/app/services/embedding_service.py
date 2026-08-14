"""
Embedding Service – generates dense embeddings using fastembed.
The model is loaded once at startup and reused for all requests.
Fastembed uses ONNX Runtime under the hood, using ~80MB RAM instead of ~800MB (PyTorch),
preventing Railway out-of-memory container crashes.
"""
from typing import List
import asyncio
import logging

from fastembed import TextEmbedding

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _model: TextEmbedding | None = None

    def _get_model(self) -> TextEmbedding:
        if EmbeddingService._model is None:
            # Map standard HuggingFace/SentenceTransformer model name to fastembed model name
            model_name = settings.EMBEDDING_MODEL
            if model_name == "all-MiniLM-L6-v2":
                model_name = "sentence-transformers/all-MiniLM-L6-v2"
            
            logger.info("Loading fastembed model: %s …", model_name)
            EmbeddingService._model = TextEmbedding(model_name=model_name)
            logger.info("Embedding model loaded successfully.")
        return EmbeddingService._model

    async def embed_text(self, text: str) -> List[float]:
        loop = asyncio.get_running_loop()
        model = self._get_model()
        
        def _encode() -> List[float]:
            # model.embed returns a generator of numpy arrays. We convert the first item to list.
            embeddings = list(model.embed([text]))
            return embeddings[0].tolist()

        result: List[float] = await loop.run_in_executor(None, _encode)
        return result

    async def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        """
        Embed all chunks in a single batched call.
        """
        if not chunks:
            return []
        loop = asyncio.get_running_loop()
        model = self._get_model()

        def _batch_encode() -> List[List[float]]:
            # fastembed model.embed natively handles batching efficiently
            embeddings = list(model.embed(chunks, batch_size=64))
            return [e.tolist() for e in embeddings]

        result: List[List[float]] = await loop.run_in_executor(None, _batch_encode)
        logger.info("Embedded %d chunks successfully via fastembed.", len(chunks))
        return result
