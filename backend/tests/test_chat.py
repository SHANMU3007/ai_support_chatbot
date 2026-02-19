"""Tests for the FastAPI /chat/message endpoint."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_chat_message_streams():
    async def _fake_stream(*args, **kwargs):
        for word in ["Test", " response"]:
            yield word

    with patch(
        "app.routers.chat.rag_service.stream_response",
        side_effect=_fake_stream,
    ):
        with client.stream(
            "POST",
            "/chat/message",
            json={
                "chatbot_id": "bot-1",
                "session_id": "sess-1",
                "message": "Hello",
                "history": [],
            },
        ) as resp:
            assert resp.status_code == 200
            content = b"".join(resp.iter_bytes())
            assert b"Test" in content
