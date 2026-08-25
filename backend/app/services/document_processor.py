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
    async def extract_text(self, filename: str, content: bytes) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            return _extract_pdf(content)
        elif ext in ("docx", "doc"):
            return _extract_docx(content)
        else:
            return content.decode("utf-8", errors="replace")

    async def process(self, filename: str, content: bytes) -> List[str]:
        text = await self.extract_text(filename, content)
        chunks = splitter.split(text)
        logger.info("Processed '%s': %d chars → %d chunks", filename, len(text), len(chunks))
        return chunks


def _extract_pdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")  # type: ignore[call-arg]
    parts: list[str] = []
    for page in doc:
        txt = page.get_text()  # type: ignore[attr-defined]
        if txt:
            parts.append(txt)
    doc.close()
    full_text = "\n".join(parts).strip()
    if not full_text:
        raise ValueError(
            "No readable text found in PDF. The document may be a scanned image or non-text PDF."
        )
    return full_text


def _extract_docx(content: bytes) -> str:
    d = docx.Document(io.BytesIO(content))
    full_text = "\n".join(p.text for p in d.paragraphs if p.text.strip()).strip()
    if not full_text:
        raise ValueError("No readable text found in DOCX file.")
    return full_text

