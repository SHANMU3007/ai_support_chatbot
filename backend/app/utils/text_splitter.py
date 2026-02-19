"""
Text Splitter – splits plain text into overlapping chunks of ~500 tokens
(approximated as 4 chars/token).
"""
from typing import List


class TextSplitter:
    def __init__(self, chunk_size: int = 500, overlap: int = 50, chars_per_token: int = 4):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.chars_per_token = chars_per_token

    def _approx_tokens(self, text: str) -> int:
        return len(text) // self.chars_per_token

    def split(self, text: str) -> List[str]:
        if not text.strip():
            return []

        chunk_chars = self.chunk_size * self.chars_per_token
        overlap_chars = self.overlap * self.chars_per_token

        chunks: List[str] = []
        start = 0
        while start < len(text):
            end = start + chunk_chars
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap_chars

        return chunks
