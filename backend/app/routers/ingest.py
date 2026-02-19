from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
import logging

from app.models.document import FAQPair, IngestFAQRequest, IngestURLRequest
from app.services.document_processor import DocumentProcessor
from app.services.url_scraper import URLScraper
from app.services.embedding_service import EmbeddingService
from app.services.chroma_service import ChromaService

logger = logging.getLogger(__name__)
router = APIRouter()

doc_processor = DocumentProcessor()
url_scraper = URLScraper()
embedding_service = EmbeddingService()
chroma_service = ChromaService()


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


# ── Background task helpers ──────────────────────────────────────────────


async def _process_and_embed(
    chatbot_id: str, document_id: str, filename: str, content: bytes
):
    try:
        chunks = await doc_processor.process(filename=filename, content=content)
        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info("Ingested document %s (%d chunks)", document_id, len(chunks))
    except Exception:
        logger.exception("Failed to ingest document %s", document_id)


async def _embed_faq(chatbot_id: str, document_id: str, pairs: list[FAQPair]):
    try:
        chunks = [f"Q: {p.question}\nA: {p.answer}" for p in pairs]
        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info("Ingested FAQ %s (%d pairs)", document_id, len(pairs))
    except Exception:
        logger.exception("Failed to ingest FAQ %s", document_id)


async def _scrape_and_embed(
    chatbot_id: str, document_id: str, url: str, max_pages: int = 50
):
    try:
        logger.info("Starting crawl: %s (max_pages=%d)", url, max_pages)
        combined_text, pages_crawled = await url_scraper.crawl(url, max_pages=max_pages)
        from app.utils.text_splitter import TextSplitter
        chunks = TextSplitter().split(combined_text)
        embeddings = await embedding_service.embed_chunks(chunks)
        await chroma_service.add_chunks(
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info(
            "Ingested URL %s — pages: %d, chunks: %d",
            url, pages_crawled, len(chunks),
        )
    except Exception:
        logger.exception("Failed to ingest URL %s", url)
