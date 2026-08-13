from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

db_url = settings.DATABASE_URL

# asyncpg requires postgresql+asyncpg:// scheme
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove pgbouncer=true param — asyncpg doesn't understand it (it's for Prisma only)
# Supabase pooler port 6543 handles SSL automatically; no connect_args needed.
if "pgbouncer=true" in db_url:
    db_url = db_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=3,        # Railway free tier: keep small to avoid OOM
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,  # recycle connections every 30 min
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
