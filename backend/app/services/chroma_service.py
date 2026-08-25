"""
ChromaDB Service – manages collections per chatbot.
Each chatbot gets its own ChromaDB collection named `bot_{chatbot_id}`.

Storage strategy:
  - Railway / Docker: PersistentClient at /data/chroma (survives restarts)
  - Local dev with remote ChromaDB: HttpClient at CHROMA_HOST:CHROMA_PORT
  - Fallback: EphemeralClient (in-memory, for tests only)
"""
from typing import List, Dict, Union
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Metadata values must be scalar types supported by ChromaDB
_MetadataValue = Union[str, int, float, bool, None]

# Persistent path for Railway/Docker deployments
_CHROMA_PERSIST_PATH = os.environ.get("CHROMA_PERSIST_PATH", "/data/chroma")


class ChromaService:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client

        # 1. Try HTTP client (explicit remote ChromaDB service)
        chroma_host = settings.CHROMA_HOST
        if chroma_host and chroma_host not in ("localhost", "127.0.0.1"):
            try:
                client = chromadb.HttpClient(
                    host=chroma_host,
                    port=settings.CHROMA_PORT,
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
                client.heartbeat()
                self._client = client
                logger.info("ChromaDB: connected to remote HttpClient at %s:%s", chroma_host, settings.CHROMA_PORT)
                return self._client
            except Exception as exc:
                logger.warning("ChromaDB HttpClient failed for %s:%s (%s) — trying persistent storage.", chroma_host, settings.CHROMA_PORT, exc)

        # 2. Use PersistentClient (Railway volume / local disk)
        try:
            os.makedirs(_CHROMA_PERSIST_PATH, exist_ok=True)
            client = chromadb.PersistentClient(
                path=_CHROMA_PERSIST_PATH,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._client = client
            logger.info("ChromaDB: using PersistentClient at %s", _CHROMA_PERSIST_PATH)
            return self._client
        except Exception as exc:
            logger.warning("ChromaDB PersistentClient failed (%s) — falling back to EphemeralClient.", exc)

        # 3. Last resort: ephemeral (in-memory, no persistence)
        self._client = chromadb.EphemeralClient(
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        logger.warning("ChromaDB: using EphemeralClient (data will NOT persist across restarts).")
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
        logger.info("ChromaDB: upserted %d chunks for document %s (chatbot %s)", len(chunks), document_id, chatbot_id)

    async def query(
        self,
        chatbot_id: str,
        query_embedding: List[float],
        n_results: int = 5,
        min_similarity: float = 0.0,
    ) -> List[str]:
        try:
            collection = self._get_or_create_collection(chatbot_id)
            try:
                result = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results,
                    include=["documents", "distances"],  # type: ignore[list-item]
                )
            except Exception as exc:
                logger.warning("Chroma query with distances failed, retrying docs-only: %s", exc)
                result = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results,
                    include=["documents"],  # type: ignore[list-item]
                )

            raw_docs = result.get("documents") or [[]]
            raw_distances = result.get("distances") or [[]]
            docs = raw_docs[0] if raw_docs else []
            distances = raw_distances[0] if raw_distances else []

            if not distances or min_similarity <= 0:
                return [str(d) for d in docs if d]

            filtered_docs: List[str] = []
            for index, doc in enumerate(docs):
                if not doc:
                    continue
                if index >= len(distances) or distances[index] is None:
                    continue

                similarity = 1.0 - float(distances[index])
                if similarity >= min_similarity:
                    filtered_docs.append(str(doc))

            logger.info(
                "Chroma query chatbot=%s docs=%d filtered=%d min_similarity=%.2f",
                chatbot_id,
                len(docs),
                len(filtered_docs),
                min_similarity,
            )

            if not filtered_docs:
                fallback_docs = [str(d) for d in docs if d][:5]
                logger.info(
                    "Chroma query fallback chatbot=%s using top_docs=%d after strict filter",
                    chatbot_id,
                    len(fallback_docs),
                )
                return fallback_docs

            return filtered_docs
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
