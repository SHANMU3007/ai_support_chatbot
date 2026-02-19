#!/usr/bin/env python3
"""
scripts/seed-demo.py

Seeds the database with demo data independently of the Prisma seed.ts
(useful when running outside Docker or for testing).

Usage:
    python scripts/seed-demo.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import asyncpg  # type: ignore[import-untyped]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/chatbot_ai",
)

DEMO_USER_ID = "demo-user-id"
DEMO_CHATBOT_ID = "demo-chatbot-id"


async def seed():
    conn = await asyncpg.connect(DATABASE_URL)

    print("Seeding demo user …")
    await conn.execute(
        """
        INSERT INTO users (id, name, email, plan, "createdAt", "updatedAt")
        VALUES ($1, 'Demo User', 'demo@example.com', 'FREE', now(), now())
        ON CONFLICT (email) DO NOTHING
        """,
        DEMO_USER_ID,
    )

    print("Seeding demo chatbot …")
    await conn.execute(
        """
        INSERT INTO chatbots (id, "userId", name, description, personality,
                              "primaryColor", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, 'Demo Support Bot',
                'A demo customer support chatbot', 'friendly and helpful',
                '#6366f1', true, now(), now())
        ON CONFLICT (id) DO NOTHING
        """,
        DEMO_CHATBOT_ID,
        DEMO_USER_ID,
    )

    print("Done! Demo credentials: demo@example.com")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
