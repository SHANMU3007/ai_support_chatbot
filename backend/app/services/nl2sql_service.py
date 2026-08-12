"""
NL2SQL Service – converts a natural-language question to SQL using Groq,
executes it against PostgreSQL, and returns structured results.

SQL responses are cached in Redis for 5 minutes so repeat questions
never burn additional Groq API quota.
"""
from typing import Any, Dict
import asyncio
import hashlib
import json
import re
import logging

import redis.asyncio as aioredis
from groq import AsyncGroq
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await _redis.ping()  # type: ignore[misc]
        except Exception:
            logger.warning("Redis unavailable – NL2SQL caching disabled")
            _redis = None
    return _redis


def _cache_key(question: str, user_id: str) -> str:
    digest = hashlib.sha256(f"{user_id}:{question.strip().lower()}".encode()).hexdigest()[:16]
    return f"nl2sql:{digest}"

_SCHEMA_HINT = """\
-- PostgreSQL schema (Prisma-managed, case-sensitive identifiers)

-- Enums
CREATE TYPE "Role"      AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
CREATE TYPE "DocType"   AS ENUM ('FAQ', 'PDF', 'URL', 'TEXT', 'DOCX');
CREATE TYPE "Plan"      AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- Tables
CREATE TABLE "User" (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    email       TEXT UNIQUE,
    plan        "Plan" DEFAULT 'FREE',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Chatbot" (
    id           TEXT PRIMARY KEY,
    "userId"     TEXT REFERENCES "User"(id),
    name         TEXT,
    "isActive"   BOOLEAN DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "ChatSession" (
    id           TEXT PRIMARY KEY,
    "chatbotId"  TEXT REFERENCES "Chatbot"(id),
    "visitorId"  TEXT,
    language     TEXT DEFAULT 'en',
    "createdAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Message" (
    id           TEXT PRIMARY KEY,
    "sessionId"  TEXT REFERENCES "ChatSession"(id),
    role         "Role",       -- values: 'USER' or 'ASSISTANT'
    content      TEXT,
    tokens       INT,
    confidence   FLOAT,
    "createdAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Document" (
    id           TEXT PRIMARY KEY,
    "chatbotId"  TEXT REFERENCES "Chatbot"(id),
    name         TEXT,
    type         "DocType",    -- values: 'FAQ','PDF','URL','TEXT','DOCX'
    status       "DocStatus",  -- values: 'PENDING','PROCESSING','DONE','FAILED'
    "chunkCount" INT DEFAULT 0,
    "createdAt"  TIMESTAMPTZ DEFAULT NOW()
);

-- Security rule: always filter to the supplied user_id via:
--   "User".id = :user_id
--   OR "Chatbot"."userId" = :user_id (then JOIN up/down as needed)
"""

_PROMPT = """You are a PostgreSQL expert. Using the schema below, write a single valid \
PostgreSQL SELECT query that answers the user's question.

{schema}

Question : {question}
user_id  : {user_id}

Rules:
1. SELECT only – no INSERT / UPDATE / DELETE / DDL.
2. Always restrict to the given user_id through the ownership chain shown in the schema.
   Embed the user_id as a single-quoted string literal directly in the SQL (e.g. WHERE "userId" = 'abc123').
   Do NOT use bind parameters like $1, %s, :user_id, or ? placeholders.
3. Always assign a short alias to every table (e.g. "User" u, "Chatbot" cb) and
   qualify EVERY column reference with its alias (e.g. u.id, cb."userId", m."createdAt").
   Never reference a column without a table alias prefix.
4. Use quoted identifiers exactly as shown (e.g. "ChatSession", "createdAt").
5. Enum literals must be UPPERCASE exactly as defined (e.g. 'USER', 'ASSISTANT', 'DONE').
6. Group OR conditions in parentheses when mixed with AND.
7. Output ONLY the raw SQL query – no explanation, no markdown, no code fences."""


class NL2SQLService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def query(
        self, question: str, user_id: str, db: AsyncSession
    ) -> Dict[str, Any]:
        # 0. Cache check
        cache_key = _cache_key(question, user_id)
        redis = await _get_redis()
        if redis:
            try:
                cached = await redis.get(cache_key)
                if cached:
                    logger.info("NL2SQL cache hit for key %s", cache_key)
                    return json.loads(cached)
            except Exception:
                pass  # Redis hiccup – just proceed without cache

        # 1. Generate SQL via Groq
        prompt = _PROMPT.format(
            schema=_SCHEMA_HINT, question=question, user_id=user_id
        )
        response = None
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await self.client.chat.completions.create(
                    model=settings.GROQ_NL2SQL_MODEL,
                    max_tokens=512,
                    messages=[{"role": "user", "content": prompt}],
                )
                break  # success
            except Exception as exc:
                last_error = exc
                err_msg = str(exc)
                is_rate_limit = "429" in err_msg or "rate" in err_msg.lower()
                if is_rate_limit and attempt < 2:
                    wait = 5 * (attempt + 1)  # 5 s, 10 s
                    logger.warning("Groq rate limit on attempt %d, retrying in %ds", attempt + 1, wait)
                    await asyncio.sleep(wait)
                    continue
                # Non-rate-limit error or exhausted retries
                if is_rate_limit:
                    return {
                        "error": "AI service rate limit reached – please wait a moment and try again.",
                        "sql": "", "columns": [], "rows": [], "rowCount": 0,
                    }
                logger.exception("Groq call failed")
                return {
                    "error": f"AI service error: {err_msg}",
                    "sql": "", "columns": [], "rows": [], "rowCount": 0,
                }

        if response is None:
            return {"error": str(last_error), "sql": "", "columns": [], "rows": [], "rowCount": 0}

        raw_sql = response.choices[0].message.content or ""
        raw_sql = raw_sql.strip()

        # Strip markdown code fences if present
        sql = re.sub(r"^```[a-z]*\n?", "", raw_sql, flags=re.IGNORECASE)
        sql = re.sub(r"\n?```$", "", sql).strip()

        # Safety: replace any bind-parameter placeholders the model may have
        # emitted ($1, $2, %s, :user_id, ?) with the literal user_id string.
        safe_id = user_id.replace("'", "''")  # escape single quotes
        sql = re.sub(r"\$\d+", f"'{safe_id}'", sql)
        sql = re.sub(r":user_id\b", f"'{safe_id}'", sql, flags=re.IGNORECASE)
        sql = re.sub(r"%s", f"'{safe_id}'", sql)

        # Safety check – allow SELECT only
        if not sql.lower().lstrip().startswith("select"):
            return {"error": "Only SELECT queries are allowed.", "sql": sql, "columns": [], "rows": [], "rowCount": 0}

        # 2. Execute SQL
        try:
            result = await db.execute(text(sql))
            keys = list(result.keys())
            rows = [dict(zip(keys, row)) for row in result.fetchall()]
            payload: Dict[str, Any] = {
                "sql": sql,
                "columns": keys,
                "rows": rows,
                "rowCount": len(rows),
            }
            # Cache successful result for 5 minutes
            if redis:
                try:
                    await redis.setex(cache_key, 300, json.dumps(payload, default=str))
                except Exception:
                    pass
            return payload
        except Exception as exc:
            logger.exception("NL2SQL execution error")
            return {"error": str(exc), "sql": sql, "columns": [], "rows": [], "rowCount": 0}
