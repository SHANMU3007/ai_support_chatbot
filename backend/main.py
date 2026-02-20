import asyncio
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db
from app.routers import chat, ingest, embeddings, health, telegram

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ── colour helpers (work on Windows 10+ and all Unix terminals) ───────────────
GRN  = "\033[92m"
YLW  = "\033[93m"
RED  = "\033[91m"
CYN  = "\033[96m"
BOLD = "\033[1m"
RST  = "\033[0m"

def _ok(msg: str)  -> None: print(f"  {GRN}✔{RST}  {msg}", flush=True)
def _wait(msg: str)-> None: print(f"  {YLW}…{RST}  {msg}", flush=True)
def _fail(msg: str)-> None: print(f"  {RED}✘{RST}  {msg}", flush=True)
def _hdr(msg: str) -> None: print(f"\n{BOLD}{CYN}{msg}{RST}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _hdr("══════════  SupportIQ Backend  ══════════")

    # ── 1. Config ─────────────────────────────────────────────────────────────
    _wait("Loading configuration …")
    if not settings.GROQ_API_KEY:
        _fail("GROQ_API_KEY is not set – AI responses will fail!")
    else:
        _ok(f"Config loaded  (model: {settings.GROQ_MODEL})")

    # ── 2. Database ───────────────────────────────────────────────────────────
    _wait("Connecting to PostgreSQL and running migrations …")
    try:
        await init_db()
        _ok(f"Database ready  ({settings.DATABASE_URL.split('@')[-1]})")
    except Exception as exc:
        _fail(f"Database error: {exc}")
        sys.exit(1)

    # ── 3. ChromaDB ───────────────────────────────────────────────────────────
    _wait(f"Checking ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT} …")
    try:
        import httpx
        r = httpx.get(
            f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}/api/v1/heartbeat",
            timeout=3,
        )
        if r.status_code == 200:
            _ok("ChromaDB reachable")
        else:
            _fail(f"ChromaDB returned HTTP {r.status_code}")
    except Exception:
        _fail("ChromaDB unreachable – document search will not work")

    # ── 4. Routers ────────────────────────────────────────────────────────────
    _ok("Routers mounted  (health · chat · ingest · embeddings · telegram)")

    _hdr("══════════  Startup complete – listening on :8000  ══════════\n")

    try:
        yield
    except asyncio.CancelledError:
        pass  # Python 3.13 sends CancelledError on Ctrl-C; suppress the noise
    finally:
        print(f"\n{YLW}  ⏹  SupportIQ Backend shutting down …{RST}", flush=True)


app = FastAPI(
    title="ChatBot AI Backend",
    description="RAG-powered AI customer-support engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(embeddings.router, prefix="/embeddings", tags=["embeddings"])
app.include_router(telegram.router, prefix="/telegram", tags=["telegram"])
