from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import re

from app.config import settings

db_url = settings.DATABASE_URL

# asyncpg requires postgresql+asyncpg:// scheme
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove pgbouncer=true param — asyncpg doesn't understand it (it's for Prisma only)
# Use regex to handle any parameter ordering (e.g., ?sslmode=require&pgbouncer=true)
if "pgbouncer=true" in db_url:
    db_url = re.sub(r"[?&]pgbouncer=true", "", db_url)
    # Clean up leftover '&' at start of query string (e.g., ?&sslmode=...)
    db_url = db_url.replace("?&", "?")

# Disable SQLAlchemy's statement cache to prevent InvalidSQLStatementNameError with PgBouncer
if "?" in db_url:
    db_url += "&prepared_statement_cache_size=0"
else:
    db_url += "?prepared_statement_cache_size=0"

import uuid

# Always disable prepared statement cache when using Supabase/PgBouncer
# to prevent "prepared statement does not exist" and duplicate statement errors in transaction mode.
engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=3,        # Railway free tier: keep small to avoid OOM
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,  # recycle connections every 30 min
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_stmt_{uuid.uuid4().hex}__",
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create tables if they don't exist (backend-owned tables only)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
