"""
ChromaDB Service – manages collections per chatbot.
Each chatbot gets its own ChromaDB collection named `bot_{chatbot_id}`.
"""
from typing import List, Dict, Union
import chromadb
from chromadb.config import Settings as ChromaSettings
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Metadata values must be scalar types supported by ChromaDB
_MetadataValue = Union[str, int, float, bool, None]


class ChromaService:
    def __init__(self):
        self._client: chromadb.HttpClient | None = None  # type: ignore[type-arg]

    def _get_client(self) -> chromadb.HttpClient:  # type: ignore[type-arg]
        if self._client is None:
            self._client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    def _collection_name(self, chatbot_id: str) -> str:
        return f"bot_{chatbot_id.replace('-', '_')}"

    def _get_or_create_collection(self, chatbot_id: str):
        return self._get_client().get_or_create_collection(
            name=self._collection_name(chatbot_id),
            metadata={"hnsw:space": "cosine"},
        )

    async def add_chunks(
        self,
        chatbot_id: str,
        document_id: str,
        chunks: List[str],
        embeddings: List[List[float]],
    ) -> None:
        collection = self._get_or_create_collection(chatbot_id)
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        metadatas: List[Dict[str, _MetadataValue]] = [
            {"document_id": document_id, "chunk_index": i} for i in range(len(chunks))
        ]
        collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,  # type: ignore[arg-type]
            metadatas=metadatas,  # type: ignore[arg-type]
        )

    async def query(
        self,
        chatbot_id: str,
        query_embedding: List[float],
        n_results: int = 5,
    ) -> List[str]:
        try:
            collection = self._get_or_create_collection(chatbot_id)
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["documents"],  # type: ignore[list-item]
            )
            raw_docs = result.get("documents") or [[]]
            docs = raw_docs[0] if raw_docs else []
            return [str(d) for d in docs if d]
        except Exception as exc:
            logger.warning("ChromaDB query failed: %s", exc)
            return []

    async def delete_document(self, chatbot_id: str, document_id: str) -> None:
        try:
            collection = self._get_or_create_collection(chatbot_id)
            collection.delete(where={"document_id": document_id})
        except Exception as exc:
            logger.warning("ChromaDB delete failed: %s", exc)

    async def count_chunks(self, chatbot_id: str) -> int:
        try:
            collection = self._get_or_create_collection(chatbot_id)
            return collection.count()
        except Exception:
            return 0
