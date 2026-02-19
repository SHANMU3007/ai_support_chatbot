"""Tests for the RAG pipeline."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.rag_service import RagService


@pytest.mark.asyncio
async def test_stream_response_returns_chunks():
    service = RagService()

    async def _fake_embed(text):
        return [0.0] * 384

    async def _fake_query(*args, **kwargs):
        return ["Chunk 1 about returns policy.", "Chunk 2 about shipping."]

    async def _fake_stream(*args, **kwargs):
        for word in ["Hello", " ", "world"]:
            yield word

    with (
        patch.object(service.embedding_svc, "embed_text", side_effect=_fake_embed),
        patch.object(service.chroma_svc, "query", side_effect=_fake_query),
        patch.object(service.claude_svc, "stream", side_effect=_fake_stream),
    ):
        result = []
        async for chunk in service.stream_response(
            chatbot_id="bot-1",
            session_id="sess-1",
            message="What is the return policy?",
            history=[],
        ):
            result.append(chunk)

    assert result == ["Hello", " ", "world"]


@pytest.mark.asyncio
async def test_stream_response_empty_context():
    """When no chunks are found, the service should still stream (with empty context)."""
    service = RagService()

    async def _fake_embed(text):
        return [0.0] * 384

    async def _fake_query(*args, **kwargs):
        return []

    async def _fake_stream(*args, **kwargs):
        yield "I don't have information about that."

    with (
        patch.object(service.embedding_svc, "embed_text", side_effect=_fake_embed),
        patch.object(service.chroma_svc, "query", side_effect=_fake_query),
        patch.object(service.claude_svc, "stream", side_effect=_fake_stream),
    ):
        result = []
        async for chunk in service.stream_response(
            chatbot_id="bot-1",
            session_id="sess-1",
            message="What is the meaning of life?",
            history=[],
        ):
            result.append(chunk)

    assert len(result) == 1
    assert "don't have" in result[0]
