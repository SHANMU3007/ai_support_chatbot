import asyncio
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
import logging
import sqlalchemy as sa


from app.database import engine
from app.config import settings
from app.models.document import FAQPair, IngestFAQRequest, IngestURLRequest
from app.services.document_processor import DocumentProcessor
from app.services.url_scraper import URLScraper
from app.services.crawler_orchestrator import CrawlerOrchestrator
from app.services.embedding_service import EmbeddingService
from app.services.chroma_service import ChromaService

logger = logging.getLogger(__name__)
router = APIRouter()

doc_processor = DocumentProcessor()
url_scraper = URLScraper()
crawler_orchestrator = CrawlerOrchestrator()
embedding_service = EmbeddingService()
chroma_service = ChromaService()


async def _update_status(document_id: str, status: str, chunk_count: int = 0) -> None:
    """Update document status directly in Postgres (with retry on transient errors)."""
    for attempt in range(3):
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    sa.text(
                        'UPDATE "Document" SET status = CAST(:status AS "DocStatus"), '
                        '"chunkCount" = :chunk_count, "updatedAt" = now() '
                        'WHERE id = :id'
                    ),
                    {"status": status, "chunk_count": chunk_count, "id": document_id},
                )
            logger.info("Document %s → %s (chunks=%d)", document_id, status, chunk_count)
            return  # success
        except Exception as exc:
            if attempt < 2:
                logger.warning(
                    "DB update failed for %s (attempt %d/3): %s — retrying in 1s",
                    document_id, attempt + 1, exc,
                )
                await asyncio.sleep(1.0)
            else:
                logger.exception("Failed to update status for document %s after 3 attempts", document_id)



@router.post("/document")
async def ingest_document(
    background_tasks: BackgroundTasks,
    chatbot_id: str = Form(...),
    document_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Ingest an uploaded file into ChromaDB."""
    content = await file.read()
    background_tasks.add_task(
        _process_and_embed,
        chatbot_id=chatbot_id,
        document_id=document_id,
        filename=file.filename or "upload",
        content=content,
    )
    return JSONResponse({"status": "processing", "document_id": document_id})


@router.post("/faq")
async def ingest_faq(request: IngestFAQRequest, background_tasks: BackgroundTasks):
    """Ingest FAQ pairs directly as text chunks."""
    background_tasks.add_task(
        _embed_faq,
        chatbot_id=request.chatbot_id,
        document_id=request.document_id,
        pairs=request.pairs,
    )
    return JSONResponse({"status": "processing", "document_id": request.document_id})


@router.post("/url")
async def ingest_url(request: IngestURLRequest, background_tasks: BackgroundTasks):
    """Crawl a website (up to max_pages pages) and ingest the content."""
    background_tasks.add_task(
        _scrape_and_embed,
        chatbot_id=request.chatbot_id,
        document_id=request.document_id,
        url=request.url,
        max_pages=request.max_pages,
    )
    return JSONResponse({
        "status": "processing",
        "document_id": request.document_id,
        "max_pages": request.max_pages,
    })


@router.delete("/document/{chatbot_id}/{document_id}")
async def delete_document(chatbot_id: str, document_id: str):
    """Remove a document's embeddings from ChromaDB."""
    await chroma_service.delete_document(chatbot_id, document_id)
    return JSONResponse({"status": "deleted"})


import uuid
from app.utils.text_splitter import splitter

async def _save_raw_text(document_id: str, chatbot_id: str, raw_text: str, source_type: str = "TEXT", crawler_used: str | None = None) -> None:
    """Save raw extracted text into RawExtractedText table and update Document content in Postgres."""
    if not raw_text:
        return
    char_count = len(raw_text)
    word_count = len(raw_text.split())
    raw_id = f"raw_{uuid.uuid4().hex[:16]}"

    for attempt in range(3):
        try:
            async with engine.begin() as conn:
                # 1. Update Document content
                await conn.execute(
                    sa.text(
                        'UPDATE "Document" SET content = :content, "updatedAt" = now() WHERE id = :id'
                    ),
                    {"content": raw_text, "id": document_id},
                )
                # 2. Upsert into RawExtractedText
                await conn.execute(
                    sa.text(
                        '''
                        INSERT INTO "RawExtractedText" (id, "documentId", "chatbotId", "rawText", "charCount", "wordCount", "sourceType", "crawlerUsed", "extractedAt", "updatedAt")
                        VALUES (:id, :document_id, :chatbot_id, :raw_text, :char_count, :word_count, CAST(:source_type AS "DocType"), :crawler_used, now(), now())
                        ON CONFLICT ("documentId") DO UPDATE
                        SET "rawText" = EXCLUDED."rawText",
                            "charCount" = EXCLUDED."charCount",
                            "wordCount" = EXCLUDED."wordCount",
                            "sourceType" = EXCLUDED."sourceType",
                            "crawlerUsed" = EXCLUDED."crawlerUsed",
                            "updatedAt" = now()
                        '''
                    ),
                    {
                        "id": raw_id,
                        "document_id": document_id,
                        "chatbot_id": chatbot_id,
                        "raw_text": raw_text,
                        "char_count": char_count,
                        "word_count": word_count,
                        "source_type": source_type,
                        "crawler_used": crawler_used,
                    },
                )
            logger.info("Saved RawExtractedText for document %s (%d chars, crawler=%s)", document_id, char_count, crawler_used)
            return
        except Exception as exc:
            if attempt < 2:
                logger.warning("Failed to save RawExtractedText (attempt %d/3): %s", attempt + 1, exc)
                await asyncio.sleep(1.0)
            else:
                logger.exception("Failed to save RawExtractedText for document %s after 3 attempts", document_id)


# ── Background task helpers ──────────────────────────────────────────────


async def _process_and_embed(
    chatbot_id: str, document_id: str, filename: str, content: bytes
):
    await _update_status(document_id, "PROCESSING")
    try:
        raw_text = await doc_processor.extract_text(filename=filename, content=content)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        source_type = "PDF" if ext == "pdf" else ("DOCX" if ext in ("docx", "doc") else "TEXT")

        await _save_raw_text(document_id=document_id, chatbot_id=chatbot_id, raw_text=raw_text, source_type=source_type)

        chunks = splitter.split(raw_text)
        if not chunks:
            logger.warning("No chunks produced from document %s", filename)
            await _update_status(document_id, "FAILED")
            return

        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info("Ingested document %s (%d chunks)", document_id, len(chunks))
        await _update_status(document_id, "DONE", len(chunks))
    except Exception as exc:
        logger.exception("Failed to ingest document %s: %s", document_id, exc)
        await _update_status(document_id, "FAILED")


async def _embed_faq(chatbot_id: str, document_id: str, pairs: list[FAQPair]):
    await _update_status(document_id, "PROCESSING")
    try:
        chunks = [f"Q: {p.question}\nA: {p.answer}" for p in pairs]
        raw_text = "\n\n".join(chunks)
        await _save_raw_text(document_id=document_id, chatbot_id=chatbot_id, raw_text=raw_text, source_type="FAQ")

        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info("Ingested FAQ %s (%d pairs)", document_id, len(pairs))
        await _update_status(document_id, "DONE", len(chunks))
    except Exception:
        logger.exception("Failed to ingest FAQ %s", document_id)
        await _update_status(document_id, "FAILED")


async def _scrape_and_embed(
    chatbot_id: str, document_id: str, url: str, max_pages: int = 50
):
    await _update_status(document_id, "PROCESSING")
    try:
        logger.info("Starting crawler orchestrator for %s (max_pages=%d)", url, max_pages)

        # Cap total crawl time at 5 minutes
        try:
            combined_text, pages_crawled, crawler_used = await asyncio.wait_for(
                crawler_orchestrator.crawl(url, max_pages=max_pages),
                timeout=300.0,
            )
        except asyncio.TimeoutError:
            logger.warning("Crawl timed out after 300s for %s — proceeding with partial data", url)
            try:
                combined_text, pages_crawled, crawler_used = await asyncio.wait_for(
                    crawler_orchestrator.crawl(url, max_pages=10),
                    timeout=120.0,
                )
                logger.info("Partial crawl succeeded: %d pages from %s", pages_crawled, url)
            except asyncio.TimeoutError:
                logger.error("Partial crawl also timed out for %s", url)
                await _update_status(document_id, "FAILED")
                return

        if not combined_text or pages_crawled == 0:
            logger.warning("No content scraped from %s", url)
            await _update_status(document_id, "FAILED")
            return

        await _save_raw_text(document_id=document_id, chatbot_id=chatbot_id, raw_text=combined_text, source_type="URL", crawler_used=crawler_used)

        chunks = splitter.split(combined_text)

        if not chunks:
            logger.warning("No chunks produced from crawl of %s", url)
            await _update_status(document_id, "FAILED")
            return

        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info(
            "Ingested URL %s via %s — pages: %d, chunks: %d",
            url, crawler_used, pages_crawled, len(chunks),
        )
        await _update_status(document_id, "DONE", len(chunks))
    except Exception:
        logger.exception("Failed to ingest URL %s", url)
        await _update_status(document_id, "FAILED")

