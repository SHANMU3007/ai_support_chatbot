"""
Text Splitter – splits plain text into overlapping chunks using structural separators.

Optimized for recipes, documentation, and multi-topic documents:
- chunk_size = 350 tokens (~1400 chars) — preserves complete recipe sections / paragraphs
- overlap = 75 tokens (~300 chars) — ensures context boundary overlap
- Separators: double newlines, headers, recipe keywords, line breaks, sentence ends
"""
from typing import List
import re


class TextSplitter:
    def __init__(self, chunk_size: int = 350, overlap: int = 75, chars_per_token: int = 4):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.chars_per_token = chars_per_token
        self.target_chars = chunk_size * chars_per_token   # ~1400 chars
        self.overlap_chars = overlap * chars_per_token     # ~300 chars
        self._min_chars = max(1, min(20, (chunk_size * chars_per_token) // 2))

    def split(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        cleaned_text = text.strip()
        if len(cleaned_text) <= self.target_chars:
            return [cleaned_text]

        # 1. Break text into logical blocks using structural separators
        blocks = self._split_into_blocks(cleaned_text)

        # 2. Group blocks into chunks of target_chars with overlap
        chunks: List[str] = []
        current_block: List[str] = []
        current_len = 0

        for block in blocks:
            block_len = len(block)
            if not block.strip():
                continue

            # If a single block exceeds target_chars, hard split it
            if block_len > self.target_chars:
                if current_block:
                    chunks.append("\n\n".join(current_block).strip())
                    current_block = []
                    current_len = 0
                sub_chunks = self._hard_split(block)
                chunks.extend(sub_chunks)
                continue

            if current_len + block_len + 2 > self.target_chars:
                chunk_str = "\n\n".join(current_block).strip()
                if chunk_str:
                    chunks.append(chunk_str)
                # Overlap: keep trailing blocks up to overlap_chars
                overlap_blocks: List[str] = []
                overlap_len = 0
                for b in reversed(current_block):
                    if overlap_len + len(b) + 2 <= self.overlap_chars:
                        overlap_blocks.insert(0, b)
                        overlap_len += len(b) + 2
                    else:
                        break
                current_block = overlap_blocks
                current_len = overlap_len

            current_block.append(block)
            current_len += block_len + 2

        if current_block:
            final_chunk = "\n\n".join(current_block).strip()
            if final_chunk:
                chunks.append(final_chunk)

        return [c for c in chunks if len(c) >= self._min_chars or len(chunks) == 1]

    def _split_into_blocks(self, text: str) -> List[str]:
        """Split by double newlines, section headers, or numbered items."""
        # Split on double newlines or lines starting with headers / numbers / Recipe
        pattern = r"\n\s*\n|(?=\n[#=]{1,6}\s)|(?=\n(?:Recipe|Ingredients|Instructions|Step|\d+[\.\)])\s)"
        raw_blocks = re.split(pattern, text, flags=re.IGNORECASE)
        blocks = [b.strip() for b in raw_blocks if b and b.strip()]
        return blocks if blocks else [text]

    def _hard_split(self, text: str) -> List[str]:
        """Fallback split for huge blocks without structural breaks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.target_chars
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - self.overlap_chars
        return chunks


# Default singleton instance for convenience
splitter = TextSplitter()

