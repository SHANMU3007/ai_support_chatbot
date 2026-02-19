"""
Document Processor – extracts plain text from PDF, DOCX, and TXT files,
then splits into overlapping chunks.
"""
from typing import List
import io
import logging

import fitz  # type: ignore[import-untyped]  # PyMuPDF has no stubs
import docx

from app.utils.text_splitter import TextSplitter

logger = logging.getLogger(__name__)
splitter = TextSplitter()


class DocumentProcessor:
    async def process(self, filename: str, content: bytes) -> List[str]:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            text = _extract_pdf(content)
        elif ext in ("docx", "doc"):
            text = _extract_docx(content)
        else:
            text = content.decode("utf-8", errors="replace")

        chunks = splitter.split(text)
        logger.info("Processed '%s': %d chars → %d chunks", filename, len(text), len(chunks))
        return chunks


def _extract_pdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")  # type: ignore[call-arg]
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text())  # type: ignore[attr-defined]
    doc.close()
    return "\n".join(parts)


def _extract_docx(content: bytes) -> str:
    d = docx.Document(io.BytesIO(content))
    return "\n".join(p.text for p in d.paragraphs if p.text.strip())
