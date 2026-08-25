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
1. SELECT only – no INSERT / UPDATE / DELETE / DDL / CREATE / DROP.
2. Filter results using ownership chain:
   Join "Chatbot" and filter by cb."userId" = '{user_id}' when looking up workspace-owned chatbots, sessions, or messages.
3. For date/time filters:
   - "this week": use "createdAt" >= date_trunc('week', NOW())
   - "last 30 days" / "30 days": use "createdAt" >= NOW() - INTERVAL '30 days'
4. Always assign a short alias to every table (e.g. "User" u, "Chatbot" cb, "ChatSession" cs, "Message" m) and
   qualify EVERY column reference with its alias (e.g. u.id, cb."userId", cs."createdAt").
5. Use quoted identifiers exactly as shown in schema (e.g. "ChatSession", "createdAt", "Chatbot").
6. Output ONLY the raw SQL query starting with SELECT or WITH – no introductory text, no comments, no code fences."""


def _get_preset_sql(question: str, user_id: str) -> str | None:
    q = question.strip().lower().rstrip("?")
    safe_id = user_id.replace("'", "''")

    if "average messages per session" in q:
        return f"""SELECT COALESCE(ROUND(AVG(m_count)::numeric, 2), 0) AS "avg_messages_per_session"
FROM (
  SELECT cs.id, COUNT(m.id) AS m_count
  FROM "ChatSession" cs
  JOIN "Chatbot" cb ON cs."chatbotId" = cb.id
  LEFT JOIN "Message" m ON m."sessionId" = cs.id
  WHERE cb."userId" = '{safe_id}' OR '{safe_id}' IN (SELECT id FROM "User" WHERE role = 'ADMIN')
  GROUP BY cs.id
) sub"""

    if "how many chats did i get this week" in q:
        return f"""SELECT COUNT(cs.id) AS "total_chats_this_week"
FROM "ChatSession" cs
JOIN "Chatbot" cb ON cs."chatbotId" = cb.id
WHERE (cb."userId" = '{safe_id}' OR '{safe_id}' IN (SELECT id FROM "User" WHERE role = 'ADMIN'))
  AND cs."createdAt" >= date_trunc('week', NOW())"""

    if "which chatbot has the most conversations" in q:
        return f"""SELECT cb.name AS "chatbot_name", COUNT(cs.id) AS "total_conversations"
FROM "Chatbot" cb
LEFT JOIN "ChatSession" cs ON cs."chatbotId" = cb.id
WHERE cb."userId" = '{safe_id}' OR '{safe_id}' IN (SELECT id FROM "User" WHERE role = 'ADMIN')
GROUP BY cb.id, cb.name
ORDER BY total_conversations DESC
LIMIT 5"""

    if "stats for the last 30 days" in q or "last 30 days" in q:
        return f"""SELECT 
  COUNT(DISTINCT cs.id) AS "total_sessions_last_30_days",
  COUNT(m.id) AS "total_messages",
  COUNT(DISTINCT cb.id) AS "active_chatbots"
FROM "Chatbot" cb
LEFT JOIN "ChatSession" cs ON cs."chatbotId" = cb.id AND cs."createdAt" >= NOW() - INTERVAL '30 days'
LEFT JOIN "Message" m ON m."sessionId" = cs.id
WHERE cb."userId" = '{safe_id}' OR '{safe_id}' IN (SELECT id FROM "User" WHERE role = 'ADMIN')"""

    return None


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
                    parsed = json.loads(cached)
                    if isinstance(parsed, dict) and not parsed.get("error"):
                        logger.info("NL2SQL cache hit for key %s", cache_key)
                        return parsed
            except Exception:
                pass  # Redis hiccup – just proceed without cache

        # 1. Preset SQL Check
        preset_sql = _get_preset_sql(question, user_id)
        if preset_sql:
            sql = preset_sql
        else:
            # Generate SQL via Groq
            prompt = _PROMPT.format(
                schema=_SCHEMA_HINT, question=question, user_id=user_id
            )
            response = None
            last_error: Exception | None = None
            models_to_try = [
                settings.GROQ_NL2SQL_MODEL,
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
            ]
            for model_name in models_to_try:
                for attempt in range(2):
                    try:
                        response = await self.client.chat.completions.create(
                            model=model_name,
                            temperature=0.0,
                            max_tokens=512,
                            messages=[{"role": "user", "content": prompt}],
                        )
                        break
                    except Exception as exc:
                        last_error = exc
                        err_msg = str(exc)
                        if "404" in err_msg or "not found" in err_msg.lower():
                            logger.warning(f"Groq model {model_name} not found, trying fallback...")
                            break  # Try next model immediately
                        if "429" in err_msg or "rate" in err_msg.lower():
                            await asyncio.sleep(2)
                            continue
                        logger.warning(f"Groq error with {model_name}: {err_msg}")
                        break
                if response is not None:
                    break

            if response is None:
                return {"error": f"AI service error: {last_error}", "sql": "", "columns": [], "rows": [], "rowCount": 0}

            raw_sql = response.choices[0].message.content or ""
            
            # Strip markdown fences and leading/trailing whitespace
            cleaned = re.sub(r"^```[a-z]*\n?", "", raw_sql.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r"\n?```$", "", cleaned).strip()

            # Remove preamble comments/markdown text and extract SELECT or WITH statement
            match = re.search(r"\b(SELECT|WITH)\b[\s\S]*", cleaned, flags=re.IGNORECASE)
            if match:
                sql = match.group(0).strip()
                sql = re.sub(r"```.*$", "", sql, flags=re.DOTALL).strip()
                sql = sql.rstrip(";")
            else:
                sql = cleaned

            # Safety: replace any bind-parameter placeholders
            safe_id = user_id.replace("'", "''")
            sql = re.sub(r"\$\d+", f"'{safe_id}'", sql)
            sql = re.sub(r":user_id\b", f"'{safe_id}'", sql, flags=re.IGNORECASE)
            sql = re.sub(r"%s", f"'{safe_id}'", sql)

            # Table hallucination auto-corrections
            sql = re.sub(r'\b"Chat"\b', '"ChatSession"', sql)
            sql = re.sub(r'\b"Sessions"\b', '"ChatSession"', sql)
            sql = re.sub(r'\b"Messages"\b', '"Message"', sql)
            sql = re.sub(r'\b"Chatbots"\b', '"Chatbot"', sql)
            sql = re.sub(r'\b"Users"\b', '"User"', sql)

        # Security check – allow SELECT / WITH queries only, disallow destructive DDL/DML
        disallowed_pattern = r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|EXEC|GRANT|REVOKE)\b"
        if not re.match(r"^(select|with)\b", sql.strip(), flags=re.IGNORECASE) or re.search(disallowed_pattern, sql, flags=re.IGNORECASE):
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
