"""Tests for the ingest pipeline."""
import pytest
from app.services.document_processor import DocumentProcessor
from app.utils.text_splitter import TextSplitter


def test_text_splitter_basic():
    splitter = TextSplitter(chunk_size=10, overlap=2, chars_per_token=1)
    text = "A" * 100
    chunks = splitter.split(text)
    assert len(chunks) > 1
    assert all(len(c) <= 10 for c in chunks)


def test_text_splitter_empty():
    splitter = TextSplitter()
    assert splitter.split("") == []
    assert splitter.split("   ") == []


@pytest.mark.asyncio
async def test_document_processor_txt():
    processor = DocumentProcessor()
    content = b"Hello world. This is a test document."
    chunks = await processor.process("test.txt", content)
    assert len(chunks) >= 1
    assert "Hello world" in chunks[0]


@pytest.mark.asyncio
async def test_document_processor_unknown_ext_falls_back_to_plaintext():
    processor = DocumentProcessor()
    content = "This is plain text.".encode()
    chunks = await processor.process("file.xyz", content)
    assert len(chunks) >= 1
