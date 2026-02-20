"""
NL2SQL Service – converts a natural-language question to SQL using Groq,
executes it against PostgreSQL, and returns structured results.
"""
from typing import Any, Dict
import re
import logging

from groq import AsyncGroq
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

_SCHEMA_HINT = """
Tables available:
  users(id, name, email, plan, created_at)
  chatbots(id, user_id, name, is_active, created_at)
  chat_sessions(id, chatbot_id, visitor_id, language, started_at)
  messages(id, session_id, role, content, tokens, confidence, created_at)
  documents(id, chatbot_id, name, type, status, chunk_count, created_at)

Rules:
- Only SELECT statements are allowed.
- Always filter by the provided user_id for security.
- Return only the SQL query, nothing else.
"""

_PROMPT = """You are a SQL expert. Given the schema below and a question, write a valid PostgreSQL SELECT query.

Schema:
{schema}

User's question: {question}
User's user_id (use in WHERE clause for ownership): {user_id}

Respond with ONLY the SQL query, no explanation, no markdown."""


class NL2SQLService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def query(
        self, question: str, user_id: str, db: AsyncSession
    ) -> Dict[str, Any]:
        # 1. Generate SQL via Groq
        prompt = _PROMPT.format(
            schema=_SCHEMA_HINT, question=question, user_id=user_id
        )
        response = await self.client.chat.completions.create(
            model=settings.GROQ_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_sql = response.choices[0].message.content or ""
        raw_sql = raw_sql.strip()

        # Strip markdown code fences if present
        sql = re.sub(r"^```[a-z]*\n?", "", raw_sql, flags=re.IGNORECASE)
        sql = re.sub(r"\n?```$", "", sql).strip()

        # Safety check – allow SELECT only
        if not sql.lower().lstrip().startswith("select"):
            return {"error": "Only SELECT queries are allowed.", "sql": sql, "rows": []}

        # 2. Execute SQL
        try:
            result = await db.execute(text(sql))
            rows = [dict(zip(result.keys(), row)) for row in result.fetchall()]
            return {"sql": sql, "rows": rows, "count": len(rows)}
        except Exception as exc:
            logger.exception("NL2SQL execution error")
            return {"error": str(exc), "sql": sql, "rows": []}
