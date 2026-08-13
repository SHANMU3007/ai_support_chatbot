"""
Text Splitter – splits plain text into overlapping chunks.

Tuned for speed + quality:
- chunk_size = 800 tokens (~3200 chars) — larger chunks = fewer embeddings = faster
- overlap = 80 tokens — enough context overlap for good RAG retrieval
- Skips chunks that are mostly whitespace or too short to be useful
"""
from typing import List


class TextSplitter:
    def __init__(self, chunk_size: int = 800, overlap: int = 80, chars_per_token: int = 4):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.chars_per_token = chars_per_token
        # Minimum characters for a chunk to be worth embedding
        self._min_chars = 100

    def _approx_tokens(self, text: str) -> int:
        return len(text) // self.chars_per_token

    def split(self, text: str) -> List[str]:
        if not text.strip():
            return []

        chunk_chars = self.chunk_size * self.chars_per_token   # 3200 chars
        overlap_chars = self.overlap * self.chars_per_token    # 320 chars

        chunks: List[str] = []
        start = 0
        while start < len(text):
            end = start + chunk_chars
            chunk = text[start:end].strip()
            # Only keep chunks with enough meaningful content
            if chunk and len(chunk) >= self._min_chars:
                chunks.append(chunk)
            start = end - overlap_chars

        return chunks
